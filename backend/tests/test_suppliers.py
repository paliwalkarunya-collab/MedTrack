import pytest
from app.models.supplier import Supplier
from app.models.pharmacy import Pharmacy
from app.models.membership import PharmacyMembership
from app.models.user import User, UserRole
from app.core.security import get_password_hash


@pytest.fixture
def supplier_data():
    return {
        "name": "Test Supplier",
        "contact_person": "John Doe",
        "phone": "1234567890",
        "email": "test@supplier.com",
        "address": "123 Test St",
        "gstin": "22AAAAA0000A1Z5",
        "drug_license": "DL-12345"
    }


@pytest.fixture
def auth_headers(client, db_session):
    """Create a test user with pharmacy memberships and return auth headers."""
    pA = Pharmacy(name="Pharm A")
    pB = Pharmacy(name="Pharm B")
    db_session.add_all([pA, pB])
    db_session.commit()
    
    user = User(
        email="test@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        role=UserRole.STAFF,
        is_active='true'
    )
    db_session.add(user)
    db_session.commit()
    
    memberships = [
        PharmacyMembership(user_id=user.id, pharmacy_id=pA.id, status='active'),
        PharmacyMembership(user_id=user.id, pharmacy_id=pB.id, status='active'),
    ]
    db_session.add_all(memberships)
    db_session.commit()
    
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "test@test.com", "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    
    return {
        "token": token,
        "pA": pA,
        "pB": pB,
        "user": user
    }


def get_headers(token, pharmacy_id):
    return {"Authorization": f"Bearer {token}", "X-Pharmacy-ID": str(pharmacy_id)}


def test_create_supplier(client, supplier_data: dict, db_session, auth_headers):
    token = auth_headers["token"]
    pA = auth_headers["pA"]
    headers = get_headers(token, pA.id)
    response = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == supplier_data["name"]
    assert "id" in data
    assert data["is_active"] == True

def test_list_suppliers(client, supplier_data: dict, db_session, auth_headers):
    token = auth_headers["token"]
    pA = auth_headers["pA"]
    headers = get_headers(token, pA.id)
    
    client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    
    response = client.get("/api/v1/suppliers/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(s["name"] == supplier_data["name"] for s in data)

def test_get_supplier(client, supplier_data: dict, db_session, auth_headers):
    token = auth_headers["token"]
    pA = auth_headers["pA"]
    headers = get_headers(token, pA.id)
    
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    supplier_id = create_resp.json()["id"]
    
    response = client.get(f"/api/v1/suppliers/{supplier_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == supplier_id

def test_update_supplier(client, supplier_data: dict, db_session, auth_headers):
    token = auth_headers["token"]
    pA = auth_headers["pA"]
    headers = get_headers(token, pA.id)
    
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    supplier_id = create_resp.json()["id"]
    
    update_data = {"name": "Updated Supplier Name"}
    response = client.patch(f"/api/v1/suppliers/{supplier_id}", json=update_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Supplier Name"

def test_soft_delete_supplier(client, supplier_data: dict, db_session, auth_headers):
    token = auth_headers["token"]
    pA = auth_headers["pA"]
    headers = get_headers(token, pA.id)
    
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    supplier_id = create_resp.json()["id"]
    
    del_resp = client.delete(f"/api/v1/suppliers/{supplier_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] == False
    
    # Inactive supplier should be hidden from list
    list_resp = client.get("/api/v1/suppliers/", headers=headers)
    assert list_resp.status_code == 200
    assert not any(s["id"] == supplier_id for s in list_resp.json())

def test_tenant_isolation_suppliers(client, supplier_data: dict, db_session, auth_headers):
    token = auth_headers["token"]
    pA = auth_headers["pA"]
    pB = auth_headers["pB"]
    headers_A = get_headers(token, pA.id)
    headers_B = get_headers(token, pB.id)
    
    # Create in A
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers_A)
    supplier_id = create_resp.json()["id"]
    
    # Try to access from B
    get_resp = client.get(f"/api/v1/suppliers/{supplier_id}", headers=headers_B)
    assert get_resp.status_code == 404
    
    list_resp = client.get("/api/v1/suppliers/", headers=headers_B)
    assert not any(s["id"] == supplier_id for s in list_resp.json())
