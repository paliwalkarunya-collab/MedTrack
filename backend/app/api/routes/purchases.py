from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate, PurchaseResponse
from app.services.purchase_service import PurchaseService
from app.api.deps import get_current_pharmacy, require_staff

router = APIRouter(dependencies=[Depends(require_staff), Depends(get_current_pharmacy)])

def get_purchase_service(db: Session = Depends(get_db)) -> PurchaseService:
    return PurchaseService(db)

@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase_in: PurchaseCreate,
    service: PurchaseService = Depends(get_purchase_service)
):
    return service.create_purchase(purchase_in)

@router.get("/", response_model=List[PurchaseResponse])
def list_purchases(
    skip: int = 0,
    limit: int = 100,
    service: PurchaseService = Depends(get_purchase_service)
):
    return service.get_purchases(skip=skip, limit=limit)

@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(
    purchase_id: uuid.UUID,
    service: PurchaseService = Depends(get_purchase_service)
):
    purchase = service.get_purchase(purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@router.patch("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: uuid.UUID,
    purchase_in: PurchaseUpdate,
    service: PurchaseService = Depends(get_purchase_service)
):
    return service.update_purchase(purchase_id, purchase_in)

@router.delete("/{purchase_id}", response_model=PurchaseResponse)
def delete_purchase(
    purchase_id: uuid.UUID,
    service: PurchaseService = Depends(get_purchase_service)
):
    return service.delete_purchase(purchase_id)

@router.post("/{purchase_id}/receive", response_model=PurchaseResponse)
def receive_purchase(
    purchase_id: uuid.UUID,
    service: PurchaseService = Depends(get_purchase_service)
):
    return service.receive_purchase(purchase_id)
