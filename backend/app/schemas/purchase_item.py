from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
import uuid

class PurchaseItemBase(BaseModel):
    medicine_id: uuid.UUID
    batch_number: str = Field(..., min_length=1, max_length=100)
    expiry_date: Optional[date] = None
    
    quantity: int = Field(..., gt=0)
    
    purchase_price: Decimal = Field(..., ge=0)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    mrp: Optional[Decimal] = Field(None, ge=0)
    
    gst_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)

class PurchaseItemCreate(PurchaseItemBase):
    pass

class PurchaseItemResponse(PurchaseItemBase):
    id: uuid.UUID
    pharmacy_id: uuid.UUID
    purchase_id: uuid.UUID
    line_total: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
