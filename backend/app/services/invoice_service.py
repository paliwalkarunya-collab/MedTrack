import datetime
import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.medicine import Medicine
from app.services.fifo_service import FIFOService
from app.schemas.customer import CustomerCreate
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.tenancy.tenant_context import get_current_pharmacy_id


ZERO = Decimal("0.00")


class InvoiceService:
    """Tenant-scoped billing. Item total is qty * unit_price - discount + tax."""

    def __init__(self, db: Session):
        self.db = db
        self.pharmacy_id = get_current_pharmacy_id()

    def _customer(self, customer_id: uuid.UUID | None, *, active: bool = True) -> Customer | None:
        if customer_id is None:
            return None
        customer = self.db.scalars(select(Customer).where(Customer.id == customer_id)).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        if active and not customer.is_active:
            raise HTTPException(status_code=400, detail="Cannot use an inactive customer")
        return customer

    def _medicine(self, medicine_id: uuid.UUID) -> Medicine:
        medicine = self.db.scalars(select(Medicine).where(Medicine.id == medicine_id)).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Medicine not found")
        if not medicine.is_active:
            raise HTTPException(status_code=400, detail="Cannot use an inactive medicine")
        return medicine

    def _invoice_number(self, requested: str | None) -> str:
        # UUID fallback avoids application-side races; DB scoped unique constraint is final guard.
        return requested or f"INV-{uuid.uuid4().hex[:12].upper()}"

    def _set_items(self, invoice: Invoice, item_inputs) -> None:
        subtotal = ZERO
        discount_total = ZERO
        tax_total = ZERO
        items: list[InvoiceItem] = []
        for item_in in item_inputs:
            self._medicine(item_in.medicine_id)
            quantity = item_in.quantity
            unit_price = Decimal(item_in.unit_price)
            discount = Decimal(item_in.discount_amount)
            tax = Decimal(item_in.tax_amount)
            gross = Decimal(quantity) * unit_price
            if discount > gross:
                raise HTTPException(status_code=400, detail="Item discount cannot exceed gross amount")
            line_before_tax = gross - discount
            line_total = line_before_tax + tax
            items.append(InvoiceItem(
                pharmacy_id=self.pharmacy_id,
                medicine_id=item_in.medicine_id,
                quantity=quantity,
                unit_price=unit_price,
                discount_amount=discount,
                tax_amount=tax,
                line_total=line_total,
            ))
            subtotal += line_before_tax
            discount_total += discount
            tax_total += tax
        invoice.items = items
        invoice.subtotal = subtotal
        invoice.discount_amount = discount_total
        invoice.tax_amount = tax_total
        invoice.total_amount = subtotal + tax_total

    def _detail(self, statement):
        return self.db.execute(statement.options(
            joinedload(Invoice.customer),
            joinedload(Invoice.items).joinedload(InvoiceItem.medicine),
        )).unique().scalar_one_or_none()

    def create_customer(self, customer_in: CustomerCreate) -> Customer:
        customer = Customer(pharmacy_id=self.pharmacy_id, **customer_in.model_dump())
        try:
            self.db.add(customer)
            self.db.commit()
            self.db.refresh(customer)
            return customer
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Customer phone already exists for this pharmacy")

    def create_invoice(self, invoice_in: InvoiceCreate) -> Invoice:
        self._customer(invoice_in.customer_id)
        invoice = Invoice(
            pharmacy_id=self.pharmacy_id,
            invoice_number=self._invoice_number(invoice_in.invoice_number),
            customer_id=invoice_in.customer_id,
            invoice_date=invoice_in.invoice_date or datetime.date.today(),
            notes=invoice_in.notes,
            status="DRAFT",
        )
        self._set_items(invoice, invoice_in.items)
        try:
            self.db.add(invoice)
            self.db.commit()
            return self.get_invoice(invoice.id)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=409, detail="Invoice number already exists for this pharmacy")

    def get_invoice(self, invoice_id: uuid.UUID) -> Invoice | None:
        return self._detail(select(Invoice).where(Invoice.id == invoice_id))

    def list_invoices(self, skip: int, limit: int, invoice_number: str | None, date_from, date_to,
                      customer_id: uuid.UUID | None, status: str | None) -> list[Invoice]:
        stmt = select(Invoice).order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())
        if invoice_number:
            stmt = stmt.where(Invoice.invoice_number.ilike(f"%{invoice_number}%"))
        if date_from:
            stmt = stmt.where(Invoice.invoice_date >= date_from)
        if date_to:
            stmt = stmt.where(Invoice.invoice_date <= date_to)
        if customer_id:
            stmt = stmt.where(Invoice.customer_id == customer_id)
        if status:
            stmt = stmt.where(Invoice.status == status.upper())
        return list(self.db.execute(stmt.options(
            joinedload(Invoice.customer),
            joinedload(Invoice.items).joinedload(InvoiceItem.medicine),
        ).offset(skip).limit(limit)).unique().scalars().all())

    def update_invoice(self, invoice_id: uuid.UUID, invoice_in: InvoiceUpdate) -> Invoice:
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status != "DRAFT":
            raise HTTPException(status_code=400, detail="Only DRAFT invoices can be updated")
        data = invoice_in.model_dump(exclude_unset=True)
        if "customer_id" in data:
            self._customer(data["customer_id"])
            invoice.customer_id = data.pop("customer_id")
        items = data.pop("items", None)
        for field, value in data.items():
            setattr(invoice, field, value)
        if items is not None:
            self._set_items(invoice, items)
        try:
            self.db.commit()
            return self.get_invoice(invoice.id)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Unable to update invoice")

    def cancel_invoice(self, invoice_id: uuid.UUID) -> Invoice:
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status == "COMPLETED":
            raise HTTPException(status_code=400, detail="Completed invoices cannot be cancelled or deleted")
        if invoice.status == "CANCELLED":
            raise HTTPException(status_code=400, detail="Invoice is already cancelled")
        invoice.status = "CANCELLED"
        self.db.commit()
        return self.get_invoice(invoice.id)

    def complete_invoice(self, invoice_id: uuid.UUID) -> Invoice:
        # PostgreSQL locks this invoice before its status is checked. FIFO locks batches.
        invoice = self.db.scalars(select(Invoice).where(Invoice.id == invoice_id).with_for_update()).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status != "DRAFT":
            raise HTTPException(status_code=400, detail="Only DRAFT invoices can be completed")
        try:
            self._customer(invoice.customer_id)
            for item in invoice.items:
                self._medicine(item.medicine_id)
                FIFOService.allocate_stock(self.db, item.medicine_id, item.quantity, invoice_id=invoice.id)
            invoice.status = "COMPLETED"
            self.db.commit()  # the only commit: allocations, quantities, and status commit together
            return self.get_invoice(invoice.id)
        except Exception as exc:
            self.db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=400, detail="Unable to complete invoice") from exc
