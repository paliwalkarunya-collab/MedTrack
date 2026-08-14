from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.inventory_batch import InventoryBatchCreate, InventoryBatchUpdate, InventoryBatchResponse
from app.services.inventory_batch_service import InventoryBatchService
from app.tenancy.dependencies import require_tenant_from_header

router = APIRouter(tags=["Inventory Batches"], dependencies=[Depends(require_tenant_from_header)])

@router.post("/", response_model=InventoryBatchResponse, status_code=201)
def create_batch(batch_in: InventoryBatchCreate, db: Session = Depends(get_db)):
    return InventoryBatchService.create_batch(db, batch_in)

@router.get("/", response_model=List[InventoryBatchResponse])
def get_batches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return InventoryBatchService.get_batches(db, skip=skip, limit=limit)

@router.get("/{batch_id}", response_model=InventoryBatchResponse)
def get_batch(batch_id: UUID, db: Session = Depends(get_db)):
    return InventoryBatchService.get_batch(db, batch_id)

@router.patch("/{batch_id}", response_model=InventoryBatchResponse)
def update_batch(batch_id: UUID, batch_in: InventoryBatchUpdate, db: Session = Depends(get_db)):
    return InventoryBatchService.update_batch(db, batch_id, batch_in)

@router.delete("/{batch_id}", response_model=InventoryBatchResponse)
def delete_batch(batch_id: UUID, db: Session = Depends(get_db)):
    return InventoryBatchService.delete_batch(db, batch_id)
