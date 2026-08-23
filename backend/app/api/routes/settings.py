from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.settings import SettingsUpdate, SettingsResponse
from app.services.settings_service import SettingsService
from app.api.deps import get_current_pharmacy, require_staff, require_admin

router = APIRouter(
    tags=["Settings"],
    dependencies=[Depends(require_staff), Depends(get_current_pharmacy)]
)


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Get settings for the current authenticated pharmacy."""
    return SettingsService.get_settings(db)


@router.patch("/", response_model=SettingsResponse, dependencies=[Depends(require_admin)])
def update_settings(settings_in: SettingsUpdate, db: Session = Depends(get_db)):
    """Update settings for the current authenticated pharmacy. Admin only."""
    return SettingsService.update_settings(db, settings_in)
