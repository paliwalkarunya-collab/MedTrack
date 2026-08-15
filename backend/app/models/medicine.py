import uuid
from sqlalchemy import Column, String, Boolean, UniqueConstraint, ForeignKey, Numeric, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin

class Medicine(TenantModelMixin, Base):
    __tablename__ = 'medicines'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('medicine_categories.id', ondelete='SET NULL'), nullable=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dosage_form: Mapped[str | None] = mapped_column(String(100), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    
    barcode: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gst_percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Note: relationships will be automatically scoped by with_loader_criteria
    category = relationship("MedicineCategory", foreign_keys=[category_id])

    __table_args__ = (
        UniqueConstraint('pharmacy_id', 'barcode', name='uq_pharmacy_medicine_barcode'),
    )
