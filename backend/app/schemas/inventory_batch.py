from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal

class InventoryBatchBase(BaseModel):
    medicine_id: UUID
    batch_number: str = Field(..., min_length=1, max_length=100)
    expiry_date: Optional[date] = None
    quantity: int = Field(default=0, ge=0)
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    mrp: Optional[Decimal] = Field(None, ge=0)
    is_active: bool = True

class InventoryBatchCreate(InventoryBatchBase):
    pass

class InventoryBatchUpdate(BaseModel):
    # medicine_id usually shouldn't change for a batch, but we allow it if needed, or we omit it.
    # To keep things flexible, we allow updating it.
    medicine_id: Optional[UUID] = None
    batch_number: Optional[str] = Field(None, min_length=1, max_length=100)
    expiry_date: Optional[date] = None
    quantity: Optional[int] = Field(None, ge=0)
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    mrp: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None

class InventoryBatchResponse(InventoryBatchBase):
    id: UUID
    pharmacy_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
