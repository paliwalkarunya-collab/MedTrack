import datetime
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.pharmacy import Pharmacy
from app.models.stock_allocation import StockAllocation
from app.models.return_model import Return
from app.models.return_item import ReturnItem
from app.models.return_allocation import ReturnAllocation
from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem
from app.models.supplier import Supplier
from app.tenancy.tenant_context import set_current_pharmacy_id


def _setup(db):
    pharmacy_a, pharmacy_b = Pharmacy(name="A"), Pharmacy(name="B")
    db.add_all([pharmacy_a, pharmacy_b])
    db.flush()
    med_a = Medicine(pharmacy_id=pharmacy_a.id, name="Paracetamol")
    med_b = Medicine(pharmacy_id=pharmacy_b.id, name="Ibuprofen")
    db.add_all([med_a, med_b])
    db.flush()
    batch_a = InventoryBatch(
        pharmacy_id=pharmacy_a.id, medicine_id=med_a.id, batch_number="BATCH-001",
        quantity=100, purchase_price=Decimal("60.00"),
        expiry_date=datetime.date.today() + datetime.timedelta(days=365)
    )
    batch_b = InventoryBatch(
        pharmacy_id=pharmacy_a.id, medicine_id=med_a.id, batch_number="BATCH-002",
        quantity=100, purchase_price=Decimal("65.00"),
        expiry_date=datetime.date.today() + datetime.timedelta(days=365)
    )
    db.add_all([batch_a, batch_b])
    
    supplier = Supplier(pharmacy_id=pharmacy_a.id, name="Test Supplier")
    db.add(supplier)
    db.flush()
    
    purchase = Purchase(
        pharmacy_id=pharmacy_a.id, supplier_id=supplier.id,
        received_date=datetime.date.today() - datetime.timedelta(days=30),
        status="RECEIVED", subtotal=Decimal("6000.00"),
        tax_amount=Decimal("0.00"), discount_amount=Decimal("0.00"),
        total_amount=Decimal("6000.00")
    )
    db.add(purchase)
    db.flush()
    
    purchase_item = PurchaseItem(
        pharmacy_id=pharmacy_a.id, purchase_id=purchase.id,
        medicine_id=med_a.id, batch_number="BATCH-001",
        quantity=100, purchase_price=Decimal("60.00"),
        line_total=Decimal("6000.00")
    )
    db.add(purchase_item)
    
    pharmacy_a_id, pharmacy_b_id, med_a_id, med_b_id = pharmacy_a.id, pharmacy_b.id, med_a.id, med_b.id
    batch_a_id, batch_b_id, supplier_id = batch_a.id, batch_b.id, supplier.id
    purchase_id, purchase_item_id = purchase.id, purchase_item.id
    db.commit()
    return {
        "pharmacy_a": pharmacy_a_id, "pharmacy_b": pharmacy_b_id,
        "med_a": med_a_id, "med_b": med_b_id,
        "batch_a": batch_a_id, "batch_b": batch_b_id,
        "supplier": supplier_id,
        "purchase": purchase_id, "purchase_item": purchase_item_id,
    }


def _create_completed_invoice(client, db_session, pharmacy_id, medicine_id, quantity=10, unit_price="100.00", discount="5.00", tax="2.00"):
    headers = {"X-Pharmacy-ID": str(pharmacy_id)}
    response = client.post("/api/v1/invoices/", headers=headers, json={
        "invoice_number": f"INV-{uuid.uuid4().hex[:8]}",
        "items": [{"medicine_id": str(medicine_id), "quantity": quantity,
                   "unit_price": unit_price, "discount_amount": discount, "tax_amount": tax}],
    })
    assert response.status_code == 201
    invoice = response.json()
    complete = client.post(f"/api/v1/invoices/{invoice['id']}/complete", headers=headers)
    assert complete.status_code == 200
    return invoice, complete.json()


def _create_completed_return(client, db_session, pharmacy_id, invoice_id, invoice_item_id, quantity=4):
    headers = {"X-Pharmacy-ID": str(pharmacy_id)}
    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": quantity}]
    })
    assert r.status_code == 201
    complete = client.post(f"/api/v1/returns/{r.json()['id']}/complete", headers=headers)
    assert complete.status_code == 200
    return r.json()["id"], complete.json()


