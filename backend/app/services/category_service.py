from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.medicine_category import MedicineCategory
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.tenancy.tenant_context import get_current_pharmacy_id

class CategoryService:
    @staticmethod
    def create_category(db: Session, category_in: CategoryCreate) -> MedicineCategory:
        pharmacy_id = get_current_pharmacy_id()
        try:
            db_category = MedicineCategory(**category_in.model_dump(), pharmacy_id=pharmacy_id)
            db.add(db_category)
            db.commit()
            db.refresh(db_category)
            return db_category
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Category with this name already exists in this pharmacy.")

    @staticmethod
    def get_categories(db: Session, skip: int = 0, limit: int = 100) -> List[MedicineCategory]:
        return db.query(MedicineCategory).filter(MedicineCategory.is_active == True).offset(skip).limit(limit).all()

    @staticmethod
    def get_category(db: Session, category_id: UUID) -> MedicineCategory:
        category = db.query(MedicineCategory).filter(
            MedicineCategory.id == category_id,
            MedicineCategory.is_active == True
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category

    @staticmethod
    def update_category(db: Session, category_id: UUID, category_in: CategoryUpdate) -> MedicineCategory:
        db_category = CategoryService.get_category(db, category_id)
        update_data = category_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_category, field, value)
            
        try:
            db.commit()
            db.refresh(db_category)
            return db_category
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Category with this name already exists in this pharmacy.")

    @staticmethod
    def delete_category(db: Session, category_id: UUID) -> MedicineCategory:
        db_category = CategoryService.get_category(db, category_id)
        db_category.is_active = False
        db.commit()
        db.refresh(db_category)
        return db_category
