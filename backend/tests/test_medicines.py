import pytest
from app.models.pharmacy import Pharmacy
from app.models.medicine_category import MedicineCategory

def test_medicine_crud_and_isolation(client, db_session):
    pA = Pharmacy(name="Pharm A")
    pB = Pharmacy(name="Pharm B")
    db_session.add_all([pA, pB])
    db_session.commit()

    # Seed categories manually for speed
    catA = MedicineCategory(pharmacy_id=pA.id, name="Cat A")
    catB = MedicineCategory(pharmacy_id=pB.id, name="Cat B")
    db_session.add_all([catA, catB])
    db_session.flush() # Flush to get IDs without expiring them
    
    catA_id = str(catA.id)
    catB_id = str(catB.id)
    db_session.commit()

    # 1. Test creation in Pharm A
    response_A1 = client.post(
        "/api/v1/medicines/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Paracetamol", "category_id": catA_id, "barcode": "12345"}
    )
    assert response_A1.status_code == 201
    med_A1_id = response_A1.json()["id"]

    # Duplicate barcode within same pharmacy
    response_dup = client.post(
        "/api/v1/medicines/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Aspirin", "barcode": "12345"}
    )
    assert response_dup.status_code == 400

    # Same barcode in different pharmacy allowed
    response_B1 = client.post(
        "/api/v1/medicines/",
        headers={"X-Pharmacy-ID": str(pB.id)},
        json={"name": "Paracetamol", "barcode": "12345"}
    )
    assert response_B1.status_code == 201

    # 2. Test cross-tenant category relationship validation
    # Pharm A tries to create medicine using Pharm B's category
    response_cross_cat = client.post(
        "/api/v1/medicines/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"name": "Invalid Med", "category_id": catB_id}
    )
    assert response_cross_cat.status_code == 404 # get_category fails due to ORM isolation

    # Pharm A tries to UPDATE existing medicine to Pharm B's category
    response_cross_update = client.patch(
        f"/api/v1/medicines/{med_A1_id}",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"category_id": catB_id}
    )
    assert response_cross_update.status_code == 404

    # 3. Test listing isolated to tenant
    resp_list_B = client.get("/api/v1/medicines/", headers={"X-Pharmacy-ID": str(pB.id)})
    assert len(resp_list_B.json()) == 1
    assert resp_list_B.json()[0]["name"] == "Paracetamol"

    # 4. Test cross-tenant access and modification
    resp_get_cross = client.get(f"/api/v1/medicines/{med_A1_id}", headers={"X-Pharmacy-ID": str(pB.id)})
    assert resp_get_cross.status_code == 404

    resp_patch_cross = client.patch(
        f"/api/v1/medicines/{med_A1_id}",
        headers={"X-Pharmacy-ID": str(pB.id)},
        json={"name": "Hacked"}
    )
    assert resp_patch_cross.status_code == 404

    resp_del_cross = client.delete(f"/api/v1/medicines/{med_A1_id}", headers={"X-Pharmacy-ID": str(pB.id)})
    assert resp_del_cross.status_code == 404

    # 5. Soft delete medicine in correct tenant
    resp_delete = client.delete(f"/api/v1/medicines/{med_A1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_delete.status_code == 200
    assert resp_delete.json()["is_active"] is False

    # 5.b Verify soft deleted medicine is NOT returned in GET /list
    resp_list_A_after_del = client.get("/api/v1/medicines/", headers={"X-Pharmacy-ID": str(pA.id)})
    assert len(resp_list_A_after_del.json()) == 0

    # 5.c Verify soft deleted medicine is NOT returned in GET /{id}
    resp_get_after_del = client.get(f"/api/v1/medicines/{med_A1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_get_after_del.status_code == 404

    # 6. Tenant isolation for inactive records
    # Pharmacy B tries to access Pharmacy A's soft-deleted record
    resp_get_inactive_cross = client.get(f"/api/v1/medicines/{med_A1_id}", headers={"X-Pharmacy-ID": str(pB.id)})
    assert resp_get_inactive_cross.status_code == 404