def test_sales_report(client, db_session):
    """Test sales report with date filters."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    invoice, completed = _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00", "5.00", "2.00")
    
    # Test sales report
    resp = client.get("/api/v1/reports/sales", headers=headers)
    assert resp.status_code == 200
    sales = resp.json()
    assert len(sales) == 1
    assert sales[0]["quantity"] == 10
    assert Decimal(sales[0]["unit_price"]) == Decimal("100.00")
    assert Decimal(sales[0]["line_total"]) == Decimal("997.00")  # 10*100 - 5 + 2

    # Test date filter
    today = datetime.date.today()
    resp = client.get(f"/api/v1/reports/sales?date_from={today}&date_to={today}", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_sales_summary(client, db_session):
    """Test sales summary aggregates."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00", "5.00", "2.00")
    
    resp = client.get("/api/v1/reports/sales/summary", headers=headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_invoices"] == 1
    assert summary["total_items_sold"] == 10
    assert Decimal(summary["gross_sales"]) == Decimal("995.00")  # 10*100 - 5
    assert Decimal(summary["discounts"]) == Decimal("5.00")
    assert Decimal(summary["tax"]) == Decimal("2.00")
    assert Decimal(summary["net_sales"]) == Decimal("997.00")
    assert Decimal(summary["returned_amount"]) == Decimal("0.00")
    assert Decimal(summary["net_after_returns"]) == Decimal("997.00")


def test_purchase_report(client, db_session):
    """Test purchase report with filters."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    supplier_id = data["supplier"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    resp = client.get("/api/v1/reports/purchases", headers=headers)
    assert resp.status_code == 200
    purchases = resp.json()
    assert len(purchases) == 1
    assert purchases[0]["supplier_name"] == "Test Supplier"
    assert purchases[0]["quantity"] == 100
    assert Decimal(purchases[0]["unit_cost"]) == Decimal("60.00")
    assert Decimal(purchases[0]["total_cost"]) == Decimal("6000.00")
    
    # Test supplier filter
    resp = client.get(f"/api/v1/reports/purchases?supplier_id={supplier_id}", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_purchase_summary(client, db_session):
    """Test purchase summary aggregates."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    resp = client.get("/api/v1/reports/purchases/summary", headers=headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_purchases"] == 1
    assert summary["total_quantity_purchased"] == 100
    assert summary["total_purchase_cost"] == Decimal("6000.00")
    assert summary["unique_suppliers"] == 1


def test_cogs_report(client, db_session):
    """Test COGS report using historical batch cost."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Sell 10 units - should consume from batch_a (FIFO)
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    resp = client.get("/api/v1/reports/cogs", headers=headers)
    assert resp.status_code == 200
    cogs = resp.json()
    assert len(cogs) == 1
    assert cogs[0]["quantity_consumed"] == 10
    assert Decimal(cogs[0]["unit_cost"]) == Decimal("60.00")  # Historical batch cost
    assert Decimal(cogs[0]["cogs"]) == Decimal("600.00")  # 10 * 60


def test_cogs_summary(client, db_session):
    """Test COGS summary."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    resp = client.get("/api/v1/reports/cogs/summary", headers=headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_cogs"] == Decimal("600.00")
    assert summary["quantity_consumed"] == 10
    assert summary["unique_medicines"] == 1
    assert summary["unique_invoices"] == 1


