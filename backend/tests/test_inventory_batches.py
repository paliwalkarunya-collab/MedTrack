import pytest
from app.models.pharmacy import Pharmacy
from app.models.medicine import Medicine

def test_inventory_batch_crud_and_isolation(client, db_session):
    pA = Pharmacy(name="Pharm A")
    pB = Pharmacy(name="Pharm B")
    db_session.add_all([pA, pB])
    db_session.commit()

    medA = Medicine(pharmacy_id=pA.id, name="Med A")
    medB = Medicine(pharmacy_id=pB.id, name="Med B")
    db_session.add_all([medA, medB])
    db_session.flush() # Flush to get IDs without expiring them
    
    medA_id = str(medA.id)
    medB_id = str(medB.id)
    db_session.commit()

    # 1. Test creation in Pharm A
    response_A1 = client.post(
        "/api/v1/medicines/batches/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"medicine_id": medA_id, "batch_number": "B001", "quantity": 100}
    )
    assert response_A1.status_code == 201
    batch_A1_id = response_A1.json()["id"]

    # Duplicate batch number for same medicine within same pharmacy
    response_dup = client.post(
        "/api/v1/medicines/batches/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"medicine_id": medA_id, "batch_number": "B001", "quantity": 50}
    )
    assert response_dup.status_code == 400

    # Same batch number in different pharmacy allowed
    response_B1 = client.post(
        "/api/v1/medicines/batches/",
        headers={"X-Pharmacy-ID": str(pB.id)},
        json={"medicine_id": medB_id, "batch_number": "B001", "quantity": 200}
    )
    assert response_B1.status_code == 201
    batch_B1_id = response_B1.json()["id"]

    # Multiple batches for same medicine
    response_A2 = client.post(
        "/api/v1/medicines/batches/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"medicine_id": medA_id, "batch_number": "B002", "quantity": 50}
    )
    assert response_A2.status_code == 201

    # 2. Test cross-tenant medicine relationship validation
    response_cross_med = client.post(
        "/api/v1/medicines/batches/",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"medicine_id": medB_id, "batch_number": "B003", "quantity": 10}
    )
    assert response_cross_med.status_code == 404 # get_medicine fails

    # 3. Test listing isolated to tenant
    resp_list_A = client.get("/api/v1/medicines/batches/", headers={"X-Pharmacy-ID": str(pA.id)})
    assert len(resp_list_A.json()) == 2

    # 4. Test cross-tenant access and modification
    resp_get_cross = client.get(f"/api/v1/medicines/batches/{batch_B1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_get_cross.status_code == 404

    resp_patch_cross = client.patch(
        f"/api/v1/medicines/batches/{batch_B1_id}",
        headers={"X-Pharmacy-ID": str(pA.id)},
        json={"quantity": 999}
    )
    assert resp_patch_cross.status_code == 404

    resp_del_cross = client.delete(f"/api/v1/medicines/batches/{batch_B1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_del_cross.status_code == 404

    # 5. Soft delete batch in correct tenant
    resp_delete = client.delete(f"/api/v1/medicines/batches/{batch_A1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_delete.status_code == 200
    assert resp_delete.json()["is_active"] is False

    # 5.b Verify soft deleted batch is NOT returned in GET /list
    # Note: list previously returned 2 batches (batch_A1_id and batch_A2_id)
    resp_list_A_after_del = client.get("/api/v1/medicines/batches/", headers={"X-Pharmacy-ID": str(pA.id)})
    assert len(resp_list_A_after_del.json()) == 1

    # 5.c Verify soft deleted batch is NOT returned in GET /{id}
    resp_get_after_del = client.get(f"/api/v1/medicines/batches/{batch_A1_id}", headers={"X-Pharmacy-ID": str(pA.id)})
    assert resp_get_after_del.status_code == 404

    # 6. Tenant isolation for inactive records
    resp_get_inactive_cross = client.get(f"/api/v1/medicines/batches/{batch_A1_id}", headers={"X-Pharmacy-ID": str(pB.id)})
    assert resp_get_inactive_cross.status_code == 404
