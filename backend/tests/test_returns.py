import datetime
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.models.inventory_batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.pharmacy import Pharmacy
from app.models.stock_allocation import StockAllocation
from app.models.return_model import Return
from app.models.return_item import ReturnItem
from app.models.return_allocation import ReturnAllocation
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


def _create_completed_invoice(client, db_session, pharmacy_id, medicine_id, quantity=150, unit_price="10.00", discount="5.00", tax="2.00"):
    """Helper to create and complete an invoice."""
    headers = {"X-Pharmacy-ID": str(pharmacy_id)}
    response = client.post("/api/v1/invoices/", headers=headers, json={
        "invoice_number": f"INV-{uuid.uuid4().hex[:8]}",
        "items": [{"medicine_id": str(medicine_id), "quantity": quantity,
                   "unit_price": unit_price, "discount_amount": discount, "tax_amount": tax}],
    })
    assert response.status_code == 201
    invoice = response.json()
    complete = client.post(f"/api/v1/invoices/{invoice['id']}/complete", headers=headers)
    assert complete.status_code == 200
    return invoice, complete.json()


def test_create_return_draft(client, db_session):
    """Test creating a DRAFT return."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 150)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id,
        "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}],
        "reason": "Customer returned damaged goods"
    })
    assert response.status_code == 201
    ret = response.json()
    assert ret["status"] == "DRAFT"
    assert ret["return_number"].startswith("RET-")
    assert ret["refund_amount"] == "0.00"
    assert len(ret["items"]) == 1
    assert ret["items"][0]["quantity"] == 50


def test_complete_return_partial(client, db_session):
        """Test completing a partial return and verify stock restoration to original batches."""
        pa, _, med, _, a, b = _setup(db_session)
        headers = {"X-Pharmacy-ID": str(pa)}
        invoice, completed = _create_completed_invoice(client, db_session, pa, med, 150)
        invoice_id = completed["id"]
        invoice_item_id = completed["items"][0]["id"]

        # Create return for 50 units (partial)
        response = client.post("/api/v1/returns/", headers=headers, json={
            "invoice_id": invoice_id,
            "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}],
            "reason": "Partial return"
        })
        assert response.status_code == 201
        ret = response.json()
        return_id = ret["id"]

        # Complete the return
        complete = client.post(f"/api/v1/returns/{return_id}/complete", headers=headers)
        assert complete.status_code == 200
        completed_ret = complete.json()
        assert completed_ret["status"] == "COMPLETED"
        assert Decimal(completed_ret["refund_amount"]) > 0

        # Verify stock restored to original batches (FIFO order: batch A then batch B)
        set_current_pharmacy_id(pa)
        db_session.refresh(a); db_session.refresh(b)
        # Original sale consumed 100 from batch A, 50 from batch B
        # Return 50 should restore to batch A first (FIFO order)
        assert a.quantity == 50  # Was 0, restored 50
        assert b.quantity == 50  # Was 50, unchanged

        # Verify return allocations trace to original stock allocations
        # Use API to get return with items (avoids joinedload tenant filtering issue in test context)
        get_resp = client.get(f"/api/v1/returns/{return_id}", headers=headers)
        return_item_id = uuid.UUID(get_resp.json()["items"][0]["id"])
        allocations = db_session.scalars(select(ReturnAllocation).where(ReturnAllocation.return_item_id == return_item_id)).all()
        assert len(allocations) == 1
        assert allocations[0].quantity == 50
        # Should point to the first stock allocation (batch A)
        orig_alloc = db_session.scalars(select(StockAllocation).where(StockAllocation.id == allocations[0].stock_allocation_id)).first()
        assert orig_alloc.inventory_batch_id == a.id


def test_complete_return_full(client, db_session):
    """Test completing a full return restoring all stock."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 150)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    # Create return for full 150
    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id,
        "items": [{"invoice_item_id": invoice_item_id, "quantity": 150}],
    })
    return_id = response.json()["id"]

    complete = client.post(f"/api/v1/returns/{return_id}/complete", headers=headers)
    assert complete.status_code == 200

    # Verify all stock restored
    set_current_pharmacy_id(pa)
    db_session.refresh(a); db_session.refresh(b)
    assert a.quantity == 100
    assert b.quantity == 100


