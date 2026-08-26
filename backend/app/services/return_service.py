import datetime
import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.models.return_model import Return
from app.models.return_item import ReturnItem
from app.models.return_allocation import ReturnAllocation
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.inventory_batch import InventoryBatch
from app.models.stock_allocation import StockAllocation
from app.models.medicine import Medicine
from app.models.customer import Customer
from app.schemas.return_schema import ReturnCreate, ReturnItemCreate
from app.tenancy.tenant_context import get_current_pharmacy_id


ZERO = Decimal("0.00")


class ReturnService:
    """Tenant-scoped return/refund service. Restores stock to original batches via StockAllocation."""

    def __init__(self, db: Session):
        self.db = db
        self.pharmacy_id = get_current_pharmacy_id()

    def _return_number(self) -> str:
        """Generate a pharmacy-scoped return number."""
        return f"RET-{uuid.uuid4().hex[:8].upper()}"

    def _invoice(self, invoice_id: uuid.UUID) -> Invoice:
        """Get and validate invoice belongs to current pharmacy and is COMPLETED."""
        invoice = self.db.scalars(
            select(Invoice)
            .where(Invoice.id == invoice_id)
            .with_for_update()
        ).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status != "COMPLETED":
            raise HTTPException(status_code=400, detail="Only COMPLETED invoices can be returned")
        return invoice

    def _invoice_item(self, invoice_item_id: uuid.UUID, invoice_id: uuid.UUID) -> InvoiceItem:
        """Get and validate invoice item belongs to the invoice."""
        item = self.db.scalars(
            select(InvoiceItem)
            .where(InvoiceItem.id == invoice_item_id, InvoiceItem.invoice_id == invoice_id)
            .with_for_update()
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Invoice item not found or does not belong to this invoice")
        return item

    def _customer(self, customer_id: uuid.UUID | None) -> Customer | None:
        if customer_id is None:
            return None
        customer = self.db.scalars(select(Customer).where(Customer.id == customer_id)).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    def _calculate_already_returned(self, invoice_item_id: uuid.UUID) -> int:
        """Calculate already returned quantity for an invoice item from COMPLETED returns."""
        result = self.db.scalars(
            select(func.coalesce(func.sum(ReturnItem.quantity), 0))
            .join(Return, Return.id == ReturnItem.return_id)
            .where(ReturnItem.invoice_item_id == invoice_item_id)
            .where(Return.status == "COMPLETED")
        ).first()
        return result or 0

    def _get_original_allocations(self, invoice_item_id: uuid.UUID) -> list[StockAllocation]:
        """Get original stock allocations for an invoice item, ordered for FIFO restoration."""
        return list(self.db.scalars(
            select(StockAllocation)
            .where(StockAllocation.invoice_id == self.db.scalars(
                select(InvoiceItem.invoice_id).where(InvoiceItem.id == invoice_item_id)
            ).first())
            .where(StockAllocation.medicine_id == self.db.scalars(
                select(InvoiceItem.medicine_id).where(InvoiceItem.id == invoice_item_id)
            ).first())
            .order_by(StockAllocation.created_at.asc())
        ).all())

    def _calculate_refund_for_item(self, invoice_item: InvoiceItem, return_qty: int) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        """
        Calculate refund amounts based on original invoice item values.
        Returns: (unit_refund_price, refund_discount, refund_tax, line_refund)
        """
        if invoice_item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Invalid invoice item quantity")

        # Proportional calculation based on original values
        ratio = Decimal(return_qty) / Decimal(invoice_item.quantity)
        unit_refund_price = invoice_item.unit_price
        refund_discount = (invoice_item.discount_amount * ratio).quantize(Decimal("0.01"))
        refund_tax = (invoice_item.tax_amount * ratio).quantize(Decimal("0.01"))
        gross_refund = (unit_refund_price * Decimal(return_qty) - refund_discount + refund_tax).quantize(Decimal("0.01"))

        return unit_refund_price, refund_discount, refund_tax, gross_refund

    def _restore_stock_and_create_allocations(
        self,
        return_item: ReturnItem,
        invoice_item: InvoiceItem,
        return_qty: int
    ) -> list[ReturnAllocation]:
        """
        Restore stock to original batches using original StockAllocation records.
        Creates ReturnAllocation records for traceability.
        """
        # Get original allocations for this invoice item
        original_allocations = self.db.scalars(
            select(StockAllocation)
            .where(StockAllocation.invoice_id == invoice_item.invoice_id)
            .where(StockAllocation.medicine_id == invoice_item.medicine_id)
            .order_by(StockAllocation.created_at.asc())
            .with_for_update()
        ).all()

        if not original_allocations:
            raise HTTPException(status_code=400, detail="No original stock allocations found for this invoice item")

        remaining_to_restore = return_qty
        created_allocations = []

        for orig_alloc in original_allocations:
            if remaining_to_restore <= 0:
                break

            restore_qty = min(orig_alloc.quantity, remaining_to_restore)

            # Restore quantity to the original inventory batch
            batch = self.db.scalars(
                select(InventoryBatch)
                .where(InventoryBatch.id == orig_alloc.inventory_batch_id)
                .with_for_update()
            ).first()

            if not batch:
                raise HTTPException(status_code=400, detail=f"Original inventory batch {orig_alloc.inventory_batch_id} not found")

            batch.quantity += restore_qty

            # Create return allocation record for traceability
            return_alloc = ReturnAllocation(
                pharmacy_id=self.pharmacy_id,
                return_item_id=return_item.id,
                stock_allocation_id=orig_alloc.id,
                inventory_batch_id=orig_alloc.inventory_batch_id,
                quantity=restore_qty
            )
            self.db.add(return_alloc)
            created_allocations.append(return_alloc)

            remaining_to_restore -= restore_qty

        if remaining_to_restore > 0:
            raise HTTPException(status_code=400, detail="Unable to restore full quantity to original batches")

        return created_allocations

    def create_return(self, return_in: ReturnCreate) -> Return:
        """Create a DRAFT return with items."""
        invoice = self._invoice(return_in.invoice_id)
        self._customer(invoice.customer_id)

        # Validate each requested item and calculate returnable quantities
        for item_in in return_in.items:
            invoice_item = self._invoice_item(item_in.invoice_item_id, return_in.invoice_id)
            already_returned = self._calculate_already_returned(item_in.invoice_item_id)
            max_returnable = invoice_item.quantity - already_returned

            if item_in.quantity > max_returnable:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot return {item_in.quantity}. Only {max_returnable} remaining returnable for this item (sold: {invoice_item.quantity}, already returned: {already_returned})"
                )

        # Create return record
        return_obj = Return(
            pharmacy_id=self.pharmacy_id,
            return_number=self._return_number(),
            invoice_id=return_in.invoice_id,
            customer_id=invoice.customer_id,
            status="DRAFT",
            refund_amount=ZERO,
            reason=return_in.reason,
            notes=return_in.notes,
        )
        self.db.add(return_obj)
        self.db.flush()

        # Create return items
        for item_in in return_in.items:
            invoice_item = self._invoice_item(item_in.invoice_item_id, return_in.invoice_id)
            return_item = ReturnItem(
                pharmacy_id=self.pharmacy_id,
                return_id=return_obj.id,
                invoice_item_id=item_in.invoice_item_id,
                medicine_id=invoice_item.medicine_id,
                quantity=item_in.quantity,
                unit_refund_price=ZERO,  # Will be calculated on complete
                refund_discount_amount=ZERO,
                refund_tax_amount=ZERO,
                line_refund_amount=ZERO,
            )
            self.db.add(return_item)

        self.db.flush()
        return return_obj

    def complete_return(self, return_id: uuid.UUID) -> Return:
        """Complete a DRAFT return: validate, restore stock, calculate refund, commit atomically."""
        return_obj = self.db.scalars(
            select(Return)
            .where(Return.id == return_id)
            .with_for_update()
        ).first()
        if not return_obj:
            raise HTTPException(status_code=404, detail="Return not found")

        if return_obj.status != "DRAFT":
            raise HTTPException(status_code=400, detail="Only DRAFT returns can be completed")

        # Re-validate invoice
        invoice = self._invoice(return_obj.invoice_id)

        # Get return items (they were created with create_return or need to be created)
        return_items = list(return_obj.items)
        if not return_items:
            raise HTTPException(status_code=400, detail="Return has no items")

        total_refund = ZERO

        for return_item in return_items:
            invoice_item = self._invoice_item(return_item.invoice_item_id, return_obj.invoice_id)

            # Re-validate quantity hasn't changed since draft
            already_returned = self._calculate_already_returned(return_item.invoice_item_id)
            # Exclude this return item if it was already counted (it's DRAFT so not counted yet)
            max_returnable = invoice_item.quantity - already_returned

            if return_item.quantity > max_returnable:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot return {return_item.quantity}. Only {max_returnable} remaining returnable"
                )

            # Calculate refund based on original invoice item
            unit_price, discount, tax, line_total = self._calculate_refund_for_item(invoice_item, return_item.quantity)

            return_item.unit_refund_price = unit_price
            return_item.refund_discount_amount = discount
            return_item.refund_tax_amount = tax
            return_item.line_refund_amount = line_total

            # Restore stock to original batches and create allocations
            self._restore_stock_and_create_allocations(return_item, invoice_item, return_item.quantity)

            total_refund += line_total

        # Update return record
        return_obj.status = "COMPLETED"
        return_obj.refund_amount = total_refund

        self.db.commit()
        return self.get_return(return_id)

    def get_return(self, return_id: uuid.UUID) -> Return | None:
        return self.db.execute(
            select(Return)
            .where(Return.id == return_id)
            .options(
                joinedload(Return.items).joinedload(ReturnItem.medicine),
                joinedload(Return.items).joinedload(ReturnItem.allocations).joinedload(ReturnAllocation.inventory_batch),
                joinedload(Return.customer),
                joinedload(Return.invoice),
            )
        ).unique().scalar_one_or_none()

    def list_returns(
        self,
        skip: int = 0,
        limit: int = 100,
        return_number: str | None = None,
        invoice_id: uuid.UUID | None = None,
        status: str | None = None,
        date_from: datetime.date | None = None,
        date_to: datetime.date | None = None
    ) -> list[Return]:
        stmt = select(Return).order_by(Return.created_at.desc())

        if return_number:
            stmt = stmt.where(Return.return_number.ilike(f"%{return_number}%"))
        if invoice_id:
            stmt = stmt.where(Return.invoice_id == invoice_id)
        if status:
            stmt = stmt.where(Return.status == status.upper())
        if date_from:
            stmt = stmt.where(Return.created_at >= date_from)
        if date_to:
            stmt = stmt.where(Return.created_at <= date_to)

        return list(self.db.execute(
            stmt.options(
                joinedload(Return.customer),
                joinedload(Return.invoice),
            ).offset(skip).limit(limit)
        ).unique().scalars().all())

    def cancel_return(self, return_id: uuid.UUID) -> Return:
        """Cancel a DRAFT return. Does not restore stock for COMPLETED returns."""
        return_obj = self.db.scalars(
            select(Return)
            .where(Return.id == return_id)
            .with_for_update()
        ).first()
        if not return_obj:
            raise HTTPException(status_code=404, detail="Return not found")

        if return_obj.status != "DRAFT":
            raise HTTPException(status_code=400, detail="Only DRAFT returns can be cancelled")

        return_obj.status = "CANCELLED"
        self.db.commit()
        return self.get_return(return_id)

    def delete_return(self, return_id: uuid.UUID) -> Return:
        """Delete a DRAFT return (alias for cancel)."""
        return self.cancel_return(return_id)