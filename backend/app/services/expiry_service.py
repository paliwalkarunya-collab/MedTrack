"""Read-only expiry calculations based on tenant-scoped inventory batches."""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine

CRITICAL_DAYS = 7
EXPIRING_SOON_DAYS = 90


class ExpiryService:
    @staticmethod
    def calculate_status(expiry_date: Optional[date], today: Optional[date] = None) -> tuple[str, Optional[int]]:
        """Return status and whole days remaining; a null date is SAFE/no-expiry."""
        if expiry_date is None:
            return "SAFE", None
        today = today or date.today()
        days = (expiry_date - today).days
        if days < 0:
            return "EXPIRED", days
        if days <= CRITICAL_DAYS:
            return "CRITICAL", days
        if days <= EXPIRING_SOON_DAYS:
            return "EXPIRING_SOON", days
        return "SAFE", days

    @staticmethod
    def _base_statement():
        return (
            select(InventoryBatch, Medicine.name)
            .join(Medicine, Medicine.id == InventoryBatch.medicine_id)
            .where(InventoryBatch.is_active.is_(True), Medicine.is_active.is_(True))
        )

    @classmethod
    def _records(
        cls, db: Session, medicine_id: Optional[UUID] = None, search: Optional[str] = None,
        from_date: Optional[date] = None, to_date: Optional[date] = None,
    ) -> list[tuple[InventoryBatch, str]]:
        stmt = cls._base_statement()
        if medicine_id:
            stmt = stmt.where(InventoryBatch.medicine_id == medicine_id)
        if search:
            stmt = stmt.where(Medicine.name.ilike(f"%{search.strip()}%"))
        if from_date:
            stmt = stmt.where(InventoryBatch.expiry_date >= from_date)
        if to_date:
            stmt = stmt.where(InventoryBatch.expiry_date <= to_date)
        return db.execute(stmt.order_by(InventoryBatch.expiry_date.asc().nullslast(), InventoryBatch.id)).all()

    @classmethod
    def list_batches(
        cls, db: Session, medicine_id: Optional[UUID] = None, search: Optional[str] = None,
        status: Optional[str] = None, from_date: Optional[date] = None, to_date: Optional[date] = None,
        skip: int = 0, limit: int = 100,
    ) -> tuple[list[dict], int]:
        requested_status = status.upper() if status else None
        records = cls._records(db, medicine_id, search, from_date, to_date)
        items = []
        for batch, medicine_name in records:
            expiry_status, days = cls.calculate_status(batch.expiry_date)
            if requested_status and expiry_status != requested_status:
                continue
            items.append(cls._serialize(batch, medicine_name, expiry_status, days))
        return items[skip:skip + limit], len(items)

    @staticmethod
    def _serialize(batch: InventoryBatch, medicine_name: str, status: str, days: Optional[int]) -> dict:
        return {
            "medicine_id": batch.medicine_id, "medicine_name": medicine_name,
            "batch_id": batch.id, "batch_number": batch.batch_number,
            "expiry_date": batch.expiry_date, "quantity": batch.quantity,
            "expiry_status": status, "days_until_expiry": days,
        }

    @classmethod
    def summary(cls, db: Session) -> dict:
        result = {key: 0 for key in (
            "expired_batch_count", "critical_batch_count", "expiring_soon_batch_count", "safe_batch_count",
            "expired_quantity", "critical_quantity", "expiring_soon_quantity",
        )}
        for batch, _ in cls._records(db):
            status, _ = cls.calculate_status(batch.expiry_date)
            prefix = status.lower()
            result[f"{prefix}_batch_count"] += 1
            quantity_key = f"{prefix}_quantity"
            if quantity_key in result:
                result[quantity_key] += batch.quantity
        return result
