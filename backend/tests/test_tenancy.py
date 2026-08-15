import pytest
import uuid
from sqlalchemy import Column, String
from app.models.pharmacy import Pharmacy
from app.models.membership import PharmacyMembership
from app.tenancy.mixins import TenantModelMixin
from app.models.base import Base
from app.tenancy.tenant_context import set_current_pharmacy_id, get_current_pharmacy_id, reset_current_pharmacy_id
from sqlalchemy.exc import IntegrityError

# Dummy tenant-owned model strictly for isolation testing
class DummyMedicine(TenantModelMixin, Base):
    __tablename__ = 'dummy_medicines'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)

def test_pharmacy_creation(db_session):
    p1 = Pharmacy(name="Pharmacy A")
    p2 = Pharmacy(name="Pharmacy B")
    
    db_session.add(p1)
    db_session.add(p2)
    db_session.commit()
    
    assert p1.id is not None
    assert p2.id is not None
    assert p1.id != p2.id

def test_membership_creation_and_duplicates(db_session):
    p1 = Pharmacy(name="Pharmacy A")
    db_session.add(p1)
    db_session.commit()
    
    user_id = uuid.uuid4()
    
    # Create valid membership
    m1 = PharmacyMembership(user_id=user_id, pharmacy_id=p1.id)
    db_session.add(m1)
    db_session.commit()
    
    # Attempt duplicate membership
    m2 = PharmacyMembership(user_id=user_id, pharmacy_id=p1.id)
    db_session.add(m2)
    with pytest.raises(IntegrityError):
        db_session.commit()

def test_tenant_context():
    tenant_id = uuid.uuid4()
    token = set_current_pharmacy_id(tenant_id)
    
    assert get_current_pharmacy_id() == tenant_id
    
    # We can reset or change it
    tenant2_id = uuid.uuid4()
    set_current_pharmacy_id(tenant2_id)
    assert get_current_pharmacy_id() == tenant2_id

def test_automatic_data_isolation(db_session):
    # This test verifies that the SQLAlchemy do_orm_execute event automatically
    # filters queries when a tenant context is set, and raises an error if missing.
    Base.metadata.create_all(bind=db_session.get_bind())
    
    pA = Pharmacy(name="A")
    pB = Pharmacy(name="B")
    db_session.add_all([pA, pB])
    db_session.commit()
    
    # Create dummy records
    mA1 = DummyMedicine(id="a1", name="Med A1", pharmacy_id=pA.id)
    mA2 = DummyMedicine(id="a2", name="Med A2", pharmacy_id=pA.id)
    mB1 = DummyMedicine(id="b1", name="Med B1", pharmacy_id=pB.id)
    
    db_session.add_all([mA1, mA2, mB1])
    db_session.commit()
    
    # 1. Simulate tenant context A
    token_A = set_current_pharmacy_id(pA.id)
    
    # Query all WITHOUT manually adding a filter
    records_A = db_session.query(DummyMedicine).all()
    assert len(records_A) == 2
    assert all(r.pharmacy_id == pA.id for r in records_A)
    
    # Verify Tenant A cannot update Tenant B's record
    # Trying to query B's record directly will return None because of the filter
    b1_queried_by_a = db_session.query(DummyMedicine).filter(DummyMedicine.id == "b1").first()
    assert b1_queried_by_a is None
    
    # 2. Simulate tenant context B
    token_B = set_current_pharmacy_id(pB.id)
    
    records_B = db_session.query(DummyMedicine).all()
    assert len(records_B) == 1
    assert all(r.pharmacy_id == pB.id for r in records_B)
    
    # 3. Simulate missing context by explicitly setting to None
    # since we want to clear the context completely
    set_current_pharmacy_id(None)
    
    # Trying to query tenant-owned models without a context must raise TenantContextRequired
    with pytest.raises(Exception) as exc:
        db_session.query(DummyMedicine).all()
    assert "Tenant context is required" in str(exc.value)

    # 4. Non-tenant models should still work without context
    pharmacies = db_session.query(Pharmacy).all()
    assert len(pharmacies) >= 2
