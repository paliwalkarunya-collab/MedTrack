from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.medicine import MedicineCreate, MedicineUpdate, MedicineResponse
from app.services.medicine_service import MedicineService
from app.tenancy.dependencies import require_tenant_from_header

router = APIRouter(tags=["Medicines"], dependencies=[Depends(require_tenant_from_header)])

@router.post("/", response_model=MedicineResponse, status_code=201)
def create_medicine(medicine_in: MedicineCreate, db: Session = Depends(get_db)):
    return MedicineService.create_medicine(db, medicine_in)

@router.get("/", response_model=List[MedicineResponse])
def get_medicines(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return MedicineService.get_medicines(db, skip=skip, limit=limit)

@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(medicine_id: UUID, db: Session = Depends(get_db)):
    return MedicineService.get_medicine(db, medicine_id)

@router.patch("/{medicine_id}", response_model=MedicineResponse)
def update_medicine(medicine_id: UUID, medicine_in: MedicineUpdate, db: Session = Depends(get_db)):
    return MedicineService.update_medicine(db, medicine_id, medicine_in)

@router.delete("/{medicine_id}", response_model=MedicineResponse)
def delete_medicine(medicine_id: UUID, db: Session = Depends(get_db)):
    return MedicineService.delete_medicine(db, medicine_id)
