import uuid
import datetime
from sqlalchemy import Column, String, Date, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin

class Purchase(TenantModelMixin, Base):
    __tablename__ = 'purchases'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('suppliers.id', ondelete='RESTRICT'), nullable=False)
    
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invoice_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    received_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Status: DRAFT, RECEIVED, CANCELLED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default='DRAFT')
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")

    __table_args__ = (
        # Prevent accidental duplicate invoices from the same supplier within the same pharmacy
        UniqueConstraint('pharmacy_id', 'supplier_id', 'invoice_number', name='uq_pharmacy_supplier_invoice'),
    )
