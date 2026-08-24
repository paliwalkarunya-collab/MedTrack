"""add billing models

Revision ID: 8c0d15100001
Revises: 475f6427ca3b
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c0d15100001"
down_revision: Union[str, Sequence[str], None] = "475f6427ca3b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50)), sa.Column("email", sa.String(length=255)),
        sa.Column("address", sa.String()), sa.Column("gstin", sa.String(length=50)),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)), sa.Column("pharmacy_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pharmacy_id", "phone", name="uq_customer_pharmacy_phone"),
    )
    op.create_index(op.f("ix_customers_pharmacy_id"), "customers", ["pharmacy_id"])
    op.create_table(
        "invoices",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("invoice_number", sa.String(length=100), nullable=False),
        sa.Column("customer_id", sa.Uuid()), sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False), sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False), sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.String()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)), sa.Column("pharmacy_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pharmacy_id", "invoice_number", name="uq_invoice_pharmacy_number"),
    )
    op.create_index(op.f("ix_invoices_customer_id"), "invoices", ["customer_id"])
    op.create_index(op.f("ix_invoices_pharmacy_id"), "invoices", ["pharmacy_id"])
    op.create_table(
        "invoice_items",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("invoice_id", sa.Uuid(), nullable=False),
        sa.Column("medicine_id", sa.Uuid(), nullable=False), sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False), sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(10, 2), nullable=False), sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)), sa.Column("pharmacy_id", sa.Uuid(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_invoice_item_quantity_positive"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["medicine_id"], ["medicines.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoice_items_invoice_id"), "invoice_items", ["invoice_id"])
    op.create_index(op.f("ix_invoice_items_medicine_id"), "invoice_items", ["medicine_id"])
    op.create_index(op.f("ix_invoice_items_pharmacy_id"), "invoice_items", ["pharmacy_id"])
    # Batch mode keeps this additive FK migration testable on SQLite too.
    with op.batch_alter_table("stock_allocations") as batch_op:
        batch_op.add_column(sa.Column("invoice_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key("fk_stock_allocations_invoice_id", "invoices", ["invoice_id"], ["id"], ondelete="RESTRICT")
        batch_op.create_index(op.f("ix_stock_allocations_invoice_id"), ["invoice_id"])


def downgrade() -> None:
    with op.batch_alter_table("stock_allocations") as batch_op:
        batch_op.drop_index(op.f("ix_stock_allocations_invoice_id"))
        batch_op.drop_constraint("fk_stock_allocations_invoice_id", type_="foreignkey")
        batch_op.drop_column("invoice_id")
    op.drop_index(op.f("ix_invoice_items_pharmacy_id"), table_name="invoice_items")
    op.drop_index(op.f("ix_invoice_items_medicine_id"), table_name="invoice_items")
    op.drop_index(op.f("ix_invoice_items_invoice_id"), table_name="invoice_items")
    op.drop_table("invoice_items")
    op.drop_index(op.f("ix_invoices_pharmacy_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_customer_id"), table_name="invoices")
    op.drop_table("invoices")
    op.drop_index(op.f("ix_customers_pharmacy_id"), table_name="customers")
    op.drop_table("customers")
