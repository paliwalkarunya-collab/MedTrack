import uuid
import datetime
from sqlalchemy import Column, String, Integer, Date, Numeric, Boolean, UniqueConstraint, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin

class InventoryBatch(TenantModelMixin, Base):
    __tablename__ = 'inventory_batches'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('medicines.id', ondelete='CASCADE'), nullable=False)
    
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expiry_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    
    # Quantity represented as whole units
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    purchase_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    selling_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    mrp: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Note: relationships will be automatically scoped by with_loader_criteria
    medicine = relationship("Medicine", foreign_keys=[medicine_id])

    __table_args__ = (
        UniqueConstraint('pharmacy_id', 'medicine_id', 'batch_number', name='uq_pharmacy_medicine_batch'),
    )
