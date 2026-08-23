from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class LowStockAlertResponse(BaseModel):
    medicine_id: UUID
    medicine_name: str
    current_quantity: int
    threshold: int
    shortage_amount: int
    severity: str


class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    medicine_id: UUID
    medicine_name: str
    batch_id: Optional[UUID] = None
    batch_number: Optional[str] = None
    quantity: Optional[int] = None
    expiry_date: Optional[date] = None
    message: str


class AlertSummaryResponse(BaseModel):
    total_alerts: int
    low_stock: int
    expired: int
    critical_expiry: int
    expiring_soon: int
