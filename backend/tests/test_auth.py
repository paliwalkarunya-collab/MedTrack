import pytest
from uuid import uuid4
from app.models.pharmacy import Pharmacy
from app.models.membership import PharmacyMembership
from app.models.user import User, UserRole
from app.core.security import get_password_hash


@pytest.fixture
def test_pharmacies(db_session):
    pA = Pharmacy(name="Pharmacy A")
    pB = Pharmacy(name="Pharmacy B")
    db_session.add_all([pA, pB])
    db_session.commit()
    return pA, pB


@pytest.fixture
def test_users(db_session, test_pharmacies):
    pA, pB = test_pharmacies
    
    # Create users with different roles
    admin_user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active='true'
    )
    pharmacist_user = User(
        email="pharmacist@test.com",
        hashed_password=get_password_hash("pharmacist123"),
        full_name="Pharmacist User",
        role=UserRole.PHARMACIST,
        is_active='true'
    )
    staff_user = User(
        email="staff@test.com",
        hashed_password=get_password_hash("staff123"),
        full_name="Staff User",
        role=UserRole.STAFF,
        is_active='true'
    )
    inactive_user = User(
        email="inactive@test.com",
        hashed_password=get_password_hash("inactive123"),
        full_name="Inactive User",
        role=UserRole.STAFF,
        is_active='false'
    )
    
    db_session.add_all([admin_user, pharmacist_user, staff_user, inactive_user])
    db_session.commit()
    
    # Create memberships
    memberships = [
        PharmacyMembership(user_id=admin_user.id, pharmacy_id=pA.id, status='active'),
        PharmacyMembership(user_id=admin_user.id, pharmacy_id=pB.id, status='active'),
        PharmacyMembership(user_id=pharmacist_user.id, pharmacy_id=pA.id, status='active'),
        PharmacyMembership(user_id=staff_user.id, pharmacy_id=pA.id, status='active'),
        PharmacyMembership(user_id=inactive_user.id, pharmacy_id=pA.id, status='active'),
    ]
    db_session.add_all(memberships)
    db_session.commit()
    
    return {
        "admin": admin_user,
        "pharmacist": pharmacist_user,
        "staff": staff_user,
        "inactive": inactive_user,
        "pA": pA,
        "pB": pB
    }


def test_user_registration(client, db_session):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@test.com",
            "password": "password123",
            "full_name": "New User",
            "role": "staff"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "staff"
    assert "id" in data


def test_user_registration_duplicate_email(client, test_users):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@test.com",
            "password": "password123",
            "full_name": "Duplicate",
            "role": "staff"
        }
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_user_login_success(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@test.com",
            "password": "admin123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_user_login_wrong_password(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@test.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401


def test_user_login_inactive_user(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "inactive@test.com",
            "password": "inactive123"
        }
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"]


def test_get_current_user(client, test_users):
    # First login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    token = login_resp.json()["access_token"]
    
    # Get current user
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "admin"


def test_get_current_user_no_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_list_accessible_pharmacies(client, test_users):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    token = login_resp.json()["access_token"]
    
    response = client.get(
        "/api/v1/auth/pharmacies",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    pharmacy_names = [p["pharmacy_name"] for p in data]
    assert "Pharmacy A" in pharmacy_names
    assert "Pharmacy B" in pharmacy_names


def test_select_pharmacy_success(client, test_users):
    pA = test_users["pA"]
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "pharmacist@test.com", "password": "pharmacist123"}
    )
    token = login_resp.json()["access_token"]
    
    response = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pA.id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["pharmacy_id"] == str(pA.id)
    assert data["pharmacy_name"] == "Pharmacy A"


def test_select_pharmacy_no_membership(client, test_users):
    pB = test_users["pB"]
    # Staff user only has membership to pA
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@test.com", "password": "staff123"}
    )
    token = login_resp.json()["access_token"]
    
    response = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pB.id)}
    )
    assert response.status_code == 403
    assert "do not have access" in response.json()["detail"]