def test_partial_then_another_partial(client, db_session):
    """Test multiple partial returns on same invoice item."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    # First partial return: 30
    r1 = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 30}]
    })
    client.post(f"/api/v1/returns/{r1.json()['id']}/complete", headers=headers)

    # Second partial return: 40
    r2 = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 40}]
    })
    client.post(f"/api/v1/returns/{r2.json()['id']}/complete", headers=headers)

    # Third partial return: 30 (completes full 100)
    r3 = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 30}]
    })
    client.post(f"/api/v1/returns/{r3.json()['id']}/complete", headers=headers)

    set_current_pharmacy_id(pa)
    db_session.refresh(a); db_session.refresh(b)
    assert a.quantity == 100
    assert b.quantity == 100


def test_return_exceeds_sold_quantity_rejected(client, db_session):
    """Test that returning more than sold quantity is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 50)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id,
        "items": [{"invoice_item_id": invoice_item_id, "quantity": 51}]
    })
    assert response.status_code == 400


def test_return_exceeds_remaining_returnable_rejected(client, db_session):
    """Test that returning more than remaining returnable is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    # First return 60
    r1 = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 60}]
    })
    client.post(f"/api/v1/returns/{r1.json()['id']}/complete", headers=headers)

    # Try to return 50 more (only 40 remaining)
    r2 = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}]
    })
    assert r2.status_code == 400


def test_zero_quantity_rejected(client, db_session):
    """Test that zero quantity is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 50)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 0}]
    })
    assert response.status_code == 422  # validation error


def test_negative_quantity_rejected(client, db_session):
    """Test that negative quantity is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 50)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": -10}]
    })
    assert response.status_code == 422


def test_unknown_invoice_rejected(client, db_session):
    """Test that unknown invoice is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}

    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": str(uuid.uuid4()),
        "items": [{"invoice_item_id": str(uuid.uuid4()), "quantity": 10}]
    })
    assert response.status_code == 404


def test_draft_invoice_rejected(client, db_session):
    """Test that DRAFT invoice cannot be returned."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    response = client.post("/api/v1/invoices/", headers=headers, json={
        "invoice_number": "DRAFT-1", "items": [{"medicine_id": str(med), "quantity": 10, "unit_price": "1"}]
    })
    draft_invoice = response.json()

    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": draft_invoice["id"],
        "items": [{"invoice_item_id": draft_invoice["items"][0]["id"], "quantity": 5}]
    })
    assert response.status_code == 400


def test_invoice_item_not_in_invoice_rejected(client, db_session):
    """Test that invoice item from different invoice is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice1, _ = _create_completed_invoice(client, db_session, pa, med, 50)
    invoice2, completed2 = _create_completed_invoice(client, db_session, pa, med, 50)

    # Try to return item from invoice2 on invoice1
    response = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice1["id"],
        "items": [{"invoice_item_id": completed2["items"][0]["id"], "quantity": 10}]
    })
    assert response.status_code == 404


def test_cancel_completed_return_rejected(client, db_session):
    """Test that COMPLETED return cannot be cancelled/modified."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}]
    })
    client.post(f"/api/v1/returns/{r.json()['id']}/complete", headers=headers)

    # Try to cancel completed return
    cancel = client.patch(f"/api/v1/returns/{r.json()['id']}", headers=headers)
    assert cancel.status_code == 400


def test_complete_draft_return_twice_rejected(client, db_session):
    """Test that completing a return twice is rejected."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}]
    })
    return_id = r.json()["id"]
    client.post(f"/api/v1/returns/{return_id}/complete", headers=headers)

    # Try to complete again
    complete2 = client.post(f"/api/v1/returns/{return_id}/complete", headers=headers)
    assert complete2.status_code == 400


