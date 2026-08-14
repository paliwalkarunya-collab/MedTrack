from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.inventory_batch import InventoryBatch
from app.schemas.inventory_batch import InventoryBatchCreate, InventoryBatchUpdate
from app.services.medicine_service import MedicineService
from app.tenancy.tenant_context import get_current_pharmacy_id

class InventoryBatchService:
    @staticmethod
    def _validate_medicine(db: Session, medicine_id: UUID):
        # This automatically enforces tenant ownership because get_medicine
        # is protected by the ORM tenant isolation.
        MedicineService.get_medicine(db, medicine_id)

    @staticmethod
    def create_batch(db: Session, batch_in: InventoryBatchCreate) -> InventoryBatch:
        InventoryBatchService._validate_medicine(db, batch_in.medicine_id)
        pharmacy_id = get_current_pharmacy_id()
        try:
            db_batch = InventoryBatch(**batch_in.model_dump(), pharmacy_id=pharmacy_id)
            db.add(db_batch)
            db.commit()
            db.refresh(db_batch)
            return db_batch
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Batch with this number already exists for this medicine in this pharmacy.")

    @staticmethod
    def get_batches(db: Session, skip: int = 0, limit: int = 100) -> List[InventoryBatch]:
        return db.query(InventoryBatch).filter(InventoryBatch.is_active == True).offset(skip).limit(limit).all()

    @staticmethod
    def get_batch(db: Session, batch_id: UUID) -> InventoryBatch:
        batch = db.query(InventoryBatch).filter(
            InventoryBatch.id == batch_id,
            InventoryBatch.is_active == True
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Inventory batch not found")
        return batch

    @staticmethod
    def update_batch(db: Session, batch_id: UUID, batch_in: InventoryBatchUpdate) -> InventoryBatch:
        db_batch = InventoryBatchService.get_batch(db, batch_id)
        
        # If medicine_id is being updated, validate it
        if batch_in.medicine_id is not None:
            InventoryBatchService._validate_medicine(db, batch_in.medicine_id)
            
        update_data = batch_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_batch, field, value)
            
        try:
            db.commit()
            db.refresh(db_batch)
            return db_batch
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Batch with this number already exists for this medicine in this pharmacy.")

    @staticmethod
    def delete_batch(db: Session, batch_id: UUID) -> InventoryBatch:
        db_batch = InventoryBatchService.get_batch(db, batch_id)
        db_batch.is_active = False
        db.commit()
        db.refresh(db_batch)
        return db_batch