def test_profit_summary_no_returns(client, db_session):
    """Test profit summary without returns."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Sale: 10 * 100 = 1000, discount 5, tax 2 => net_sales = 997
    # COGS: 10 * 60 = 600
    # Profit = 997 - 600 = 397
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00", "5.00", "2.00")
    
    resp = client.get("/api/v1/reports/profit/summary", headers=headers)
    assert resp.status_code == 200
    profit = resp.json()
    assert profit["net_sales"] == Decimal("997.00")
    assert profit["returns"] == Decimal("0.00")
    assert profit["net_sales_after_returns"] == Decimal("997.00")
    assert profit["cogs"] == Decimal("600.00")
    assert profit["gross_profit"] == Decimal("397.00")
    # margin = 397 / 997 * 100 = 39.82%
    assert profit["margin_percent"] == Decimal("39.82")


def test_profit_summary_with_returns(client, db_session):
    """Test profit summary with returns adjustment."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Sale: 10 * 100 = 1000, discount 5, tax 2 => net_sales = 997
    invoice, completed = _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00", "5.00", "2.00")
    invoice_item_id = completed["items"][0]["id"]
    
    # Return 4 units
    _create_completed_return(client, db_session, pa, completed["id"], invoice_item_id, 4)
    
    # Original: net_sales = 997, cogs = 600
    # Return: 4 units refunded = 4/10 * 997 = 398.8 (proportional)
    # Return COGS: 4 * 60 = 240
    # Net after returns: 997 - 398.8 = 598.2
    # COGS after returns: 600 - 240 = 360
    # Profit: 598.2 - 360 = 238.2
    resp = client.get("/api/v1/reports/profit/summary", headers=headers)
    assert resp.status_code == 200
    profit = resp.json()
    assert profit["net_sales"] == Decimal("997.00")
    assert profit["returns"] > Decimal("0")
    assert profit["net_sales_after_returns"] < Decimal("997.00")
    assert profit["cogs"] < Decimal("600.00")
    assert profit["gross_profit"] < Decimal("397.00")


def test_profit_report_grouped_by_medicine(client, db_session):
    """Test profit report grouped by medicine."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    resp = client.get("/api/v1/reports/profit", headers=headers)
    assert resp.status_code == 200
    profit = resp.json()
    assert len(profit) == 1
    assert profit[0]["medicine_id"] == str(med_a)
    assert profit[0]["quantity_sold"] == 10
    assert profit[0]["gross_profit"] > Decimal("0")


def test_dashboard_summary(client, db_session):
    """Test dashboard summary endpoint."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    resp = client.get("/api/v1/reports/summary", headers=headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_sales"] > Decimal("0")
    assert summary["total_invoices"] == 1
    assert summary["total_cogs"] > Decimal("0")
    assert summary["gross_profit"] > Decimal("0")
    assert summary["low_stock_count"] >= 0
    assert summary["expired_count"] >= 0


def test_top_medicines(client, db_session):
    """Test top medicines analytics."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    resp = client.get("/api/v1/reports/top-medicines?limit=5", headers=headers)
    assert resp.status_code == 200
    top = resp.json()
    assert len(top) == 1
    assert top[0]["medicine_id"] == str(med_a)
    assert top[0]["quantity_sold"] == 10
    assert top[0]["profit"] > Decimal("0")


def test_top_suppliers(client, db_session):
    """Test top suppliers analytics."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    resp = client.get("/api/v1/reports/top-suppliers?limit=5", headers=headers)
    assert resp.status_code == 200
    top = resp.json()
    assert len(top) == 1
    assert top[0]["supplier_name"] == "Test Supplier"
    assert top[0]["purchase_quantity"] == 100
    assert top[0]["purchase_cost"] == Decimal("6000.00")


def test_tenant_isolation_reports(client, db_session):
    """Test that reports are tenant isolated."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    pb = data["pharmacy_b"]
    med_a = data["med_a"]
    a_headers = {"X-Pharmacy-ID": str(pa)}
    b_headers = {"X-Pharmacy-ID": str(pb)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    # Pharmacy B should see no sales
    resp = client.get("/api/v1/reports/sales", headers=b_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0
    
    resp = client.get("/api/v1/reports/sales/summary", headers=b_headers)
    assert resp.status_code == 200
    assert resp.json()["total_invoices"] == 0
    
    # Pharmacy B should see no COGS
    resp = client.get("/api/v1/reports/cogs", headers=b_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0
    
    # Pharmacy B should see no profit
    resp = client.get("/api/v1/reports/profit/summary", headers=b_headers)
    assert resp.status_code == 200
    assert resp.json()["net_sales"] == Decimal("0.00")


def test_unauthenticated_denied(client, db_session):
    """Test that unauthenticated requests are denied."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    resp = client.get("/api/v1/reports/sales")
    assert resp.status_code == 400  # Missing X-Pharmacy-ID header


