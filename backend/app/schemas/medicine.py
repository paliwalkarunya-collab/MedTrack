from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class MedicineBase(BaseModel):
    category_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, max_length=255)
    brand_name: Optional[str] = Field(None, max_length=255)
    manufacturer: Optional[str] = Field(None, max_length=255)
    dosage_form: Optional[str] = Field(None, max_length=100)
    strength: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    barcode: Optional[str] = Field(None, max_length=100)
    hsn_code: Optional[str] = Field(None, max_length=50)
    gst_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: bool = True

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, max_length=255)
    brand_name: Optional[str] = Field(None, max_length=255)
    manufacturer: Optional[str] = Field(None, max_length=255)
    dosage_form: Optional[str] = Field(None, max_length=100)
    strength: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    barcode: Optional[str] = Field(None, max_length=100)
    hsn_code: Optional[str] = Field(None, max_length=50)
    gst_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

class MedicineResponse(MedicineBase):
    id: UUID
    pharmacy_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
