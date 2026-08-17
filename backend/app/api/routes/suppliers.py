from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.services.supplier_service import SupplierService
from app.api.deps import get_current_pharmacy, require_staff

router = APIRouter(dependencies=[Depends(require_staff), Depends(get_current_pharmacy)])

def get_supplier_service(db: Session = Depends(get_db)) -> SupplierService:
    return SupplierService(db)

@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate,
    service: SupplierService = Depends(get_supplier_service)
):
    return service.create_supplier(supplier_in)

@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    service: SupplierService = Depends(get_supplier_service)
):
    return service.get_suppliers(skip=skip, limit=limit, include_inactive=False)

@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: uuid.UUID,
    service: SupplierService = Depends(get_supplier_service)
):
    supplier = service.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: uuid.UUID,
    supplier_in: SupplierUpdate,
    service: SupplierService = Depends(get_supplier_service)
):
    return service.update_supplier(supplier_id, supplier_in)

@router.delete("/{supplier_id}", response_model=SupplierResponse)
def delete_supplier(
    supplier_id: uuid.UUID,
    service: SupplierService = Depends(get_supplier_service)
):
    return service.delete_supplier(supplier_id)
