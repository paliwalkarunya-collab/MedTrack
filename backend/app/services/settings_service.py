from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.pharmacy_settings import PharmacySettings
from app.schemas.settings import SettingsUpdate
from app.tenancy.tenant_context import get_current_pharmacy_id


class SettingsService:
    @staticmethod
    def get_settings(db: Session) -> PharmacySettings:
        """Get settings for the current pharmacy. Creates defaults if missing."""
        pharmacy_id = get_current_pharmacy_id()
        if not pharmacy_id:
            raise HTTPException(
                status_code=400,
                detail="No pharmacy context set. Please select a pharmacy first."
            )
        
        settings = db.query(PharmacySettings).filter(
            PharmacySettings.pharmacy_id == pharmacy_id
        ).first()
        
        if not settings:
            # Create default settings for this pharmacy
            settings = SettingsService._create_default_settings(db, pharmacy_id)
        
        return settings

    @staticmethod
    def _create_default_settings(db: Session, pharmacy_id) -> PharmacySettings:
        """Create default settings for a pharmacy."""
        settings = PharmacySettings(
            pharmacy_id=pharmacy_id,
            invoice_prefix='INV',
            invoice_footer=None,
            show_gstin=True,
            show_drug_license=True,
            default_currency='INR',
            timezone='Asia/Kolkata',
            date_format='DD-MM-YYYY',
            low_stock_threshold=10,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
        return settings

    @staticmethod
    def update_settings(db: Session, settings_in: SettingsUpdate) -> PharmacySettings:
        """Update settings for the current pharmacy."""
        pharmacy_id = get_current_pharmacy_id()
        if not pharmacy_id:
            raise HTTPException(
                status_code=400,
                detail="No pharmacy context set. Please select a pharmacy first."
            )
        
        settings = db.query(PharmacySettings).filter(
            PharmacySettings.pharmacy_id == pharmacy_id
        ).first()
        
        if not settings:
            # Create settings with defaults, then apply updates
            settings = SettingsService._create_default_settings(db, pharmacy_id)
        
        # Apply updates - only update fields that are provided
        update_data = settings_in.model_dump(exclude_unset=True)
        
        # Prevent pharmacy_id from being changed via request body
        update_data.pop('pharmacy_id', None)
        
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        db.commit()
        db.refresh(settings)
        return settings