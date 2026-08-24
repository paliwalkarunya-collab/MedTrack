import uuid
import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, case

from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.stock_allocation import StockAllocation
from app.tenancy.tenant_context import get_current_pharmacy_id

class FIFOService:
    @staticmethod
    def allocate_stock(db: Session, medicine_id: uuid.UUID, quantity: int, invoice_id: uuid.UUID | None = None):
        pharmacy_id = get_current_pharmacy_id()
        if not pharmacy_id:
            from app.tenancy.tenant_context import TenantContextRequired
            raise TenantContextRequired("Tenant context is required for FIFO allocation.")
            
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

        # Check medicine exists and is active (tenant is filtered by Session implicitly)
        medicine = db.scalars(
            select(Medicine)
            .where(Medicine.id == medicine_id, Medicine.is_active == True)
        ).first()
        
        if not medicine:
            raise HTTPException(status_code=404, detail="Medicine not found or inactive.")

        today = datetime.date.today()

        # 1. Valid dated batches first (expiry_date >= today)
        # 2. NULL expiry batches AFTER valid dated batches
        # 3. Order: expiry_date ASC, created_at ASC, id ASC
        
        null_sort_order = case(
            (InventoryBatch.expiry_date.is_(None), 1),
            else_=0
        )
        
        stmt = (
            select(InventoryBatch)
            .where(
                InventoryBatch.medicine_id == medicine_id,
                InventoryBatch.quantity > 0,
                InventoryBatch.is_active == True,
                or_(
                    InventoryBatch.expiry_date.is_(None),
                    InventoryBatch.expiry_date >= today
                )
            )
            .order_by(
                null_sort_order.asc(),
                InventoryBatch.expiry_date.asc(),
                InventoryBatch.created_at.asc(),
                InventoryBatch.id.asc()
            )
            .with_for_update()
        )
        
        batches = db.scalars(stmt).all()
        
        total_available = sum(b.quantity for b in batches)
        if total_available < quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock. Requested {quantity}, but only {total_available} available in eligible batches."
            )
            
        remaining_to_allocate = quantity
        allocations = []
        
        for batch in batches:
            if remaining_to_allocate <= 0:
                break
                
            consume_qty = min(batch.quantity, remaining_to_allocate)
            
            batch.quantity -= consume_qty
            
            allocation = StockAllocation(
                pharmacy_id=pharmacy_id,
                medicine_id=medicine_id,
                inventory_batch_id=batch.id,
                invoice_id=invoice_id,
                quantity=consume_qty
            )
            db.add(allocation)
            
            allocations.append({
                "batch_id": batch.id,
                "quantity": consume_qty
            })
            
            remaining_to_allocate -= consume_qty
            
        if remaining_to_allocate > 0:
            raise HTTPException(status_code=500, detail="Failed to allocate requested quantity due to internal error.")
            
        db.flush()
        
        return {
            "medicine_id": medicine_id,
            "requested_quantity": quantity,
            "allocated_quantity": quantity,
            "allocations": allocations
        }
