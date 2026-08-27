import datetime
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import Session, joinedload

from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.stock_allocation import StockAllocation
from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.customer import Customer
from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem
from app.models.supplier import Supplier
from app.models.return_model import Return
from app.models.return_item import ReturnItem
from app.models.return_allocation import ReturnAllocation
from app.tenancy.tenant_context import get_current_pharmacy_id


ZERO = Decimal("0.00")


class ReportService:
    """Tenant-scoped reporting service. All calculations use historical transaction data."""

    def __init__(self, db: Session):
        self.db = db
        self.pharmacy_id = get_current_pharmacy_id()

    # ==================== Helper Methods ====================

    def _apply_date_filter(self, stmt, date_col, date_from: Optional[date], date_to: Optional[date]):
        """Apply date range filter. date_to is inclusive."""
        if date_from:
            stmt = stmt.where(date_col >= date_from)
        if date_to:
            stmt = stmt.where(date_col <= date_to)
        return stmt

    def _apply_medicine_filter(self, stmt, medicine_col, medicine_id: Optional[UUID]):
        if medicine_id:
            stmt = stmt.where(medicine_col == medicine_id)
        return stmt

    def _apply_customer_filter(self, stmt, customer_col, customer_id: Optional[UUID]):
        if customer_id:
            stmt = stmt.where(customer_col == customer_id)
        return stmt

    def _apply_supplier_filter(self, stmt, supplier_col, supplier_id: Optional[UUID]):
        if supplier_id:
            stmt = stmt.where(supplier_col == supplier_id)
        return stmt

    def _paginate(self, stmt, page: int, page_size: int):
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        if total is None:
            total = 0
        offset = (page - 1) * page_size
        records = list(self.db.execute(stmt.offset(offset).limit(page_size)).all())
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return records, total, total_pages

    # ==================== Sales Reports ====================

    def get_sales_report(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
        customer_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50,
    ):
        """Detailed sales report with completed invoices only."""
        stmt = (
            select(
                Invoice.id.label("invoice_id"),
                Invoice.invoice_number,
                Invoice.invoice_date,
                Customer.name.label("customer_name"),
                Medicine.id.label("medicine_id"),
                Medicine.name.label("medicine_name"),
                InvoiceItem.quantity,
                InvoiceItem.unit_price,
                InvoiceItem.discount_amount,
                InvoiceItem.tax_amount,
                InvoiceItem.line_total,
            )
            .select_from(Invoice)
            .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)
            .join(Medicine, Medicine.id == InvoiceItem.medicine_id)
            .outerjoin(Customer, Customer.id == Invoice.customer_id)
            .where(Invoice.status == "COMPLETED")
        )

        stmt = self._apply_date_filter(stmt, Invoice.invoice_date, date_from, date_to)
        stmt = self._apply_medicine_filter(stmt, InvoiceItem.medicine_id, medicine_id)
        stmt = self._apply_customer_filter(stmt, Invoice.customer_id, customer_id)
        stmt = stmt.order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())

        records, total, total_pages = self._paginate(stmt, page, page_size)
        # Convert to dict for proper schema validation
        return [self._row_to_dict(r) for r in records], total, total_pages

    def _row_to_dict(self, row):
        """Convert SQLAlchemy row to dict."""
        return {key: getattr(row, key) for key in row._fields}

    def get_sales_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
        customer_id: Optional[UUID] = None,
    ):
        """Aggregate sales summary from completed invoices."""
        # Base query for completed invoices
        base_query = (
            select(
                func.count(Invoice.id.distinct()).label("total_invoices"),
                func.coalesce(func.sum(InvoiceItem.quantity), 0).label("total_items_sold"),
                func.coalesce(func.sum(InvoiceItem.line_total + InvoiceItem.discount_amount - InvoiceItem.tax_amount), ZERO).label("gross_sales"),
                func.coalesce(func.sum(InvoiceItem.discount_amount), ZERO).label("discounts"),
                func.coalesce(func.sum(InvoiceItem.tax_amount), ZERO).label("tax"),
                func.coalesce(func.sum(InvoiceItem.line_total), ZERO).label("net_sales"),
            )
            .select_from(Invoice)
            .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)
            .where(Invoice.status == "COMPLETED")
        )

        base_query = self._apply_date_filter(base_query, Invoice.invoice_date, date_from, date_to)
        base_query = self._apply_medicine_filter(base_query, InvoiceItem.medicine_id, medicine_id)
        base_query = self._apply_customer_filter(base_query, Invoice.customer_id, customer_id)

        result = self.db.execute(base_query).first()

        # Calculate returns for the same period
        returns_query = (
            select(
                func.coalesce(func.sum(Return.refund_amount), ZERO).label("returned_amount"),
            )
            .select_from(Return)
            .join(ReturnItem, ReturnItem.return_id == Return.id)
            .join(InvoiceItem, InvoiceItem.id == ReturnItem.invoice_item_id)
            .where(Return.status == "COMPLETED")
        )
        returns_query = self._apply_date_filter(returns_query, Return.created_at, date_from, date_to)
        returns_query = self._apply_medicine_filter(returns_query, InvoiceItem.medicine_id, medicine_id)
        returns_query = self._apply_customer_filter(returns_query, Invoice.customer_id, customer_id)

        returns_result = self.db.execute(returns_query).first()
        returned_amount = returns_result.returned_amount if returns_result else ZERO

        net_after_returns = (result.net_sales if result else ZERO) - returned_amount

        return {
            "total_invoices": result.total_invoices if result else 0,
            "total_items_sold": result.total_items_sold if result else 0,
            "gross_sales": result.gross_sales if result else ZERO,
            "discounts": result.discounts if result else ZERO,
            "tax": result.tax if result else ZERO,
            "net_sales": result.net_sales if result else ZERO,
            "returned_amount": returned_amount,
            "net_after_returns": net_after_returns,
        }

    # ==================== Purchase Reports ====================

    def get_purchase_report(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
        supplier_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50,
    ):
        """Detailed purchase report with RECEIVED purchases only."""
        stmt = (
            select(
                Purchase.id.label("purchase_id"),
                Purchase.received_date.label("purchase_date"),
                Supplier.name.label("supplier_name"),
                Medicine.id.label("medicine_id"),
                Medicine.name.label("medicine_name"),
                PurchaseItem.quantity,
                PurchaseItem.purchase_price.label("unit_cost"),
                PurchaseItem.line_total.label("total_cost"),
            )
            .select_from(Purchase)
            .join(PurchaseItem, PurchaseItem.purchase_id == Purchase.id)
            .join(Medicine, Medicine.id == PurchaseItem.medicine_id)
            .join(Supplier, Supplier.id == Purchase.supplier_id)
            .where(Purchase.status == "RECEIVED")
        )

        # Use received_date for filtering, fallback to created_at
        stmt = self._apply_date_filter(stmt, Purchase.received_date, date_from, date_to)
        stmt = self._apply_medicine_filter(stmt, PurchaseItem.medicine_id, medicine_id)
        stmt = self._apply_supplier_filter(stmt, Purchase.supplier_id, supplier_id)
        stmt = stmt.order_by(Purchase.received_date.desc().nullslast(), Purchase.created_at.desc())

        records, total, total_pages = self._paginate(stmt, page, page_size)
        return [self._row_to_dict(r) for r in records], total, total_pages

    def get_purchase_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
        supplier_id: Optional[UUID] = None,
    ):
        """Aggregate purchase summary from RECEIVED purchases."""
        base_query = (
            select(
                func.count(Purchase.id.distinct()).label("total_purchases"),
                func.coalesce(func.sum(PurchaseItem.quantity), 0).label("total_quantity_purchased"),
                func.coalesce(func.sum(PurchaseItem.line_total), ZERO).label("total_purchase_cost"),
                func.count(Supplier.id.distinct()).label("unique_suppliers"),
            )
            .select_from(Purchase)
            .join(PurchaseItem, PurchaseItem.purchase_id == Purchase.id)
            .join(Medicine, Medicine.id == PurchaseItem.medicine_id)
            .join(Supplier, Supplier.id == Purchase.supplier_id)
            .where(Purchase.status == "RECEIVED")
        )

        base_query = self._apply_date_filter(base_query, Purchase.received_date, date_from, date_to)
        base_query = self._apply_medicine_filter(base_query, PurchaseItem.medicine_id, medicine_id)
        base_query = self._apply_supplier_filter(base_query, Purchase.supplier_id, supplier_id)

        result = self.db.execute(base_query).first()

        return {
            "total_purchases": result.total_purchases if result else 0,
            "total_quantity_purchased": result.total_quantity_purchased if result else 0,
            "total_purchase_cost": result.total_purchase_cost if result else ZERO,
            "unique_suppliers": result.unique_suppliers if result else 0,
        }

    # ==================== COGS Reports ====================

    def get_cogs_report(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
        invoice_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50,
    ):
        """COGS report using historical batch cost from StockAllocation."""
        stmt = (
            select(
                Invoice.id.label("invoice_id"),
                Invoice.invoice_number,
                Invoice.invoice_date,
                Medicine.id.label("medicine_id"),
                Medicine.name.label("medicine_name"),
                InventoryBatch.id.label("batch_id"),
                InventoryBatch.batch_number,
                StockAllocation.quantity.label("quantity_consumed"),
                InventoryBatch.purchase_price.label("unit_cost"),
                (StockAllocation.quantity * InventoryBatch.purchase_price).label("cogs"),
            )
            .select_from(Invoice)
            .join(StockAllocation, StockAllocation.invoice_id == Invoice.id)
            .join(InventoryBatch, InventoryBatch.id == StockAllocation.inventory_batch_id)
            .join(Medicine, Medicine.id == StockAllocation.medicine_id)
            .where(Invoice.status == "COMPLETED")
            .where(StockAllocation.invoice_id.isnot(None))
            .where(InventoryBatch.purchase_price.isnot(None))
        )

        stmt = self._apply_date_filter(stmt, Invoice.invoice_date, date_from, date_to)
        stmt = self._apply_medicine_filter(stmt, StockAllocation.medicine_id, medicine_id)
        if invoice_id:
            stmt = stmt.where(Invoice.id == invoice_id)
        stmt = stmt.order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())

        records, total, total_pages = self._paginate(stmt, page, page_size)
        return [self._row_to_dict(r) for r in records], total, total_pages

    def get_cogs_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
    ):
        """Aggregate COGS summary."""
        base_query = (
            select(
                func.coalesce(func.sum(StockAllocation.quantity * InventoryBatch.purchase_price), ZERO).label("total_cogs"),
                func.coalesce(func.sum(StockAllocation.quantity), 0).label("quantity_consumed"),
                func.count(Medicine.id.distinct()).label("unique_medicines"),
                func.count(Invoice.id.distinct()).label("unique_invoices"),
            )
            .select_from(Invoice)
            .join(StockAllocation, StockAllocation.invoice_id == Invoice.id)
            .join(InventoryBatch, InventoryBatch.id == StockAllocation.inventory_batch_id)
            .join(Medicine, Medicine.id == StockAllocation.medicine_id)
            .where(Invoice.status == "COMPLETED")
            .where(StockAllocation.invoice_id.isnot(None))
            .where(InventoryBatch.purchase_price.isnot(None))
        )

        base_query = self._apply_date_filter(base_query, Invoice.invoice_date, date_from, date_to)
        base_query = self._apply_medicine_filter(base_query, StockAllocation.medicine_id, medicine_id)

        result = self.db.execute(base_query).first()

        return {
            "total_cogs": result.total_cogs if result else ZERO,
            "quantity_consumed": result.quantity_consumed if result else 0,
            "unique_medicines": result.unique_medicines if result else 0,
            "unique_invoices": result.unique_invoices if result else 0,
        }

    # ==================== Return Adjustments ====================

    def _get_return_sales_adjustment(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
    ):
        """Get total refund amount from completed returns."""
        stmt = (
            select(
                func.coalesce(func.sum(Return.refund_amount), ZERO).label("returned_revenue"),
            )
            .select_from(Return)
            .join(ReturnItem, ReturnItem.return_id == Return.id)
            .join(InvoiceItem, InvoiceItem.id == ReturnItem.invoice_item_id)
            .where(Return.status == "COMPLETED")
        )
        stmt = self._apply_date_filter(stmt, Return.created_at, date_from, date_to)
        stmt = self._apply_medicine_filter(stmt, InvoiceItem.medicine_id, medicine_id)
        result = self.db.execute(stmt).first()
        return result.returned_revenue if result else ZERO

    def _get_return_cogs_adjustment(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
    ):
        """Get COGS adjustment for returned items (restored batch cost)."""
        # Returns restore stock to original batches, so we need to subtract the cost
        # of the returned quantities from COGS
        stmt = (
            select(
                func.coalesce(func.sum(
                    ReturnAllocation.quantity * InventoryBatch.purchase_price
                ), ZERO).label("returned_cogs"),
            )
            .select_from(ReturnAllocation)
            .join(ReturnItem, ReturnItem.id == ReturnAllocation.return_item_id)
            .join(Return, Return.id == ReturnItem.return_id)
            .join(InventoryBatch, InventoryBatch.id == ReturnAllocation.inventory_batch_id)
            .where(Return.status == "COMPLETED")
            .where(InventoryBatch.purchase_price.isnot(None))
        )
        stmt = self._apply_date_filter(stmt, Return.created_at, date_from, date_to)
        stmt = self._apply_medicine_filter(stmt, ReturnItem.medicine_id, medicine_id)
        result = self.db.execute(stmt).first()
        return result.returned_cogs if result else ZERO

    # ==================== Profit Reports ====================

    def get_profit_report(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50,
    ):
        """Profit report grouped by medicine."""
        # This is a complex aggregation - we'll compute per medicine
        # First get all completed invoice items for the period
        sales_stmt = (
            select(
                InvoiceItem.medicine_id,
                Medicine.name.label("medicine_name"),
                func.coalesce(func.sum(InvoiceItem.quantity), 0).label("quantity_sold"),
                func.coalesce(func.sum(InvoiceItem.line_total), ZERO).label("net_sales"),
            )
            .select_from(InvoiceItem)
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
            .join(Medicine, Medicine.id == InvoiceItem.medicine_id)
            .where(Invoice.status == "COMPLETED")
        )
        sales_stmt = self._apply_date_filter(sales_stmt, Invoice.invoice_date, date_from, date_to)
        sales_stmt = self._apply_medicine_filter(sales_stmt, InvoiceItem.medicine_id, medicine_id)
        sales_stmt = sales_stmt.group_by(InvoiceItem.medicine_id, Medicine.name)

        sales_data = {row.medicine_id: row for row in self.db.execute(sales_stmt).all()}

        # Get returns per medicine
        returns_stmt = (
            select(
                InvoiceItem.medicine_id,
                func.coalesce(func.sum(Return.refund_amount), ZERO).label("returned_revenue"),
            )
            .select_from(Return)
            .join(ReturnItem, ReturnItem.return_id == Return.id)
            .join(InvoiceItem, InvoiceItem.id == ReturnItem.invoice_item_id)
            .where(Return.status == "COMPLETED")
        )
        returns_stmt = self._apply_date_filter(returns_stmt, Return.created_at, date_from, date_to)
        returns_stmt = self._apply_medicine_filter(returns_stmt, InvoiceItem.medicine_id, medicine_id)
        returns_stmt = returns_stmt.group_by(InvoiceItem.medicine_id)

        returns_data = {row.medicine_id: row.returned_revenue for row in self.db.execute(returns_stmt).all()}

        # Get COGS per medicine
        cogs_stmt = (
            select(
                StockAllocation.medicine_id,
                func.coalesce(func.sum(StockAllocation.quantity * InventoryBatch.purchase_price), ZERO).label("cogs"),
            )
            .select_from(StockAllocation)
            .join(Invoice, Invoice.id == StockAllocation.invoice_id)
            .join(InventoryBatch, InventoryBatch.id == StockAllocation.inventory_batch_id)
            .where(Invoice.status == "COMPLETED")
            .where(StockAllocation.invoice_id.isnot(None))
            .where(InventoryBatch.purchase_price.isnot(None))
        )
        cogs_stmt = self._apply_date_filter(cogs_stmt, Invoice.invoice_date, date_from, date_to)
        cogs_stmt = self._apply_medicine_filter(cogs_stmt, StockAllocation.medicine_id, medicine_id)
        cogs_stmt = cogs_stmt.group_by(StockAllocation.medicine_id)

        cogs_data = {row.medicine_id: row.cogs for row in self.db.execute(cogs_stmt).all()}

        # Get return COGS adjustment per medicine
        return_cogs_stmt = (
            select(
                ReturnItem.medicine_id,
                func.coalesce(func.sum(ReturnAllocation.quantity * InventoryBatch.purchase_price), ZERO).label("returned_cogs"),
            )
            .select_from(ReturnAllocation)
            .join(ReturnItem, ReturnItem.id == ReturnAllocation.return_item_id)
            .join(Return, Return.id == ReturnItem.return_id)
            .join(InventoryBatch, InventoryBatch.id == ReturnAllocation.inventory_batch_id)
            .where(Return.status == "COMPLETED")
            .where(InventoryBatch.purchase_price.isnot(None))
        )
        return_cogs_stmt = self._apply_date_filter(return_cogs_stmt, Return.created_at, date_from, date_to)
        return_cogs_stmt = self._apply_medicine_filter(return_cogs_stmt, ReturnItem.medicine_id, medicine_id)
        return_cogs_stmt = return_cogs_stmt.group_by(ReturnItem.medicine_id)

        return_cogs_data = {row.medicine_id: row.returned_cogs for row in self.db.execute(return_cogs_stmt).all()}

        # Build results
        results = []
        for med_id, sales_row in sales_data.items():
            net_sales = sales_row.net_sales
            returned_rev = returns_data.get(med_id, ZERO)
            net_after_returns = net_sales - returned_rev
            cogs = cogs_data.get(med_id, ZERO)
            returned_cogs = return_cogs_data.get(med_id, ZERO)
            cogs_after_returns = cogs - returned_cogs
            gross_profit = net_after_returns - cogs_after_returns
            
            margin = ZERO
            if net_after_returns > ZERO:
                margin = (gross_profit / net_after_returns * Decimal("100")).quantize(Decimal("0.01"))

            results.append({
                "medicine_id": med_id,
                "medicine_name": sales_row.medicine_name,
                "quantity_sold": sales_row.quantity_sold,
                "net_sales": net_sales,
                "returns": returned_rev,
                "net_sales_after_returns": net_after_returns,
                "cogs": cogs_after_returns,
                "gross_profit": gross_profit,
                "margin_percent": margin,
            })

        # Sort by profit descending
        results.sort(key=lambda x: x["gross_profit"], reverse=True)

        # Paginate
        total = len(results)
        offset = (page - 1) * page_size
        paginated = results[offset:offset + page_size]
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

        return paginated, total, total_pages

    def get_profit_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        medicine_id: Optional[UUID] = None,
    ):
        """Overall profit summary."""
        sales = self.get_sales_summary(date_from, date_to, medicine_id, None)
        cogs = self.get_cogs_summary(date_from, date_to, medicine_id)
        returned_rev = self._get_return_sales_adjustment(date_from, date_to, medicine_id)
        returned_cogs = self._get_return_cogs_adjustment(date_from, date_to, medicine_id)

        net_sales = sales["net_sales"]
        net_after_returns = net_sales - returned_rev
        cogs_after_returns = cogs["total_cogs"] - returned_cogs
        gross_profit = net_after_returns - cogs_after_returns

        margin = ZERO
        if net_after_returns > ZERO:
            margin = (gross_profit / net_after_returns * Decimal("100")).quantize(Decimal("0.01"))

        return {
            "net_sales": net_sales,
            "returns": returned_rev,
            "net_sales_after_returns": net_after_returns,
            "cogs": cogs_after_returns,
            "gross_profit": gross_profit,
            "margin_percent": margin,
        }

    # ==================== Dashboard Summary ====================

    def get_dashboard_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ):
        """Dashboard summary with key metrics."""
        sales = self.get_sales_summary(date_from, date_to, None, None)
        purchases = self.get_purchase_summary(date_from, date_to, None, None)
        cogs = self.get_cogs_summary(date_from, date_to, None)
        returned_rev = self._get_return_sales_adjustment(date_from, date_to, None)
        returned_cogs = self._get_return_cogs_adjustment(date_from, date_to, None)
        net_after_returns = sales["net_sales"] - returned_rev
        cogs_after_returns = cogs["total_cogs"] - returned_cogs
        gross_profit = net_after_returns - cogs_after_returns
        
        margin = ZERO
        if net_after_returns > ZERO:
            margin = (gross_profit / net_after_returns * Decimal("100")).quantize(Decimal("0.01"))

        # Inventory metrics
        inventory_stmt = (
            select(
                func.coalesce(func.sum(InventoryBatch.quantity * InventoryBatch.purchase_price), ZERO).label("inventory_value"),
            )
            .where(InventoryBatch.is_active == True)
            .where(InventoryBatch.quantity > 0)
            .where(InventoryBatch.purchase_price.isnot(None))
        )
        inventory_result = self.db.execute(inventory_stmt).first()
        inventory_value = inventory_result.inventory_value if inventory_result else ZERO

        low_stock_stmt = (
            select(func.count(Medicine.id.distinct()))
            .join(InventoryBatch, InventoryBatch.medicine_id == Medicine.id)
            .where(InventoryBatch.is_active == True)
            .where(InventoryBatch.quantity > 0)
            .group_by(Medicine.id)
            .having(func.sum(InventoryBatch.quantity) <= 10)
        )
        low_stock_count = self.db.scalar(low_stock_stmt) or 0

        expired_stmt = (
            select(func.count(InventoryBatch.id.distinct()))
            .where(InventoryBatch.is_active == True)
            .where(InventoryBatch.expiry_date.isnot(None))
            .where(InventoryBatch.expiry_date < datetime.date.today())
        )
        expired_count = self.db.scalar(expired_stmt) or 0

        return {
            "total_sales": sales["net_sales"],
            "total_invoices": sales["total_invoices"],
            "total_items_sold": sales["total_items_sold"],
            "total_purchases": purchases["total_purchase_cost"],
            "total_purchase_orders": purchases["total_purchases"],
            "total_cogs": cogs_after_returns,
            "gross_profit": gross_profit,
            "profit_margin_percent": margin,
            "total_returns": returned_rev,
            "total_return_items": 0,
            "inventory_value": inventory_value,
            "low_stock_count": low_stock_count,
            "expired_count": expired_count,
        }

    # ==================== Top Medicines Analytics ====================

    def get_top_medicines(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 10,
    ):
        """Top selling medicines by profit."""
        profit_data = self.get_profit_report(date_from, date_to, None, 1, limit)
        return profit_data[0]

    # ==================== Top Suppliers Analytics ====================

    def get_top_suppliers(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 10,
    ):
        """Top suppliers by purchase cost."""
        stmt = (
            select(
                Supplier.id.label("supplier_id"),
                Supplier.name.label("supplier_name"),
                func.coalesce(func.sum(PurchaseItem.quantity), 0).label("purchase_quantity"),
                func.coalesce(func.sum(PurchaseItem.line_total), ZERO).label("purchase_cost"),
            )
            .select_from(Supplier)
            .join(Purchase, Purchase.supplier_id == Supplier.id)
            .join(PurchaseItem, PurchaseItem.purchase_id == Purchase.id)
            .where(Purchase.status == "RECEIVED")
        )
        stmt = self._apply_date_filter(stmt, Purchase.received_date, date_from, date_to)
        stmt = stmt.group_by(Supplier.id, Supplier.name)
        stmt = stmt.order_by(func.sum(PurchaseItem.line_total).desc())
        stmt = stmt.limit(limit)

        records = list(self.db.execute(stmt).all())
        return [self._row_to_dict(r) for r in records]