def test_list_returns(client, db_session):
    """Test listing returns."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 10}]
    })
    client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 20}]
    })

    response = client.get("/api/v1/returns/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_return(client, db_session):
    """Test getting a single return."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 10}]
    })
    return_id = r.json()["id"]

    response = client.get(f"/api/v1/returns/{return_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == return_id


def test_tenant_isolation_returns(client, db_session):
    """Test that pharmacy A cannot access pharmacy B's returns."""
    pa, pb, med_a, med_b, batch_a, batch_b = _setup(db_session)
    a_headers = {"X-Pharmacy-ID": str(pa)}
    b_headers = {"X-Pharmacy-ID": str(pb)}

    invoice_a, completed_a = _create_completed_invoice(client, db_session, pa, med_a, 100)
    r = client.post("/api/v1/returns/", headers=a_headers, json={
        "invoice_id": invoice_a["id"], "items": [{"invoice_item_id": completed_a["items"][0]["id"], "quantity": 10}]
    })
    return_id = r.json()["id"]

    # Pharmacy B cannot access
    response = client.get(f"/api/v1/returns/{return_id}", headers=b_headers)
    assert response.status_code == 404

    # Pharmacy B cannot create return for pharmacy A's invoice
    response = client.post("/api/v1/returns/", headers=b_headers, json={
        "invoice_id": invoice_a["id"], "items": [{"invoice_item_id": completed_a["items"][0]["id"], "quantity": 10}]
    })
    assert response.status_code == 404


def test_unauthenticated_denied(client, db_session):
        """Test that unauthenticated requests are denied (missing X-Pharmacy-ID header returns 400)."""
        pa, _, med, _, a, b = _setup(db_session)
        invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)

        response = client.post("/api/v1/returns/", json={
            "invoice_id": invoice["id"], "items": [{"invoice_item_id": completed["items"][0]["id"], "quantity": 10}]
        })
        assert response.status_code == 400  # Missing X-Pharmacy-ID header