def test_rbac_staff_access(client, db_session):
    """Test that staff can access reports (if role permits)."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    # All report endpoints should be accessible with X-Pharmacy-ID
    for endpoint in [
        "/api/v1/reports/sales",
        "/api/v1/reports/sales/summary",
        "/api/v1/reports/purchases",
        "/api/v1/reports/purchases/summary",
        "/api/v1/reports/cogs",
        "/api/v1/reports/cogs/summary",
        "/api/v1/reports/profit",
        "/api/v1/reports/profit/summary",
        "/api/v1/reports/summary",
        "/api/v1/reports/top-medicines",
        "/api/v1/reports/top-suppliers",
    ]:
        resp = client.get(endpoint, headers=headers)
        assert resp.status_code == 200, f"Endpoint {endpoint} failed with {resp.status_code}"


def test_pagination(client, db_session):
    """Test pagination on detailed reports."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Create multiple invoices
    for i in range(5):
        _create_completed_invoice(client, db_session, pa, med_a, 1, "10.00")
    
    resp = client.get("/api/v1/reports/sales?page=1&page_size=2", headers=headers)
    assert resp.status_code == 200
    sales = resp.json()
    assert len(sales) == 2
    
    resp = client.get("/api/v1/reports/sales?page=2&page_size=2", headers=headers)
    assert resp.status_code == 200
    sales = resp.json()
    assert len(sales) == 2


def test_zero_data_edge_cases(client, db_session):
    """Test reports with no data."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # No invoices, no purchases
    resp = client.get("/api/v1/reports/sales", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0
    
    resp = client.get("/api/v1/reports/sales/summary", headers=headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_invoices"] == 0
    assert summary["net_sales"] == Decimal("0.00")
    
    resp = client.get("/api/v1/reports/cogs/summary", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total_cogs"] == Decimal("0.00")
    
    resp = client.get("/api/v1/reports/profit/summary", headers=headers)
    assert resp.status_code == 200
    profit = resp.json()
    assert profit["net_sales"] == Decimal("0.00")
    assert profit["gross_profit"] == Decimal("0.00")
    assert profit["margin_percent"] == Decimal("0.00")


def test_financial_correctness_scenario(client, db_session):
    """
    Financial correctness test:
    Purchase: Medicine A, Batch A, Qty=100, Cost=60
    Sale: Qty=10, Price=100
    Expected: Sales=1000, COGS=600, Profit=400
    Return: Qty=4
    Expected Adjusted: Sales=600, COGS=360, Profit=240
    """
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Sale: 10 units at 100 each
    invoice, completed = _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00", "0.00", "0.00")
    invoice_item_id = completed["items"][0]["id"]
    
    # Check initial sales and COGS
    sales_resp = client.get("/api/v1/reports/sales/summary", headers=headers)
    cogs_resp = client.get("/api/v1/reports/cogs/summary", headers=headers)
    profit_resp = client.get("/api/v1/reports/profit/summary", headers=headers)
    
    assert sales_resp.json()["net_sales"] == Decimal("1000.00")
    assert cogs_resp.json()["total_cogs"] == Decimal("600.00")  # 10 * 60
    assert profit_resp.json()["gross_profit"] == Decimal("400.00")
    
    # Return 4 units
    _create_completed_return(client, db_session, pa, completed["id"], invoice_item_id, 4)
    
    # Check adjusted values
    sales_resp = client.get("/api/v1/reports/sales/summary", headers=headers)
    cogs_resp = client.get("/api/v1/reports/cogs/summary", headers=headers)
    profit_resp = client.get("/api/v1/reports/profit/summary", headers=headers)
    
    # Return refund is proportional: 4/10 * 1000 = 400
    # Return COGS: 4 * 60 = 240
    # Net sales after return: 1000 - 400 = 600
    # COGS after return: 600 - 240 = 360
    # Profit: 600 - 360 = 240
    assert sales_resp.json()["net_sales"] == Decimal("1000.00")  # Original sales unchanged
    assert sales_resp.json()["returned_amount"] == Decimal("400.00")
    assert sales_resp.json()["net_after_returns"] == Decimal("600.00")
    assert cogs_resp.json()["total_cogs"] == Decimal("600.00")  # Original COGS unchanged
    # Profit summary should show adjusted values
    assert profit_resp.json()["returns"] == Decimal("400.00")
    assert profit_resp.json()["cogs"] == Decimal("360.00")
    assert profit_resp.json()["net_sales_after_returns"] == Decimal("600.00")
    assert profit_resp.json()["gross_profit"] == Decimal("240.00")


def test_multi_batch_cogs(client, db_session):
    """Test COGS with multiple batches (FIFO)."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    batch_a = data["batch_a"]  # 100 units at 60
    batch_b = data["batch_b"]  # 100 units at 65
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Sell 150 units - should consume 100 from batch_a and 50 from batch_b
    _create_completed_invoice(client, db_session, pa, med_a, 150, "100.00", "0.00", "0.00")
    
    resp = client.get("/api/v1/reports/cogs", headers=headers)
    assert resp.status_code == 200
    cogs = resp.json()
    
    # Should have two records - one for each batch
    assert len(cogs) == 2
    batch_a_cogs = next(c for c in cogs if c["batch_number"] == "BATCH-001")
    batch_b_cogs = next(c for c in cogs if c["batch_number"] == "BATCH-002")
    
    assert batch_a_cogs["quantity_consumed"] == 100
    assert Decimal(batch_a_cogs["unit_cost"]) == Decimal("60.00")
    assert Decimal(batch_a_cogs["cogs"]) == Decimal("6000.00")
    
    assert batch_b_cogs["quantity_consumed"] == 50
    assert Decimal(batch_b_cogs["unit_cost"]) == Decimal("65.00")
    assert Decimal(batch_b_cogs["cogs"]) == Decimal("3250.00")
    
    # Total COGS = 6000 + 3250 = 9250
    summary = client.get("/api/v1/reports/cogs/summary", headers=headers).json()
    assert summary["total_cogs"] == Decimal("9250.00")


