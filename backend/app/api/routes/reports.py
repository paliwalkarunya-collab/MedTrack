from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.session import get_db
from app.schemas.reports import (
    SalesReportItem, SalesSummary,
    PurchaseReportItem, PurchaseSummary,
    COGSReportItem, COGSSummary,
    ProfitReportItem, ProfitSummary,
    DashboardSummary,
    TopMedicine, TopSupplier,
    ReportFilters,
)
from app.services.report_service import ReportService
from app.tenancy.dependencies import require_tenant_from_header


router = APIRouter(tags=["Reports"])


def get_report_service(db: Session = Depends(get_db), _=Depends(require_tenant_from_header)) -> ReportService:
    return ReportService(db)


# ==================== Sales Reports ====================

@router.get("/sales", response_model=List[SalesReportItem])
def get_sales_report(
    date_from: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    medicine_id: Optional[UUID] = Query(None, description="Filter by medicine"),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    service: ReportService = Depends(get_report_service),
):
    """Get detailed sales report for completed invoices."""
    records, _, _ = service.get_sales_report(
        date_from=date_from, date_to=date_to,
        medicine_id=medicine_id, customer_id=customer_id,
        page=page, page_size=page_size,
    )
    return records


@router.get("/sales/summary", response_model=SalesSummary)
def get_sales_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    medicine_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    service: ReportService = Depends(get_report_service),
):
    """Get sales summary aggregates."""
    return service.get_sales_summary(
        date_from=date_from, date_to=date_to,
        medicine_id=medicine_id, customer_id=customer_id,
    )


# ==================== Purchase Reports ====================

@router.get("/purchases", response_model=List[PurchaseReportItem])
def get_purchase_report(
    date_from: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    medicine_id: Optional[UUID] = Query(None, description="Filter by medicine"),
    supplier_id: Optional[UUID] = Query(None, description="Filter by supplier"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    service: ReportService = Depends(get_report_service),
):
    """Get detailed purchase report for RECEIVED purchases."""
    records, _, _ = service.get_purchase_report(
        date_from=date_from, date_to=date_to,
        medicine_id=medicine_id, supplier_id=supplier_id,
        page=page, page_size=page_size,
    )
    return records


@router.get("/purchases/summary", response_model=PurchaseSummary)
def get_purchase_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    medicine_id: Optional[UUID] = Query(None),
    supplier_id: Optional[UUID] = Query(None),
    service: ReportService = Depends(get_report_service),
):
    """Get purchase summary aggregates."""
    return service.get_purchase_summary(
        date_from=date_from, date_to=date_to,
        medicine_id=medicine_id, supplier_id=supplier_id,
    )


# ==================== COGS Reports ====================

@router.get("/cogs", response_model=List[COGSReportItem])
def get_cogs_report(
    date_from: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    medicine_id: Optional[UUID] = Query(None, description="Filter by medicine"),
    invoice_id: Optional[UUID] = Query(None, description="Filter by invoice"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    service: ReportService = Depends(get_report_service),
):
    """Get COGS report using historical batch cost from stock allocations."""
    records, _, _ = service.get_cogs_report(
        date_from=date_from, date_to=date_to,
        medicine_id=medicine_id, invoice_id=invoice_id,
        page=page, page_size=page_size,
    )
    return records


@router.get("/cogs/summary", response_model=COGSSummary)
def get_cogs_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    medicine_id: Optional[UUID] = Query(None),
    service: ReportService = Depends(get_report_service),
):
    """Get COGS summary aggregates."""
    return service.get_cogs_summary(
        date_from=date_from, date_to=date_to, medicine_id=medicine_id,
    )


# ==================== Profit Reports ====================

@router.get("/profit", response_model=List[ProfitReportItem])
def get_profit_report(
    date_from: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    medicine_id: Optional[UUID] = Query(None, description="Filter by medicine"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    service: ReportService = Depends(get_report_service),
):
    """Get profit report grouped by medicine."""
    records, _, _ = service.get_profit_report(
        date_from=date_from, date_to=date_to,
        medicine_id=medicine_id,
        page=page, page_size=page_size,
    )
    return records


@router.get("/profit/summary", response_model=ProfitSummary)
def get_profit_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    medicine_id: Optional[UUID] = Query(None),
    service: ReportService = Depends(get_report_service),
):
    """Get overall profit summary."""
    return service.get_profit_summary(
        date_from=date_from, date_to=date_to, medicine_id=medicine_id,
    )


# ==================== Dashboard Summary ====================

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    service: ReportService = Depends(get_report_service),
):
    """Get dashboard summary with key metrics."""
    return service.get_dashboard_summary(date_from=date_from, date_to=date_to)


# ==================== Top Medicines Analytics ====================

@router.get("/top-medicines", response_model=List[TopMedicine])
def get_top_medicines(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    service: ReportService = Depends(get_report_service),
):
    """Get top selling medicines by profit."""
    return service.get_top_medicines(date_from=date_from, date_to=date_to, limit=limit)


# ==================== Top Suppliers Analytics ====================

@router.get("/top-suppliers", response_model=List[TopSupplier])
def get_top_suppliers(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    service: ReportService = Depends(get_report_service),
):
    """Get top suppliers by purchase cost."""
    return service.get_top_suppliers(date_from=date_from, date_to=date_to, limit=limit)