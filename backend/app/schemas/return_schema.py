from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ReturnItemCreate(BaseModel):
    invoice_item_id: UUID
    quantity: int = Field(..., gt=0)


class ReturnCreate(BaseModel):
    invoice_id: UUID
    items: list[ReturnItemCreate] = Field(..., min_length=1)
    reason: str | None = None
    notes: str | None = None


class ReturnItemResponse(BaseModel):
    id: UUID
    return_id: UUID
    invoice_item_id: UUID
    medicine_id: UUID
    quantity: int
    unit_refund_price: Decimal
    refund_discount_amount: Decimal
    refund_tax_amount: Decimal
    line_refund_amount: Decimal
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ReturnAllocationResponse(BaseModel):
    id: UUID
    return_item_id: UUID
    stock_allocation_id: UUID
    inventory_batch_id: UUID
    quantity: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReturnItemDetail(ReturnItemResponse):
    medicine_name: str | None = None
    allocations: list[ReturnAllocationResponse] = []


class ReturnResponse(BaseModel):
    id: UUID
    pharmacy_id: UUID
    return_number: str
    invoice_id: UUID
    customer_id: UUID | None
    status: str
    refund_amount: Decimal
    reason: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime | None = None
    items: list[ReturnItemDetail] = []

    model_config = ConfigDict(from_attributes=True)


class ReturnCompleteResponse(ReturnResponse):
    pass