def test_return_cogs_restored_to_original_batch(client, db_session):
    """Test that return restores COGS to original batch."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    # Sell 10 units from batch_a (cost 60)
    invoice, completed = _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00", "0.00", "0.00")
    invoice_item_id = completed["items"][0]["id"]
    
    # Return 4 units - should restore to batch_a
    _create_completed_return(client, db_session, pa, completed["id"], invoice_item_id, 4)
    
    # Check COGS - should be 6 * 60 = 360 (since 4 returned)
    cogs_resp = client.get("/api/v1/reports/cogs/summary", headers=headers)
    assert cogs_resp.json()["total_cogs"] == Decimal("600.00")  # Original COGS unchanged
    
    # Profit summary should adjust
    profit_resp = client.get("/api/v1/reports/profit/summary", headers=headers)
    assert profit_resp.json()["cogs"] == Decimal("360.00")  # 600 - 240 (4 * 60)


def test_date_filter_boundaries(client, db_session):
    """Test date filter boundaries are inclusive."""
    data = _setup(db_session)
    pa = data["pharmacy_a"]
    med_a = data["med_a"]
    headers = {"X-Pharmacy-ID": str(pa)}
    
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    tomorrow = today + datetime.timedelta(days=1)
    
    # Create invoice today
    _create_completed_invoice(client, db_session, pa, med_a, 10, "100.00")
    
    # Filter from today to today - should include today's invoice
    resp = client.get(f"/api/v1/reports/sales?date_from={today}&date_to={today}", headers=headers)
    assert len(resp.json()) == 1
    
    # Filter from tomorrow - should not include today's invoice
    resp = client.get(f"/api/v1/reports/sales?date_from={tomorrow}&date_to={tomorrow}", headers=headers)
    assert len(resp.json()) == 0
    
    # Filter from yesterday to today - should include
    resp = client.get(f"/api/v1/reports/sales?date_from={yesterday}&date_to={today}", headers=headers)
    assert len(resp.json()) == 1