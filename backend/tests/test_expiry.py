from datetime import date, timedelta

import pytest

from app.core.security import get_password_hash
from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.membership import PharmacyMembership
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole
from app.tenancy.tenant_context import set_current_pharmacy_id


@pytest.fixture
def expiry_data(db_session):
    pharmacy_a, pharmacy_b = Pharmacy(name="A"), Pharmacy(name="B")
    admin = User(email="expiry-admin@test.com", hashed_password=get_password_hash("password123"), role=UserRole.ADMIN, is_active="true")
    staff = User(email="expiry-staff@test.com", hashed_password=get_password_hash("password123"), role=UserRole.STAFF, is_active="true")
    db_session.add_all([pharmacy_a, pharmacy_b, admin, staff])
    db_session.commit()
    db_session.add_all([
        PharmacyMembership(user_id=admin.id, pharmacy_id=pharmacy_a.id, status="active"),
        PharmacyMembership(user_id=admin.id, pharmacy_id=pharmacy_b.id, status="active"),
        PharmacyMembership(user_id=staff.id, pharmacy_id=pharmacy_a.id, status="active"),
    ])
    db_session.commit()
    today = date.today()
    set_current_pharmacy_id(pharmacy_a.id)
    medicine = Medicine(pharmacy_id=pharmacy_a.id, name="A medicine")
    medicine_b = Medicine(pharmacy_id=pharmacy_b.id, name="B medicine")
    db_session.add_all([medicine, medicine_b])
    db_session.commit()
    db_session.add_all([
        InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=medicine.id, batch_number="expired", expiry_date=today - timedelta(days=1), quantity=2),
        InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=medicine.id, batch_number="critical", expiry_date=today + timedelta(days=7), quantity=3),
        InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=medicine.id, batch_number="soon", expiry_date=today + timedelta(days=8), quantity=4),
        InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=medicine.id, batch_number="safe", expiry_date=today + timedelta(days=91), quantity=5),
        InventoryBatch(pharmacy_id=pharmacy_a.id, medicine_id=medicine.id, batch_number="no-date", expiry_date=None, quantity=1),
        InventoryBatch(pharmacy_id=pharmacy_b.id, medicine_id=medicine_b.id, batch_number="b-only", expiry_date=today - timedelta(days=1), quantity=99),
    ])
    db_session.commit()
    return {"a": pharmacy_a, "b": pharmacy_b, "admin": admin, "staff": staff, "medicine": medicine}


def _token(client):
    return client.post("/api/v1/auth/login", json={"email": "expiry-admin@test.com", "password": "password123"}).json()["access_token"]


def _headers(token, pharmacy):
    return {"Authorization": f"Bearer {token}", "X-Pharmacy-ID": str(pharmacy.id)}


def test_expiry_statuses_summary_and_filters(client, expiry_data):
    token = _token(client)
    headers = _headers(token, expiry_data["a"])
    response = client.get("/api/v1/expiry/", headers=headers)
    assert response.status_code == 200
    assert {item["expiry_status"] for item in response.json()["items"]} == {"EXPIRED", "CRITICAL", "EXPIRING_SOON", "SAFE"}
    assert response.json()["total"] == 5
    assert client.get("/api/v1/expiry/expired", headers=headers).json()["total"] == 1
    assert client.get("/api/v1/expiry/expiring-soon", headers=headers).json()["total"] == 2
    summary = client.get("/api/v1/expiry/summary", headers=headers).json()
    assert summary["expired_batch_count"] == 1 and summary["critical_batch_count"] == 1
    assert client.get("/api/v1/expiry/", headers=headers, params={"status": "SAFE", "limit": 1}).json()["total"] == 2


def test_alerts_are_tenant_isolated_and_read_only(client, expiry_data):
    token = _token(client)
    headers_a = _headers(token, expiry_data["a"])
    alerts = client.get("/api/v1/alerts/", headers=headers_a)
    assert alerts.status_code == 200
    assert all(alert["medicine_name"] == "A medicine" for alert in alerts.json())
    assert client.get("/api/v1/alerts/low-stock", headers=headers_a).status_code == 200
    assert client.get("/api/v1/alerts/summary", headers=headers_a).status_code == 200
    assert client.get("/api/v1/expiry/", headers=_headers(token, expiry_data["b"])).json()["total"] == 1


def test_expiry_requires_authenticated_membership(client, expiry_data):
    assert client.get("/api/v1/expiry/").status_code == 401
    token = _token(client)
    assert client.get("/api/v1/expiry/", headers=_headers(token, expiry_data["a"])).status_code == 200
    staff_token = client.post("/api/v1/auth/login", json={"email": "expiry-staff@test.com", "password": "password123"}).json()["access_token"]
    assert client.get("/api/v1/alerts/", headers=_headers(staff_token, expiry_data["b"])).status_code == 403
