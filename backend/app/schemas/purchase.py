from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
import uuid
from app.schemas.purchase_item import PurchaseItemCreate, PurchaseItemResponse

class PurchaseBase(BaseModel):
    supplier_id: uuid.UUID
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[date] = None
    received_date: Optional[date] = None
    notes: Optional[str] = None

class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemCreate] = Field(..., min_length=1)

class PurchaseUpdate(BaseModel):
    supplier_id: Optional[uuid.UUID] = None
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[date] = None
    received_date: Optional[date] = None
    notes: Optional[str] = None
    # Cannot update items through this schema right now, typically we'd do a full replacement or specific item endpoints

class PurchaseResponse(PurchaseBase):
    id: uuid.UUID
    pharmacy_id: uuid.UUID
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    items: List[PurchaseItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
