import datetime
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.pharmacy import Pharmacy
from app.models.stock_allocation import StockAllocation
from app.tenancy.tenant_context import set_current_pharmacy_id


def _setup(db):
    pharmacy_a, pharmacy_b = Pharmacy(name="A"), Pharmacy(name="B")
    db.add_all([pharmacy_a, pharmacy_b])
    db.flush()
    med_a = Medicine(pharmacy_id=pharmacy_a.id, name="A medicine")
    med_b = Medicine(pharmacy_id=pharmacy_b.id, name="B medicine")
    db.add_all([med_a, med_b])
    db.flush()
    batch_a = InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=med_a.id, batch_number="A", quantity=100,
                             expiry_date=datetime.date.today() + datetime.timedelta(days=10))
    batch_b = InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=med_a.id, batch_number="B", quantity=100,
                             expiry_date=datetime.date.today() + datetime.timedelta(days=20))
    db.add_all([batch_a, batch_b])
    pharmacy_a_id, pharmacy_b_id, med_a_id, med_b_id = pharmacy_a.id, pharmacy_b.id, med_a.id, med_b.id
    db.commit()
    return pharmacy_a_id, pharmacy_b_id, med_a_id, med_b_id, batch_a, batch_b


def test_invoice_completion_fifo_and_double_completion(client, db_session):
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    response = client.post("/api/v1/invoices/", headers=headers, json={
        "invoice_number": "SALE-1", "items": [{"medicine_id": str(med), "quantity": 150,
        "unit_price": "10.00", "discount_amount": "5.00", "tax_amount": "2.00"}],
    })
    assert response.status_code == 201
    invoice = response.json()
    assert Decimal(invoice["subtotal"]) == Decimal("1495.00")
    assert Decimal(invoice["total_amount"]) == Decimal("1497.00")
    updated = client.patch(f"/api/v1/invoices/{invoice['id']}", headers=headers, json={"notes": "counter sale"})
    assert updated.status_code == 200
    assert updated.json()["notes"] == "counter sale"
    assert len(client.get("/api/v1/invoices/?invoice_number=SALE", headers=headers).json()) == 1
    complete = client.post(f"/api/v1/invoices/{invoice['id']}/complete", headers=headers)
    assert complete.status_code == 200
    assert complete.json()["status"] == "COMPLETED"
    set_current_pharmacy_id(pa)
    db_session.refresh(a); db_session.refresh(b)
    assert (a.quantity, b.quantity) == (0, 50)
    allocations = db_session.scalars(select(StockAllocation).where(StockAllocation.invoice_id == uuid.UUID(invoice["id"]))).all()
    assert sorted(x.quantity for x in allocations) == [50, 100]
    assert client.post(f"/api/v1/invoices/{invoice['id']}/complete", headers=headers).status_code == 400
    assert client.delete(f"/api/v1/invoices/{invoice['id']}", headers=headers).status_code == 400


def test_billing_rollback_and_tenant_customer_isolation(client, db_session):
    pa, pb, med_a, med_b, batch_a, batch_b = _setup(db_session)
    a_headers, b_headers = {"X-Pharmacy-ID": str(pa)}, {"X-Pharmacy-ID": str(pb)}
    customer = client.post("/api/v1/invoices/customers", headers=a_headers, json={"name": "Alice", "phone": "1"})
    assert customer.status_code == 201
    assert client.post("/api/v1/invoices/", headers=b_headers, json={"customer_id": customer.json()["id"], "items": [
        {"medicine_id": str(med_b), "quantity": 1, "unit_price": "1"}]}).status_code == 404
    draft = client.post("/api/v1/invoices/", headers=a_headers, json={"items": [
        {"medicine_id": str(med_a), "quantity": 10, "unit_price": "1"},
        {"medicine_id": str(med_a), "quantity": 1000, "unit_price": "1"},
    ]})
    assert draft.status_code == 201
    assert client.post(f"/api/v1/invoices/{draft.json()['id']}/complete", headers=a_headers).status_code == 400
    set_current_pharmacy_id(pa)
    db_session.refresh(batch_a); db_session.refresh(batch_b)
    assert (batch_a.quantity, batch_b.quantity) == (100, 100)
    assert not db_session.scalars(select(StockAllocation).where(StockAllocation.invoice_id == uuid.UUID(draft.json()["id"]))).all()
    assert client.get(f"/api/v1/invoices/{draft.json()['id']}", headers=b_headers).status_code == 404
    assert client.delete(f"/api/v1/invoices/{draft.json()['id']}", headers=a_headers).json()["status"] == "CANCELLED"
