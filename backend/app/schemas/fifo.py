from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import List

class FIFOAllocationRequest(BaseModel):
    medicine_id: UUID
    quantity: int = Field(..., gt=0)
    
    model_config = ConfigDict(extra='forbid')

class FIFOAllocationItem(BaseModel):
    batch_id: UUID
    quantity: int

class FIFOAllocationResponse(BaseModel):
    medicine_id: UUID
    requested_quantity: int
    allocated_quantity: int
    allocations: List[FIFOAllocationItem]
    
    model_config = ConfigDict(from_attributes=True)
