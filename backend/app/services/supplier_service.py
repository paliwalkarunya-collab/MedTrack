import uuid
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.tenancy.tenant_context import get_current_pharmacy_id

class SupplierService:
    def __init__(self, db: Session):
        self.db = db
        self.pharmacy_id = get_current_pharmacy_id()

    def get_supplier(self, supplier_id: uuid.UUID) -> Optional[Supplier]:
        return self.db.execute(
            select(Supplier)
            .where(Supplier.id == supplier_id, Supplier.pharmacy_id == self.pharmacy_id)
        ).scalar_one_or_none()

    def get_suppliers(self, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[Supplier]:
        query = select(Supplier).where(Supplier.pharmacy_id == self.pharmacy_id)
        if not include_inactive:
            query = query.where(Supplier.is_active == True)
            
        query = query.offset(skip).limit(limit)
        return list(self.db.execute(query).scalars().all())

    def create_supplier(self, supplier_in: SupplierCreate) -> Supplier:
        supplier = Supplier(
            **supplier_in.model_dump(),
            pharmacy_id=self.pharmacy_id
        )
        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def update_supplier(self, supplier_id: uuid.UUID, supplier_in: SupplierUpdate) -> Supplier:
        supplier = self.get_supplier(supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
            
        update_data = supplier_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(supplier, field, value)
            
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def delete_supplier(self, supplier_id: uuid.UUID) -> Supplier:
        supplier = self.get_supplier(supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
            
        supplier.is_active = False
        self.db.commit()
        self.db.refresh(supplier)
        return supplier
