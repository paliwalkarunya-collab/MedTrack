from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
import uuid

class SupplierBase(BaseModel):
    name: str = Field(..., max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=50)
    drug_license: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=50)
    drug_license: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: uuid.UUID
    pharmacy_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