def test_select_pharmacy_inactive_pharmacy(client, test_users, db_session):
    pA = test_users["pA"]
    # Deactivate pharmacy
    pA.is_active = False
    db_session.commit()
    
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@test.com", "password": "staff123"}
    )
    token = login_resp.json()["access_token"]
    
    response = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pA.id)}
    )
    assert response.status_code == 404


def test_rbac_admin_access(client, test_users):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    token = login_resp.json()["access_token"]
    
    # Admin should be able to access all endpoints
    # Test with a pharmacy selection
    pA = test_users["pA"]
    select_resp = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pA.id)}
    )
    assert select_resp.status_code == 200
    
    # Try to create a medicine (requires staff role)
    # First create a category
    cat_resp = client.post(
        "/api/v1/medicines/categories/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Pharmacy-ID": str(pA.id)
        },
        json={"name": "Test Category"}
    )
    assert cat_resp.status_code == 201


def test_rbac_pharmacist_access(client, test_users):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "pharmacist@test.com", "password": "pharmacist123"}
    )
    token = login_resp.json()["access_token"]
    
    pA = test_users["pA"]
    select_resp = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pA.id)}
    )
    assert select_resp.status_code == 200
    
    # Pharmacist should have staff access
    cat_resp = client.post(
        "/api/v1/medicines/categories/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Pharmacy-ID": str(pA.id)
        },
        json={"name": "Pharmacist Category"}
    )
    assert cat_resp.status_code == 201


def test_rbac_staff_access(client, test_users):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@test.com", "password": "staff123"}
    )
    token = login_resp.json()["access_token"]
    
    pA = test_users["pA"]
    select_resp = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pA.id)}
    )
    assert select_resp.status_code == 200
    
    cat_resp = client.post(
        "/api/v1/medicines/categories/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Pharmacy-ID": str(pA.id)
        },
        json={"name": "Staff Category"}
    )
    assert cat_resp.status_code == 201


def test_tenant_isolation_with_auth(client, test_users, db_session):
    pA = test_users["pA"]
    pB = test_users["pB"]
    
    # Admin creates category in Pharmacy A
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    token = login_resp.json()["access_token"]
    
    client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pA.id)}
    )
    
    cat_resp = client.post(
        "/api/v1/medicines/categories/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Pharmacy-ID": str(pA.id)
        },
        json={"name": "Category A"}
    )
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["id"]
    
    # Try to access from Pharmacy B context
    client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pB.id)}
    )
    
    get_resp = client.get(
        f"/api/v1/medicines/categories/{cat_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Pharmacy-ID": str(pB.id)
        }
    )
    assert get_resp.status_code == 404


def test_x_pharmacy_id_header_still_works_for_dev(client, test_users):
    """
    Test that X-Pharmacy-ID header still works for backward compatibility
    when used with valid authentication.
    """
    pA = test_users["pA"]
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@test.com", "password": "staff123"}
    )
    token = login_resp.json()["access_token"]
    
    # Use X-Pharmacy-ID header with auth
    cat_resp = client.post(
        "/api/v1/medicines/categories/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Pharmacy-ID": str(pA.id)
        },
        json={"name": "Header Category"}
    )
    assert cat_resp.status_code == 201


def test_cross_pharmacy_access_denied(client, test_users):
    pA = test_users["pA"]
    pB = test_users["pB"]
    
    # Staff user only has access to pA
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@test.com", "password": "staff123"}
    )
    token = login_resp.json()["access_token"]
    
    # Try to select pB (no membership)
    response = client.post(
        "/api/v1/auth/select-pharmacy",
        headers={"Authorization": f"Bearer {token}"},
        json={"pharmacy_id": str(pB.id)}
    )
    assert response.status_code == 403


def test_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401


def test_expired_token(client, test_users):
    # This test would require manipulating token expiration
    # For now, we just verify invalid tokens are rejected
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"}
    )
    assert response.status_code == 401