import pytest
from decimal import Decimal

from app.models.pharmacy import Pharmacy
from app.models.medicine import Medicine
from app.models.supplier import Supplier
from app.models.inventory_batch import InventoryBatch
from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem

def test_purchase_crud_and_receiving(client, db_session):
    pA = Pharmacy(name="Pharm A")
    pB = Pharmacy(name="Pharm B")
    db_session.add_all([pA, pB])
    db_session.flush()
    pA_id = pA.id
    pB_id = pB.id
    
    # Create medicines
    medA1 = Medicine(pharmacy_id=pA_id, name="Med A1")
    medA2 = Medicine(pharmacy_id=pA_id, name="Med A2")
    medB1 = Medicine(pharmacy_id=pB_id, name="Med B1")
    medInactive = Medicine(pharmacy_id=pA_id, name="Inactive Med", is_active=False)
    db_session.add_all([medA1, medA2, medB1, medInactive])
    
    # Create suppliers
    supA1 = Supplier(pharmacy_id=pA_id, name="Supplier A1")
    supB1 = Supplier(pharmacy_id=pB_id, name="Supplier B1")
    supInactive = Supplier(pharmacy_id=pA_id, name="Inactive Supplier", is_active=False)
    db_session.add_all([supA1, supB1, supInactive])
    db_session.flush()
    
    medA1_id = medA1.id
    medA2_id = medA2.id
    medB1_id = medB1.id
    medInactive_id = medInactive.id
    supA1_id = supA1.id
    supB1_id = supB1.id
    supInactive_id = supInactive.id
    
    headers_A = {"X-Pharmacy-ID": str(pA_id)}
    headers_B = {"X-Pharmacy-ID": str(pB_id)}
    db_session.commit()
    
    # 1. Test inactive supplier prevention
    purchase_invalid_sup = {
        "supplier_id": str(supInactive_id),
        "items": [
            {
                "medicine_id": str(medA1_id),
                "batch_number": "BATCH1",
                "quantity": 100,
                "purchase_price": 10
            }
        ]
    }
    resp = client.post("/api/v1/purchases/", headers=headers_A, json=purchase_invalid_sup)
    assert resp.status_code == 400
    
    # 2. Test cross-tenant supplier prevention
    purchase_cross_sup = {
        "supplier_id": str(supB1_id),
        "items": [
            {
                "medicine_id": str(medA1_id),
                "batch_number": "BATCH1",
                "quantity": 100,
                "purchase_price": 10
            }
        ]
    }
    resp = client.post("/api/v1/purchases/", headers=headers_A, json=purchase_cross_sup)
    assert resp.status_code == 404
    
    # 3. Test cross-tenant medicine prevention
    purchase_cross_med = {
        "supplier_id": str(supA1_id),
        "items": [
            {
                "medicine_id": str(medB1_id),
                "batch_number": "BATCH1",
                "quantity": 100,
                "purchase_price": 10
            }
        ]
    }
    resp = client.post("/api/v1/purchases/", headers=headers_A, json=purchase_cross_med)
    assert resp.status_code == 404
    
    # 4. Test inactive medicine prevention
    purchase_inactive_med = {
        "supplier_id": str(supA1_id),
        "items": [
            {
                "medicine_id": str(medInactive_id),
                "batch_number": "BATCH1",
                "quantity": 100,
                "purchase_price": 10
            }
        ]
    }
    resp = client.post("/api/v1/purchases/", headers=headers_A, json=purchase_inactive_med)
    assert resp.status_code == 400
    
    # 5. Create valid purchase with multiple items and verify totals
    valid_purchase = {
        "supplier_id": str(supA1_id),
        "invoice_number": "INV-101",
        "items": [
            {
                "medicine_id": str(medA1_id),
                "batch_number": "BATCH-1",
                "quantity": 10,
                "purchase_price": 5.0, # 50
                "discount_amount": 5.0, # line_total = 45
                "gst_percentage": 10.0 # gst = 4.5
            },
            {
                "medicine_id": str(medA2_id),
                "batch_number": "BATCH-2",
                "quantity": 20,
                "purchase_price": 2.0, # 40
                "discount_amount": 0, # line_total = 40
                "gst_percentage": 5.0 # gst = 2.0
            }
        ]
    }
    
    resp = client.post("/api/v1/purchases/", headers=headers_A, json=valid_purchase)
    assert resp.status_code == 201
    purch_data = resp.json()
    purch_id = purch_data["id"]
    
    assert purch_data["status"] == "DRAFT"
    assert float(purch_data["subtotal"]) == 85.0 # 45 + 40
    assert float(purch_data["tax_amount"]) == 6.5 # 4.5 + 2.0
    assert float(purch_data["total_amount"]) == 91.5
    assert float(purch_data["discount_amount"]) == 5.0
    
    # 6. Delete behavior (DRAFT -> CANCELLED)
    resp = client.delete(f"/api/v1/purchases/{purch_id}", headers=headers_A)
    assert resp.status_code == 200
    assert resp.json()["status"] == "CANCELLED"
    
    # Try receiving cancelled
    resp = client.post(f"/api/v1/purchases/{purch_id}/receive", headers=headers_A)
    assert resp.status_code == 400
    
    # 7. Rollback behavior
    purch_rb = client.post("/api/v1/purchases/", headers=headers_A, json={
        "supplier_id": str(supA1_id),
        "items": [
            {
                "medicine_id": str(medA1_id),
                "batch_number": "B-RB1",
                "quantity": 100,
                "purchase_price": 10
            },
            {
                "medicine_id": str(medA2_id),
                "batch_number": "B-RB2",
                "quantity": 100,
                "purchase_price": 10
            }
        ]
    }).json()
    
    from app.tenancy.tenant_context import set_current_pharmacy_id
    
    # Break medA2
    set_current_pharmacy_id(pA_id)
    medA2.is_active = False
    db_session.commit()
    set_current_pharmacy_id(None)
    
    # Try receive - should fail on medA2 validation
    resp = client.post(f"/api/v1/purchases/{purch_rb['id']}/receive", headers=headers_A)
    assert resp.status_code == 400
    
    # Verify no inventory was created for medA1 (rollback successful)
    resp = client.get("/api/v1/medicines/batches/", headers=headers_A)
    batches = resp.json()
    assert not any(b["batch_number"] == "B-RB1" for b in batches)
    
    # Fix medA2
    set_current_pharmacy_id(pA_id)
    medA2.is_active = True
    db_session.commit()
    set_current_pharmacy_id(None)
    
    # 8. Successful Receiving & Idempotency
    resp = client.post(f"/api/v1/purchases/{purch_rb['id']}/receive", headers=headers_A)
    assert resp.status_code == 200
    assert resp.json()["status"] == "RECEIVED"
    
    # Check inventory is created
    resp = client.get("/api/v1/medicines/batches/", headers=headers_A)
    batches = resp.json()
    b1 = next(b for b in batches if b["batch_number"] == "B-RB1")
    assert b1["quantity"] == 100
    
    # Try receiving again - must fail
    resp = client.post(f"/api/v1/purchases/{purch_rb['id']}/receive", headers=headers_A)
    assert resp.status_code == 400
    
    # 9. Verify deleting a received purchase is rejected
    resp = client.delete(f"/api/v1/purchases/{purch_rb['id']}", headers=headers_A)
    assert resp.status_code == 400
    
    # 10. Verify receiving a purchase with existing batch adds to quantity
    purch2 = client.post("/api/v1/purchases/", headers=headers_A, json={
        "supplier_id": str(supA1_id),
        "items": [
            {
                "medicine_id": str(medA1_id),
                "batch_number": "B-RB1", # Same batch
                "quantity": 50,
                "purchase_price": 10
            }
        ]
    }).json()
    
    resp = client.post(f"/api/v1/purchases/{purch2['id']}/receive", headers=headers_A)
    assert resp.status_code == 200
    
    # Find batch list again to verify quantity is added
    resp = client.get(f"/api/v1/medicines/batches/", headers=headers_A)
    batches = resp.json()
    b1_updated = next(b for b in batches if b["batch_number"] == "B-RB1")
    assert b1_updated["quantity"] == 150 # 100 + 50
