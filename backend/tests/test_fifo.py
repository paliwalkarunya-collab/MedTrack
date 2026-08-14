import pytest
import uuid
import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.medicine import Medicine
from app.models.inventory_batch import InventoryBatch
from app.models.stock_allocation import StockAllocation
from app.models.pharmacy import Pharmacy
from app.services.fifo_service import FIFOService
from app.tenancy.tenant_context import set_current_pharmacy_id, TenantContextRequired

@pytest.fixture
def current_pharmacy(db_session: Session):
    pharm = Pharmacy(name="Current Pharmacy", email="current@example.com")
    db_session.add(pharm)
    db_session.commit()
    return pharm

@pytest.fixture
def fifo_medicine(db_session: Session, current_pharmacy: Pharmacy):
    med = Medicine(
        name="FIFO Test Med",
        is_active=True,
        pharmacy_id=current_pharmacy.id
    )
    db_session.add(med)
    db_session.commit()
    return med

@pytest.fixture
def other_pharmacy(db_session: Session):
    pharm = Pharmacy(name="Other Pharmacy", email="other@example.com")
    db_session.add(pharm)
    db_session.commit()
    return pharm

@pytest.fixture
def db(db_session: Session, current_pharmacy: Pharmacy):
    set_current_pharmacy_id(current_pharmacy.id)
    yield db_session
    set_current_pharmacy_id(None)

def test_fifo_basic_allocation(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    # Batch A = 100, earlier expiry
    batch_a = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_A",
        quantity=100,
        expiry_date=datetime.date.today() + datetime.timedelta(days=30),
        is_active=True
    )
    # Batch B = 100, later expiry
    batch_b = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_B",
        quantity=100,
        expiry_date=datetime.date.today() + datetime.timedelta(days=60),
        is_active=True
    )
    db.add_all([batch_a, batch_b])
    db.commit()
    
    result = FIFOService.allocate_stock(db, fifo_medicine.id, 150)
    db.commit()
    
    assert result["allocated_quantity"] == 150
    
    db.refresh(batch_a)
    db.refresh(batch_b)
    
    assert batch_a.quantity == 0
    assert batch_b.quantity == 50
    
    allocations = db.scalars(select(StockAllocation).where(StockAllocation.medicine_id == fifo_medicine.id)).all()
    assert len(allocations) == 2
    
    a_alloc = next(a for a in allocations if a.inventory_batch_id == batch_a.id)
    b_alloc = next(a for a in allocations if a.inventory_batch_id == batch_b.id)
    
    assert a_alloc.quantity == 100
    assert b_alloc.quantity == 50

def test_fifo_single_batch(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    batch_a = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_A",
        quantity=100,
        is_active=True
    )
    db.add(batch_a)
    db.commit()
    
    FIFOService.allocate_stock(db, fifo_medicine.id, 40)
    db.commit()
    
    db.refresh(batch_a)
    assert batch_a.quantity == 60

def test_fifo_exact_stock(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    batch_a = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_A",
        quantity=100,
        is_active=True
    )
    db.add(batch_a)
    db.commit()
    
    FIFOService.allocate_stock(db, fifo_medicine.id, 100)
    db.commit()
    
    db.refresh(batch_a)
    assert batch_a.quantity == 0

def test_fifo_insufficient_stock(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    batch_a = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_A",
        quantity=50,
        is_active=True
    )
    batch_b = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_B",
        quantity=25,
        is_active=True
    )
    db.add_all([batch_a, batch_b])
    db.commit()
    
    with pytest.raises(HTTPException) as excinfo:
        FIFOService.allocate_stock(db, fifo_medicine.id, 100)
    
    assert excinfo.value.status_code == 400
    db.rollback()
    
    db.refresh(batch_a)
    db.refresh(batch_b)
    assert batch_a.quantity == 50
    assert batch_b.quantity == 25
    
    allocations = db.scalars(select(StockAllocation).where(StockAllocation.medicine_id == fifo_medicine.id)).all()
    assert len(allocations) == 0

def test_fifo_expired_batch(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    # Expired batch
    batch_a = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_A",
        quantity=100,
        expiry_date=datetime.date.today() - datetime.timedelta(days=1),
        is_active=True
    )
    # Valid batch
    batch_b = InventoryBatch(
        medicine_id=fifo_medicine.id,
        pharmacy_id=current_pharmacy.id,
        batch_number="BATCH_B",
        quantity=100,
        expiry_date=datetime.date.today() + datetime.timedelta(days=30),
        is_active=True
    )
    db.add_all([batch_a, batch_b])
    db.commit()
    
    FIFOService.allocate_stock(db, fifo_medicine.id, 50)
    db.commit()
    
    db.refresh(batch_a)
    db.refresh(batch_b)
    
    assert batch_a.quantity == 100 # untouched
    assert batch_b.quantity == 50  # consumed

