from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


# Sales Report Schemas
class SalesReportItem(BaseModel):
    invoice_id: UUID
    invoice_number: str
    invoice_date: date
    customer_name: Optional[str] = None
    medicine_id: UUID
    medicine_name: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class SalesSummary(BaseModel):
    total_invoices: int
    total_items_sold: int
    gross_sales: Decimal
    discounts: Decimal
    tax: Decimal
    net_sales: Decimal
    returned_amount: Decimal
    net_after_returns: Decimal

    model_config = ConfigDict(from_attributes=True)


# Purchase Report Schemas
class PurchaseReportItem(BaseModel):
    purchase_id: UUID
    purchase_date: Optional[date] = None
    supplier_name: str
    medicine_id: UUID
    medicine_name: str
    quantity: int
    unit_cost: Decimal
    total_cost: Decimal

    model_config = ConfigDict(from_attributes=True)


class PurchaseSummary(BaseModel):
    total_purchases: int
    total_quantity_purchased: int
    total_purchase_cost: Decimal
    unique_suppliers: int

    model_config = ConfigDict(from_attributes=True)


# COGS Report Schemas
class COGSReportItem(BaseModel):
    invoice_id: UUID
    invoice_number: str
    invoice_date: date
    medicine_id: UUID
    medicine_name: str
    batch_id: UUID
    batch_number: str
    quantity_consumed: int
    unit_cost: Decimal
    cogs: Decimal

    model_config = ConfigDict(from_attributes=True)


class COGSSummary(BaseModel):
    total_cogs: Decimal
    quantity_consumed: int
    unique_medicines: int
    unique_invoices: int

    model_config = ConfigDict(from_attributes=True)


# Profit Report Schemas
class ProfitReportItem(BaseModel):
    medicine_id: UUID
    medicine_name: str
    quantity_sold: int
    net_sales: Decimal
    returns: Decimal
    net_sales_after_returns: Decimal
    cogs: Decimal
    gross_profit: Decimal
    margin_percent: Decimal

    model_config = ConfigDict(from_attributes=True)


class ProfitSummary(BaseModel):
    net_sales: Decimal
    returns: Decimal
    net_sales_after_returns: Decimal
    cogs: Decimal
    gross_profit: Decimal
    margin_percent: Decimal

    model_config = ConfigDict(from_attributes=True)


# Dashboard Summary
class DashboardSummary(BaseModel):
    # Sales metrics
    total_sales: Decimal
    total_invoices: int
    total_items_sold: int
    
    # Purchase metrics
    total_purchases: Decimal
    total_purchase_orders: int
    
    # COGS & Profit
    total_cogs: Decimal
    gross_profit: Decimal
    profit_margin_percent: Decimal
    
    # Returns
    total_returns: Decimal
    total_return_items: int
    
    # Inventory
    inventory_value: Optional[Decimal] = None
    low_stock_count: int
    expired_count: int

    model_config = ConfigDict(from_attributes=True)


# Top Medicines Analytics
class TopMedicine(BaseModel):
    medicine_id: UUID
    medicine_name: str
    quantity_sold: int
    net_sales: Decimal
    returns: Decimal
    net_sales_after_returns: Decimal
    cogs: Decimal
    gross_profit: Decimal
    margin_percent: Decimal

    model_config = ConfigDict(from_attributes=True)


# Top Suppliers Analytics
class TopSupplier(BaseModel):
    supplier_id: UUID
    supplier_name: str
    purchase_quantity: int
    purchase_cost: Decimal

    model_config = ConfigDict(from_attributes=True)

    # Allow extra fields from service
    model_config = ConfigDict(from_attributes=True, extra='allow')


# Pagination
class PaginatedResponse(BaseModel):
    records: list
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = ConfigDict(from_attributes=True)


# Filter Schemas
class ReportFilters(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    medicine_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)