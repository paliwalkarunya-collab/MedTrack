from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpiryBatchResponse(BaseModel):
    medicine_id: UUID
    medicine_name: str
    batch_id: UUID
    batch_number: str
    expiry_date: Optional[date]
    quantity: int
    expiry_status: str
    days_until_expiry: Optional[int]


class ExpiryListResponse(BaseModel):
    items: list[ExpiryBatchResponse]
    total: int
    skip: int
    limit: int


class ExpirySummaryResponse(BaseModel):
    """Counts are batches; quantities are whole inventory units."""
    expired_batch_count: int
    critical_batch_count: int
    expiring_soon_batch_count: int
    safe_batch_count: int
    expired_quantity: int
    critical_quantity: int
    expiring_soon_quantity: int
