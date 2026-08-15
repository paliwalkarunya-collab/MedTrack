import uuid
from typing import List, Optional
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem
from app.models.supplier import Supplier
from app.models.medicine import Medicine
from app.models.inventory_batch import InventoryBatch
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate
from app.tenancy.tenant_context import get_current_pharmacy_id

class PurchaseService:
    def __init__(self, db: Session):
        self.db = db
        self.pharmacy_id = get_current_pharmacy_id()

    def _validate_supplier(self, supplier_id: uuid.UUID) -> Supplier:
        supplier = self.db.execute(
            select(Supplier).where(
                Supplier.id == supplier_id,
                Supplier.pharmacy_id == self.pharmacy_id
            )
        ).scalar_one_or_none()
        
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        if not supplier.is_active:
            raise HTTPException(status_code=400, detail="Cannot use an inactive supplier")
            
        return supplier
        
    def _validate_medicine(self, medicine_id: uuid.UUID) -> Medicine:
        medicine = self.db.execute(
            select(Medicine).where(
                Medicine.id == medicine_id,
                Medicine.pharmacy_id == self.pharmacy_id
            )
        ).scalar_one_or_none()
        
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine {medicine_id} not found")
        if not medicine.is_active:
            raise HTTPException(status_code=400, detail=f"Cannot use inactive medicine {medicine_id}")
            
        return medicine

    def create_purchase(self, purchase_in: PurchaseCreate) -> Purchase:
        self._validate_supplier(purchase_in.supplier_id)
        
        purchase = Purchase(
            pharmacy_id=self.pharmacy_id,
            supplier_id=purchase_in.supplier_id,
            invoice_number=purchase_in.invoice_number,
            invoice_date=purchase_in.invoice_date,
            received_date=purchase_in.received_date,
            notes=purchase_in.notes,
            status="DRAFT"
        )
        
        subtotal = Decimal('0.0')
        tax_amount = Decimal('0.0')
        total_discount = Decimal('0.0')
        
        for item_in in purchase_in.items:
            self._validate_medicine(item_in.medicine_id)
            
            qty = Decimal(item_in.quantity)
            price = Decimal(item_in.purchase_price)
            discount = Decimal(item_in.discount_amount or 0)
            gst_pct = Decimal(item_in.gst_percentage or 0)
            
            line_gross = qty * price
            line_total = line_gross - discount
            
            if line_total < 0:
                raise HTTPException(status_code=400, detail="Line total cannot be negative after discount")
                
            item_tax = (line_total * gst_pct) / Decimal('100.0')
            
            subtotal += line_total
            tax_amount += item_tax
            total_discount += discount
            
            item = PurchaseItem(
                pharmacy_id=self.pharmacy_id,
                medicine_id=item_in.medicine_id,
                batch_number=item_in.batch_number,
                expiry_date=item_in.expiry_date,
                quantity=item_in.quantity,
                purchase_price=item_in.purchase_price,
                selling_price=item_in.selling_price,
                mrp=item_in.mrp,
                gst_percentage=item_in.gst_percentage,
                discount_amount=item_in.discount_amount,
                line_total=line_total
            )
            purchase.items.append(item)
            
        purchase.subtotal = subtotal
        purchase.tax_amount = tax_amount
        purchase.discount_amount = total_discount
        purchase.total_amount = subtotal + tax_amount
        
        try:
            self.db.add(purchase)
            self.db.commit()
            self.db.refresh(purchase)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error, possibly duplicate invoice number")
            
        return purchase

    def get_purchase(self, purchase_id: uuid.UUID) -> Optional[Purchase]:
        return self.db.execute(
            select(Purchase)
            .options(joinedload(Purchase.items))
            .where(Purchase.id == purchase_id, Purchase.pharmacy_id == self.pharmacy_id)
        ).unique().scalar_one_or_none()

    def get_purchases(self, skip: int = 0, limit: int = 100) -> List[Purchase]:
        query = (
            select(Purchase)
            .where(Purchase.pharmacy_id == self.pharmacy_id)
            .order_by(Purchase.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(query).scalars().all())

    def update_purchase(self, purchase_id: uuid.UUID, purchase_in: PurchaseUpdate) -> Purchase:
        purchase = self.get_purchase(purchase_id)
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")
            
        if purchase.status != "DRAFT":
            raise HTTPException(status_code=400, detail="Only DRAFT purchases can be updated")
            
        if purchase_in.supplier_id:
            self._validate_supplier(purchase_in.supplier_id)
            
        update_data = purchase_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(purchase, field, value)
            
        try:
            self.db.commit()
            self.db.refresh(purchase)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Integrity error updating purchase")
            
        return purchase

    def delete_purchase(self, purchase_id: uuid.UUID) -> Purchase:
        purchase = self.get_purchase(purchase_id)
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")
            
        if purchase.status == "RECEIVED":
            raise HTTPException(status_code=400, detail="Cannot delete a RECEIVED purchase")
            
        if purchase.status == "DRAFT":
            purchase.status = "CANCELLED"
            self.db.commit()
            self.db.refresh(purchase)
            
        return purchase

    def receive_purchase(self, purchase_id: uuid.UUID) -> Purchase:
        purchase = self.get_purchase(purchase_id)
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")
            
        if purchase.status == "RECEIVED":
            raise HTTPException(status_code=400, detail="Purchase is already received")
            
        if purchase.status == "CANCELLED":
            raise HTTPException(status_code=400, detail="Cannot receive a CANCELLED purchase")
            
        # Due to SQLAlchemy session architecture, we can do this atomically
        # If any step fails and raises an exception, FastAPI will rollback the transaction
        # (or we can explicitly do it here just in case)
        
        try:
            for item in purchase.items:
                # 1. Validate medicine belongs to pharmacy and is active (active check for receiving?)
                # Actually, requirement: "A new purchase cannot be received for an inactive medicine."
                # We should check it now as well.
                self._validate_medicine(item.medicine_id)
                
                # 2. Find existing InventoryBatch
                batch = self.db.execute(
                    select(InventoryBatch).where(
                        InventoryBatch.pharmacy_id == self.pharmacy_id,
                        InventoryBatch.medicine_id == item.medicine_id,
                        InventoryBatch.batch_number == item.batch_number
                    )
                ).scalar_one_or_none()
                
                if batch:
                    # Update quantity
                    batch.quantity += item.quantity
                else:
                    # Create new batch
                    batch = InventoryBatch(
                        pharmacy_id=self.pharmacy_id,
                        medicine_id=item.medicine_id,
                        batch_number=item.batch_number,
                        expiry_date=item.expiry_date,
                        quantity=item.quantity,
                        purchase_price=item.purchase_price,
                        selling_price=item.selling_price,
                        mrp=item.mrp,
                        is_active=True
                    )
                    self.db.add(batch)
            
            # Transition state
            purchase.status = "RECEIVED"
            
            # The commit handles all items at once.
            self.db.commit()
            self.db.refresh(purchase)
            
        except Exception as e:
            self.db.rollback()
            # Re-raise if it's already an HTTPException, otherwise wrap
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail=f"Failed to receive purchase: {str(e)}")
            
        return purchase
