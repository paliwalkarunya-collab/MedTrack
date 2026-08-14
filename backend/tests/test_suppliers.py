import pytest
from app.models.supplier import Supplier

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

def test_create_supplier(client, supplier_data: dict, db_session):
    # Mocking pharmacy_headers, let's use the same way test_inventory_batches does
    # First, create a pharmacy
    from app.models.pharmacy import Pharmacy
    pA = Pharmacy(name="Pharm A")
    db_session.add(pA)
    db_session.flush()
    pA_id = str(pA.id)
    db_session.commit()
    
    headers = {"X-Pharmacy-ID": pA_id}
    response = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == supplier_data["name"]
    assert "id" in data
    assert data["is_active"] == True

def test_list_suppliers(client, supplier_data: dict, db_session):
    from app.models.pharmacy import Pharmacy
    pA = Pharmacy(name="Pharm A")
    db_session.add(pA)
    db_session.commit()
    headers = {"X-Pharmacy-ID": str(pA.id)}
    
    client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    
    response = client.get("/api/v1/suppliers/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(s["name"] == supplier_data["name"] for s in data)

def test_get_supplier(client, supplier_data: dict, db_session):
    from app.models.pharmacy import Pharmacy
    pA = Pharmacy(name="Pharm A")
    db_session.add(pA)
    db_session.commit()
    headers = {"X-Pharmacy-ID": str(pA.id)}
    
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    supplier_id = create_resp.json()["id"]
    
    response = client.get(f"/api/v1/suppliers/{supplier_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == supplier_id

def test_update_supplier(client, supplier_data: dict, db_session):
    from app.models.pharmacy import Pharmacy
    pA = Pharmacy(name="Pharm A")
    db_session.add(pA)
    db_session.commit()
    headers = {"X-Pharmacy-ID": str(pA.id)}
    
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    supplier_id = create_resp.json()["id"]
    
    update_data = {"name": "Updated Supplier Name"}
    response = client.patch(f"/api/v1/suppliers/{supplier_id}", json=update_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Supplier Name"

def test_soft_delete_supplier(client, supplier_data: dict, db_session):
    from app.models.pharmacy import Pharmacy
    pA = Pharmacy(name="Pharm A")
    db_session.add(pA)
    db_session.commit()
    headers = {"X-Pharmacy-ID": str(pA.id)}
    
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers)
    supplier_id = create_resp.json()["id"]
    
    del_resp = client.delete(f"/api/v1/suppliers/{supplier_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] == False
    
    # Inactive supplier should be hidden from list
    list_resp = client.get("/api/v1/suppliers/", headers=headers)
    assert list_resp.status_code == 200
    assert not any(s["id"] == supplier_id for s in list_resp.json())

def test_tenant_isolation_suppliers(client, supplier_data: dict, db_session):
    from app.models.pharmacy import Pharmacy
    pA = Pharmacy(name="Pharm A")
    pB = Pharmacy(name="Pharm B")
    db_session.add_all([pA, pB])
    db_session.flush()
    pA_id = str(pA.id)
    pB_id = str(pB.id)
    db_session.commit()
    
    headers_A = {"X-Pharmacy-ID": pA_id}
    headers_B = {"X-Pharmacy-ID": pB_id}
    
    # Create in A
    create_resp = client.post("/api/v1/suppliers/", json=supplier_data, headers=headers_A)
    supplier_id = create_resp.json()["id"]
    
    # Try to access from B
    get_resp = client.get(f"/api/v1/suppliers/{supplier_id}", headers=headers_B)
    assert get_resp.status_code == 404
    
    list_resp = client.get("/api/v1/suppliers/", headers=headers_B)
    assert not any(s["id"] == supplier_id for s in list_resp.json())
