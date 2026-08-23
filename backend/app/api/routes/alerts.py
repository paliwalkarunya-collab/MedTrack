from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_pharmacy, require_staff
from app.db.session import get_db
from app.schemas.alerts import AlertResponse, AlertSummaryResponse, LowStockAlertResponse
from app.services.alert_service import AlertService

router = APIRouter(tags=["Alerts"], dependencies=[Depends(require_staff), Depends(get_current_pharmacy)])


@router.get("/", response_model=list[AlertResponse])
def alerts(db: Session = Depends(get_db)):
    return AlertService.combined(db)


@router.get("/summary", response_model=AlertSummaryResponse)
def alert_summary(db: Session = Depends(get_db)):
    return AlertService.summary(db)


@router.get("/low-stock", response_model=list[LowStockAlertResponse])
def low_stock_alerts(db: Session = Depends(get_db)):
    return AlertService.low_stock(db)
