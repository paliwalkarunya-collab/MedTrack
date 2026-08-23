"""Integration tests for pharmacy-level settings and their access controls."""

import pytest
from app.core.security import get_password_hash
from app.models.membership import PharmacyMembership
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole


@pytest.fixture
def test_users(db_session):
    pharmacy_a = Pharmacy(name="Pharmacy A")
    pharmacy_b = Pharmacy(name="Pharmacy B")
    db_session.add_all([pharmacy_a, pharmacy_b])
    db_session.commit()

    users = {
        "admin": User(email="admin@test.com", hashed_password=get_password_hash("admin123"), role=UserRole.ADMIN, is_active="true"),
        "pharmacist": User(email="pharmacist@test.com", hashed_password=get_password_hash("pharmacist123"), role=UserRole.PHARMACIST, is_active="true"),
        "staff": User(email="staff@test.com", hashed_password=get_password_hash("staff123"), role=UserRole.STAFF, is_active="true"),
        "inactive": User(email="inactive@test.com", hashed_password=get_password_hash("inactive123"), role=UserRole.STAFF, is_active="false"),
    }
    db_session.add_all(users.values())
    db_session.commit()
    db_session.add_all([
        PharmacyMembership(user_id=users["admin"].id, pharmacy_id=pharmacy_a.id, status="active"),
        PharmacyMembership(user_id=users["admin"].id, pharmacy_id=pharmacy_b.id, status="active"),
        PharmacyMembership(user_id=users["pharmacist"].id, pharmacy_id=pharmacy_a.id, status="active"),
        PharmacyMembership(user_id=users["staff"].id, pharmacy_id=pharmacy_a.id, status="active"),
        PharmacyMembership(user_id=users["inactive"].id, pharmacy_id=pharmacy_a.id, status="active"),
    ])
    db_session.commit()
    return {**users, "pA": pharmacy_a, "pB": pharmacy_b}


def _token_for(client, email: str, password: str) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _headers(token: str, pharmacy_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Pharmacy-ID": str(pharmacy_id)}


def test_get_creates_default_settings_and_persists_updates(client, test_users):
    token = _token_for(client, "admin@test.com", "admin123")
    headers = _headers(token, test_users["pA"].id)

    response = client.get("/api/v1/settings/", headers=headers)
    assert response.status_code == 200
    assert response.json()["default_currency"] == "INR"
    assert response.json()["low_stock_threshold"] == 10

    response = client.patch(
        "/api/v1/settings/", headers=headers,
        json={"invoice_prefix": "MED", "low_stock_threshold": 4},
    )
    assert response.status_code == 200
    assert response.json()["invoice_prefix"] == "MED"

    response = client.get("/api/v1/settings/", headers=headers)
    assert response.status_code == 200
    assert response.json()["invoice_prefix"] == "MED"
    assert response.json()["low_stock_threshold"] == 4
    assert "pharmacy_id" not in response.json()


def test_settings_validation(client, test_users):
    token = _token_for(client, "admin@test.com", "admin123")
    headers = _headers(token, test_users["pA"].id)
    invalid_payloads = [
        {"email": "not-an-email"},
        {"phone": "not-a-phone"},
        {"default_currency": "rupee"},
        {"timezone": "Not/A-Timezone"},
        {"date_format": "MM/YYYY"},
        {"low_stock_threshold": -1},
        {"invoice_prefix": "   "},
    ]
    for payload in invalid_payloads:
        response = client.patch("/api/v1/settings/", headers=headers, json=payload)
        assert response.status_code == 422


def test_settings_requires_authentication_and_valid_membership(client, test_users, db_session):
    assert client.get("/api/v1/settings/").status_code == 401
    assert client.get(
        "/api/v1/settings/",
        headers={"Authorization": "Bearer invalid-token", "X-Pharmacy-ID": str(test_users["pA"].id)},
    ).status_code == 401

    staff_token = _token_for(client, "staff@test.com", "staff123")
    assert client.get("/api/v1/settings/", headers=_headers(staff_token, test_users["pB"].id)).status_code == 403

    membership = db_session.query(PharmacyMembership).filter(
        PharmacyMembership.user_id == test_users["staff"].id
    ).first()
    membership.status = "inactive"
    db_session.commit()
    assert client.get("/api/v1/settings/", headers=_headers(staff_token, test_users["pA"].id)).status_code == 403


def test_settings_rejects_inactive_users_and_pharmacies(client, test_users, db_session):
    # Inactive users cannot log in, so a previously issued token is represented by
    # deactivating an authenticated account after login.
    token = _token_for(client, "staff@test.com", "staff123")
    test_users["staff"].is_active = "false"
    db_session.commit()
    assert client.get("/api/v1/settings/", headers=_headers(token, test_users["pA"].id)).status_code == 403

    test_users["staff"].is_active = "true"
    test_users["pA"].is_active = False
    db_session.commit()
    assert client.get("/api/v1/settings/", headers=_headers(token, test_users["pA"].id)).status_code == 404


def test_only_admin_can_modify_settings_and_body_cannot_reassign_tenant(client, test_users):
    pharmacy_id = test_users["pA"].id
    for email, password in [("pharmacist@test.com", "pharmacist123"), ("staff@test.com", "staff123")]:
        token = _token_for(client, email, password)
        headers = _headers(token, pharmacy_id)
        assert client.get("/api/v1/settings/", headers=headers).status_code == 200
        assert client.patch("/api/v1/settings/", headers=headers, json={"invoice_prefix": "NO"}).status_code == 403

    admin_token = _token_for(client, "admin@test.com", "admin123")
    response = client.patch(
        "/api/v1/settings/", headers=_headers(admin_token, pharmacy_id),
        json={"pharmacy_id": str(test_users["pB"].id)},
    )
    assert response.status_code == 422


def test_settings_are_isolated_by_authenticated_pharmacy_context(client, test_users):
    admin_token = _token_for(client, "admin@test.com", "admin123")
    headers_a = _headers(admin_token, test_users["pA"].id)
    headers_b = _headers(admin_token, test_users["pB"].id)

    assert client.patch("/api/v1/settings/", headers=headers_a, json={"invoice_prefix": "A"}).status_code == 200
    assert client.patch("/api/v1/settings/", headers=headers_b, json={"invoice_prefix": "B"}).status_code == 200
    assert client.get("/api/v1/settings/", headers=headers_a).json()["invoice_prefix"] == "A"
    assert client.get("/api/v1/settings/", headers=headers_b).json()["invoice_prefix"] == "B"

    staff_token = _token_for(client, "staff@test.com", "staff123")
    assert client.get("/api/v1/settings/", headers=_headers(staff_token, test_users["pB"].id)).status_code == 403
    assert client.patch("/api/v1/settings/", headers=_headers(staff_token, test_users["pB"].id), json={"invoice_prefix": "X"}).status_code == 403
