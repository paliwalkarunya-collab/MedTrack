from sqlalchemy import Column, String, Boolean, DateTime, Integer, UniqueConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.sql import func
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin
import uuid


class PharmacySettings(TenantModelMixin, Base):
    __tablename__ = 'pharmacy_settings'

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    # Invoice configuration
    invoice_prefix = Column(String, default='INV', nullable=False)
    invoice_footer = Column(String, nullable=True)
    show_gstin = Column(Boolean, default=True, nullable=False)
    show_drug_license = Column(Boolean, default=True, nullable=False)

    # Regional preferences
    default_currency = Column(String, default='INR', nullable=False)
    timezone = Column(String, default='Asia/Kolkata', nullable=False)
    date_format = Column(String, default='DD-MM-YYYY', nullable=False)

    # Inventory preferences
    low_stock_threshold = Column(Integer, default=10, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint('pharmacy_id', name='uq_pharmacy_settings_pharmacy_id'),
    )
