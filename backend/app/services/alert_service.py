"""Computed, read-only operational alerts for the current pharmacy."""

from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.services.expiry_service import ExpiryService
from app.services.settings_service import SettingsService


class AlertService:
    @staticmethod
    def low_stock(db: Session) -> list[dict]:
        threshold = SettingsService.get_settings(db).low_stock_threshold
        today = date.today()
        # Sellable stock is active medicine/batch stock with no expiry or expiry today/future.
        stmt = (
            select(Medicine.id, Medicine.name, func.coalesce(func.sum(InventoryBatch.quantity), 0))
            .outerjoin(InventoryBatch, (InventoryBatch.medicine_id == Medicine.id) &
                       (InventoryBatch.is_active.is_(True)) &
                       (or_(InventoryBatch.expiry_date.is_(None), InventoryBatch.expiry_date >= today)))
            .where(Medicine.is_active.is_(True))
            .group_by(Medicine.id, Medicine.name)
        )
        alerts = []
        for medicine_id, medicine_name, quantity in db.execute(stmt):
            current_quantity = int(quantity)
            if current_quantity < threshold:
                shortage = threshold - current_quantity
                alerts.append({
                    "medicine_id": medicine_id, "medicine_name": medicine_name,
                    "current_quantity": current_quantity, "threshold": threshold,
                    "shortage_amount": shortage,
                    "severity": "CRITICAL" if current_quantity == 0 else "LOW",
                })
        return alerts

    @classmethod
    def combined(cls, db: Session) -> list[dict]:
        alerts = []
        for item in cls.low_stock(db):
            alerts.append({
                "id": f"low-stock:{item['medicine_id']}", "alert_type": "LOW_STOCK",
                "severity": item["severity"], "medicine_id": item["medicine_id"],
                "medicine_name": item["medicine_name"], "quantity": item["current_quantity"],
                "message": f"{item['medicine_name']} has {item['current_quantity']} units; threshold is {item['threshold']}.",
            })
        expiry_items, _ = ExpiryService.list_batches(db, limit=10_000)
        mapping = {
            "EXPIRED": ("EXPIRED", "CRITICAL"),
            "CRITICAL": ("CRITICAL_EXPIRY", "CRITICAL"),
            "EXPIRING_SOON": ("EXPIRING_SOON", "LOW"),
        }
        for item in expiry_items:
            if item["expiry_status"] not in mapping:
                continue
            alert_type, severity = mapping[item["expiry_status"]]
            alerts.append({
                "id": f"{alert_type.lower()}:{item['batch_id']}", "alert_type": alert_type, "severity": severity,
                "medicine_id": item["medicine_id"], "medicine_name": item["medicine_name"],
                "batch_id": item["batch_id"], "batch_number": item["batch_number"],
                "quantity": item["quantity"], "expiry_date": item["expiry_date"],
                "message": f"Batch {item['batch_number']} for {item['medicine_name']} is {item['expiry_status'].lower().replace('_', ' ')}.",
            })
        return alerts

    @classmethod
    def summary(cls, db: Session) -> dict:
        alerts = cls.combined(db)
        counts = {"total_alerts": len(alerts), "low_stock": 0, "expired": 0, "critical_expiry": 0, "expiring_soon": 0}
        keys = {"LOW_STOCK": "low_stock", "EXPIRED": "expired", "CRITICAL_EXPIRY": "critical_expiry", "EXPIRING_SOON": "expiring_soon"}
        for alert in alerts:
            counts[keys[alert["alert_type"]]] += 1
        return counts