def test_fifo_multiple_batches(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    b1 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B1", quantity=30, expiry_date=datetime.date.today() + datetime.timedelta(days=10))
    b2 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B2", quantity=20, expiry_date=datetime.date.today() + datetime.timedelta(days=20))
    b3 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B3", quantity=100, expiry_date=datetime.date.today() + datetime.timedelta(days=30))
    
    db.add_all([b1, b2, b3])
    db.commit()
    
    FIFOService.allocate_stock(db, fifo_medicine.id, 80)
    db.commit()
    
    db.refresh(b1)
    db.refresh(b2)
    db.refresh(b3)
    
    assert b1.quantity == 0
    assert b2.quantity == 0
    assert b3.quantity == 70

def test_fifo_deterministic_ordering(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    today = datetime.date.today()
    
    # UUIDs where id1 < id2 alphabetically
    id1 = uuid.UUID('11111111-1111-1111-1111-111111111111')
    id2 = uuid.UUID('22222222-2222-2222-2222-222222222222')
    
    # Batch A: expiry today+30
    b1 = InventoryBatch(id=id1, medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B1", quantity=100, expiry_date=today + datetime.timedelta(days=30))
    # Batch B: expiry today+30, created at same time
    b2 = InventoryBatch(id=id2, medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B2", quantity=100, expiry_date=today + datetime.timedelta(days=30))

    db.add(b1)
    db.commit()
    db.add(b2)
    db.commit()
    
    res = FIFOService.allocate_stock(db, fifo_medicine.id, 150)
    db.commit()
    
    assert res["allocations"][0]["batch_id"] == b1.id
    assert res["allocations"][0]["quantity"] == 100
    assert res["allocations"][1]["batch_id"] == b2.id
    assert res["allocations"][1]["quantity"] == 50

def test_fifo_null_expiry_ordering(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    # Valid explicit date
    b1 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B1", quantity=100, expiry_date=datetime.date.today() + datetime.timedelta(days=30))
    # NULL expiry
    b2 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B2", quantity=100, expiry_date=None)
    
    # Add b2 first so created_at is earlier, testing that NULL logic overrides created_at
    db.add(b2)
    db.commit()
    db.add(b1)
    db.commit()
    
    res = FIFOService.allocate_stock(db, fifo_medicine.id, 150)
    db.commit()
    
    # b1 (explicit expiry) must be consumed fully first
    assert res["allocations"][0]["batch_id"] == b1.id
    assert res["allocations"][0]["quantity"] == 100
    # b2 (NULL expiry) consumed second
    assert res["allocations"][1]["batch_id"] == b2.id
    assert res["allocations"][1]["quantity"] == 50

def test_fifo_tenant_isolation(db: Session, current_pharmacy: Pharmacy, other_pharmacy: Pharmacy, fifo_medicine: Medicine):
    # current_pharmacy has 100
    b1 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B1", quantity=100)
    # other_pharmacy has 100
    b2 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=other_pharmacy.id, batch_number="B2", quantity=100)
    db.add_all([b1, b2])
    db.commit()
    
    # current_pharmacy requests 150 -> should fail, it can't access B2
    with pytest.raises(HTTPException) as excinfo:
        FIFOService.allocate_stock(db, fifo_medicine.id, 150)
    
    assert excinfo.value.status_code == 400
    assert "only 100 available" in excinfo.value.detail
    db.rollback()

def test_fifo_inactive_batch(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine):
    b1 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B1", quantity=100, is_active=False)
    b2 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B2", quantity=100, is_active=True)
    db.add_all([b1, b2])
    db.commit()
    
    res = FIFOService.allocate_stock(db, fifo_medicine.id, 50)
    db.commit()
    
    assert res["allocations"][0]["batch_id"] == b2.id

def test_fifo_no_tenant(db: Session, fifo_medicine: Medicine):
    set_current_pharmacy_id(None)
    with pytest.raises(TenantContextRequired):
        FIFOService.allocate_stock(db, fifo_medicine.id, 10)

def test_fifo_zero_negative_quantity(db: Session, fifo_medicine: Medicine):
    with pytest.raises(HTTPException) as excinfo:
        FIFOService.allocate_stock(db, fifo_medicine.id, 0)
    assert excinfo.value.status_code == 400
    
    with pytest.raises(HTTPException) as excinfo:
        FIFOService.allocate_stock(db, fifo_medicine.id, -5)
    assert excinfo.value.status_code == 400

def test_fifo_atomic_rollback(db: Session, current_pharmacy: Pharmacy, fifo_medicine: Medicine, monkeypatch):
    b1 = InventoryBatch(medicine_id=fifo_medicine.id, pharmacy_id=current_pharmacy.id, batch_number="B1", quantity=100)
    db.add(b1)
    db.commit()
    
    # Monkeypatch to force an exception during allocation loop
    original_add = db.add
    def fake_add(obj):
        if isinstance(obj, StockAllocation):
            raise Exception("Forced error during allocation")
        original_add(obj)
        
    monkeypatch.setattr(db, "add", fake_add)
    
    with pytest.raises(Exception, match="Forced error during allocation"):
        FIFOService.allocate_stock(db, fifo_medicine.id, 50)
    db.rollback()
    
    db.refresh(b1)
    assert b1.quantity == 100
    assert db.scalars(select(StockAllocation)).first() is None
