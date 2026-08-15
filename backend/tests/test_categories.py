import pytest
from app.models.pharmacy import Pharmacy
from app.tenancy.tenant_context import set_current_pharmacy_id

def test_category_crud_and_isolation(client, db_session):
    # Setup two pharmacies
    pA = Pharmacy(name="Pharm A")
    pB = Pharmacy(name="Pharm B")
    db_session.add_all([pA, pB])
    db_session.commit()

    # 1. Test creation in Pharm A
    response_A1 = client.post(
        "/api/v1/medicines/categories/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Antibiotics", "description": "Fights bacteria"}
    )
    assert response_A1.status_code == 201
    cat_A1_id = response_A1.json()["id"]

    # Test duplicate name within same pharmacy rejected
    response_A2_dup = client.post(
        "/api/v1/medicines/categories/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Antibiotics"}
    )
    assert response_A2_dup.status_code == 400

    # 2. Test creation in Pharm B (Same name across different pharmacies allowed)
    response_B1 = client.post(
        "/api/v1/medicines/categories/",
        headers={"X-Pharmacy-ID": str(pB.id)},
        json={"name": "Antibiotics"}
    )
    assert response_B1.status_code == 201
    cat_B1_id = response_B1.json()["id"]

    # 3. Test listing isolated to tenant
    resp_list_A = client.get("/api/v1/medicines/categories/", headers={"X-Pharmacy-ID": str(pA.id)})
    assert len(resp_list_A.json()) == 1
    assert resp_list_A.json()[0]["id"] == cat_A1_id

    # 4. Test cross-tenant ID access
    # Pharm A tries to access Pharm B's category
    resp_get_cross = client.get(f"/api/v1/medicines/categories/{cat_B1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_get_cross.status_code == 404

    resp_patch_cross = client.patch(
        f"/api/v1/medicines/categories/{cat_B1_id}",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Hacked"}
    )
    assert resp_patch_cross.status_code == 404

    resp_delete_cross = client.delete(f"/api/v1/medicines/categories/{cat_B1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_delete_cross.status_code == 404

    # 5. Test update and delete (soft deactivate) in correct tenant
    resp_update = client.patch(
        f"/api/v1/medicines/categories/{cat_A1_id}",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Super Antibiotics"}
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["name"] == "Super Antibiotics"

    resp_delete = client.delete(f"/api/v1/medicines/categories/{cat_A1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_delete.status_code == 200
    assert resp_delete.json()["is_active"] is False
    
    # 5.b Verify soft deleted category is NOT returned in GET /list
    resp_list_A_after_del = client.get("/api/v1/medicines/categories/", headers={"X-Pharmacy-ID": str(pA.id)})
    assert len(resp_list_A_after_del.json()) == 0
    
    # 5.c Verify soft deleted category is NOT returned in GET /{id}
    resp_get_after_del = client.get(f"/api/v1/medicines/categories/{cat_A1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_get_after_del.status_code == 404

    # 6. No tenant context test
    resp_no_tenant = client.get("/api/v1/medicines/categories/")
    assert resp_no_tenant.status_code == 400 # Dependent on how dependency throws, if it throws 401 or TenantContextRequired (500)
    # The dependency get_tenant_context throws 401 if X-Pharmacy-ID is missing.
