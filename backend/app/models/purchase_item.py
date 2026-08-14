import uuid
import datetime
from sqlalchemy import Column, String, Integer, Date, Numeric, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin

class PurchaseItem(TenantModelMixin, Base):
    __tablename__ = 'purchase_items'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('purchases.id', ondelete='CASCADE'), nullable=False)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('medicines.id', ondelete='RESTRICT'), nullable=False)
    
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expiry_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    
    purchase_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    selling_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    mrp: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    
    gst_percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    discount_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    purchase = relationship("Purchase", back_populates="items")
    medicine = relationship("Medicine")
