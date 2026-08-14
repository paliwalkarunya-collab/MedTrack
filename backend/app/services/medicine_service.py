from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.medicine import Medicine
from app.schemas.medicine import MedicineCreate, MedicineUpdate
from app.services.category_service import CategoryService
from app.tenancy.tenant_context import get_current_pharmacy_id

class MedicineService:
    @staticmethod
    def _validate_category(db: Session, category_id: UUID | None):
        if category_id:
            # This automatically enforces tenant ownership because get_category
            # is protected by the ORM tenant isolation.
            # If the category belongs to another tenant, it returns 404 Not Found.
            CategoryService.get_category(db, category_id)

    @staticmethod
    def create_medicine(db: Session, medicine_in: MedicineCreate) -> Medicine:
        MedicineService._validate_category(db, medicine_in.category_id)
        pharmacy_id = get_current_pharmacy_id()
        try:
            db_medicine = Medicine(**medicine_in.model_dump(), pharmacy_id=pharmacy_id)
            db.add(db_medicine)
            db.commit()
            db.refresh(db_medicine)
            return db_medicine
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Medicine with this barcode already exists in this pharmacy.")

    @staticmethod
    def get_medicines(db: Session, skip: int = 0, limit: int = 100) -> List[Medicine]:
        return db.query(Medicine).filter(Medicine.is_active == True).offset(skip).limit(limit).all()

    @staticmethod
    def get_medicine(db: Session, medicine_id: UUID) -> Medicine:
        medicine = db.query(Medicine).filter(
            Medicine.id == medicine_id,
            Medicine.is_active == True
        ).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Medicine not found")
        return medicine

    @staticmethod
    def update_medicine(db: Session, medicine_id: UUID, medicine_in: MedicineUpdate) -> Medicine:
        db_medicine = MedicineService.get_medicine(db, medicine_id)
        
        # If category_id is being updated, validate it
        if medicine_in.category_id is not None:
            MedicineService._validate_category(db, medicine_in.category_id)
            
        update_data = medicine_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_medicine, field, value)
            
        try:
            db.commit()
            db.refresh(db_medicine)
            return db_medicine
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Medicine with this barcode already exists in this pharmacy.")

    @staticmethod
    def delete_medicine(db: Session, medicine_id: UUID) -> Medicine:
        db_medicine = MedicineService.get_medicine(db, medicine_id)
        db_medicine.is_active = False
        db.commit()
        db.refresh(db_medicine)
        return db_medicine
