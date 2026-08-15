from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import CategoryService
from app.tenancy.dependencies import require_tenant_from_header

router = APIRouter(tags=["Categories"], dependencies=[Depends(require_tenant_from_header)])

@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(category_in: CategoryCreate, db: Session = Depends(get_db)):
    return CategoryService.create_category(db, category_in)

@router.get("/", response_model=List[CategoryResponse])
def get_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return CategoryService.get_categories(db, skip=skip, limit=limit)

@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: UUID, db: Session = Depends(get_db)):
    return CategoryService.get_category(db, category_id)

@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: UUID, category_in: CategoryUpdate, db: Session = Depends(get_db)):
    return CategoryService.update_category(db, category_id, category_in)

@router.delete("/{category_id}", response_model=CategoryResponse)
def delete_category(category_id: UUID, db: Session = Depends(get_db)):
    return CategoryService.delete_category(db, category_id)
