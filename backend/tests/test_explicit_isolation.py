import pytest
import uuid
from sqlalchemy import Column, String
from app.models.pharmacy import Pharmacy
from app.tenancy.mixins import TenantModelMixin
from app.models.base import Base
from app.tenancy.tenant_context import set_current_pharmacy_id, get_current_pharmacy_id, reset_current_pharmacy_id, TenantContextRequired

class DummyTenantModel(TenantModelMixin, Base):
    __tablename__ = 'dummy_tenant_models'
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)

def test_update_isolation(db_session):
    Base.metadata.create_all(bind=db_session.get_bind())
    
    pA = Pharmacy(name="A")
    pB = Pharmacy(name="B")
    db_session.add_all([pA, pB])
    db_session.commit()
    
    record_b = DummyTenantModel(id="b1", name="Original B", pharmacy_id=pB.id)
    db_session.add(record_b)
    db_session.commit()
    
    # Set context to A
    token = set_current_pharmacy_id(pA.id)
    
    # Attempt ORM update
    db_session.query(DummyTenantModel).filter(DummyTenantModel.id == "b1").update({"name": "Hacked by A"})
    db_session.commit()
    
    # Switch context to B to verify
    reset_current_pharmacy_id(token)
    set_current_pharmacy_id(pB.id)
    
    b_record_check = db_session.query(DummyTenantModel).filter(DummyTenantModel.id == "b1").first()
    assert b_record_check.name == "Original B", "Record was cross-tenant updated!"

def test_delete_isolation(db_session):
    Base.metadata.create_all(bind=db_session.get_bind())
    
    pA = Pharmacy(name="A")
    pB = Pharmacy(name="B")
    db_session.add_all([pA, pB])
    db_session.commit()
    
    record_b = DummyTenantModel(id="b1", name="Delete Me", pharmacy_id=pB.id)
    db_session.add(record_b)
    db_session.commit()
    
    # Set context to A
    token = set_current_pharmacy_id(pA.id)
    
    # Attempt ORM delete
    db_session.query(DummyTenantModel).filter(DummyTenantModel.id == "b1").delete()
    db_session.commit()
    
    # Switch context to B to verify
    reset_current_pharmacy_id(token)
    set_current_pharmacy_id(pB.id)
    
    b_record_check = db_session.query(DummyTenantModel).filter(DummyTenantModel.id == "b1").first()
    assert b_record_check is not None, "Record was cross-tenant deleted!"

def test_no_tenant_behavior(db_session):
    Base.metadata.create_all(bind=db_session.get_bind())
    
    # No context set (ensure cleared from previous synchronous tests)
    set_current_pharmacy_id(None)
    
    with pytest.raises(TenantContextRequired):
        db_session.query(DummyTenantModel).all()
        
    with pytest.raises(TenantContextRequired):
        db_session.query(DummyTenantModel).update({"name": "Test"})

    with pytest.raises(TenantContextRequired):
        db_session.query(DummyTenantModel).delete()