def test_refund_calculation_based_on_original_invoice(client, db_session):
    """Test refund is calculated from original invoice prices, not current prices."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}

    # Create invoice with specific pricing
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100, unit_price="25.00", discount="5.00", tax="2.00")
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}]
    })
    complete = client.post(f"/api/v1/returns/{r.json()['id']}/complete", headers=headers)
    assert complete.status_code == 200

    # Refund should be based on original: 50 * 25 - (5 * 0.5) + (2 * 0.5) = 1250 - 2.5 + 1 = 1248.5
    # Actually proportional: line_total was (100*25 - 5 + 2) = 2497, so 50/100 = 0.5 => 1248.5
    refund = Decimal(complete.json()["refund_amount"])
    assert refund == Decimal("1248.50")


def test_return_allocations_trace_to_original_batches(client, db_session):
        """Test that return allocations correctly trace to original stock allocations and batches."""
        pa, _, med, _, a, b = _setup(db_session)
        headers = {"X-Pharmacy-ID": str(pa)}
        invoice, completed = _create_completed_invoice(client, db_session, pa, med, 120)
        invoice_id = completed["id"]
        invoice_item_id = completed["items"][0]["id"]

        # Sale consumed 100 from batch A, 20 from batch B (total 120)
        # Return 100 should restore 100 to batch A (FIFO order)
        r = client.post("/api/v1/returns/", headers=headers, json={
            "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 100}]
        })
        return_id = r.json()["id"]
        complete = client.post(f"/api/v1/returns/{return_id}/complete", headers=headers)
        assert complete.status_code == 200

        set_current_pharmacy_id(pa)
        db_session.refresh(a); db_session.refresh(b)

        # Batch A should have 100 restored (was 0), Batch B unchanged (was 80)
        assert a.quantity == 100
        assert b.quantity == 80

        # Verify return allocation points to batch A's stock allocation
        get_resp = client.get(f"/api/v1/returns/{return_id}", headers=headers)
        return_item_id = uuid.UUID(get_resp.json()["items"][0]["id"])
        allocs = db_session.scalars(select(ReturnAllocation).where(ReturnAllocation.return_item_id == return_item_id)).all()
        assert len(allocs) == 1
        assert allocs[0].quantity == 100
        sa = db_session.scalars(select(StockAllocation).where(StockAllocation.id == allocs[0].stock_allocation_id)).first()
        assert sa.inventory_batch_id == a.id


def test_multiple_items_partial_return(client, db_session):
        """Test return with multiple invoice items, returning only one."""
        pa, _, med_a_id, _, batch_a, _ = _setup(db_session)
        headers = {"X-Pharmacy-ID": str(pa)}

        # Add second medicine
        set_current_pharmacy_id(pa)
        med_b = Medicine(pharmacy_id=pa, name="Med B")
        db_session.add(med_b)
        db_session.flush()
        batch_b = InventoryBatch(pharmacy_id=pa, medicine_id=med_b.id, batch_number="B1", quantity=50,
                                 expiry_date=datetime.date.today() + datetime.timedelta(days=10))
        db_session.add(batch_b)
        db_session.commit()
        med_b_id = med_b.id

        # Create invoice with both items
        response = client.post("/api/v1/invoices/", headers=headers, json={
            "invoice_number": f"INV-{uuid.uuid4().hex[:8]}",
            "items": [
                {"medicine_id": str(med_a_id), "quantity": 50, "unit_price": "10.00", "discount_amount": "0", "tax_amount": "1.00"},
                {"medicine_id": str(med_b_id), "quantity": 30, "unit_price": "20.00", "discount_amount": "0", "tax_amount": "2.00"},
            ],
        })
        invoice = response.json()
        client.post(f"/api/v1/invoices/{invoice['id']}/complete", headers=headers)
        completed = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers).json()
        item_a_id = completed["items"][0]["id"]
        item_b_id = completed["items"][1]["id"]

        # Return only med_a (partial)
        r = client.post("/api/v1/returns/", headers=headers, json={
            "invoice_id": completed["id"],
            "items": [{"invoice_item_id": item_a_id, "quantity": 20}]
        })
        complete = client.post(f"/api/v1/returns/{r.json()['id']}/complete", headers=headers)
        assert complete.status_code == 200

        # Only med_a stock should be restored
        set_current_pharmacy_id(pa)
        db_session.refresh(batch_a); db_session.refresh(batch_b)
        assert batch_a.quantity == 70  # Was 50 (after selling 50 of 100), restored 20 = 70
        assert batch_b.quantity == 20  # Was 20 (after selling 30 of 50), unchanged (0 returned)


def test_cancel_draft_return(client, db_session):
    """Test cancelling a DRAFT return."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 50}]
    })
    return_id = r.json()["id"]

    # Cancel the draft
    cancel = client.patch(f"/api/v1/returns/{return_id}", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "CANCELLED"

    # Stock should not be restored (still at post-completion levels)
    set_current_pharmacy_id(pa)
    db_session.refresh(a); db_session.refresh(b)
    assert a.quantity == 0
    assert b.quantity == 100


def test_return_invoice_fully_returned_tracking(client, db_session):
    """Test that full return can be detected via quantities."""
    pa, _, med, _, a, b = _setup(db_session)
    headers = {"X-Pharmacy-ID": str(pa)}
    invoice, completed = _create_completed_invoice(client, db_session, pa, med, 100)
    invoice_id = completed["id"]
    invoice_item_id = completed["items"][0]["id"]

    r = client.post("/api/v1/returns/", headers=headers, json={
        "invoice_id": invoice_id, "items": [{"invoice_item_id": invoice_item_id, "quantity": 100}]
    })
    client.post(f"/api/v1/returns/{r.json()['id']}/complete", headers=headers)

    # Verify via list
    response = client.get(f"/api/v1/returns/?invoice_id={invoice_id}", headers=headers)
    returns = response.json()
    total_returned = sum(item["quantity"] for ret in returns for item in ret["items"])
    assert total_returned == 100