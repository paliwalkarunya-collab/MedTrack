"""add returns and refunds models

Revision ID: 9f1e2a3b4c5d
Revises: 8c0d15100001
Create Date: 2026-08-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f1e2a3b4c5d"
down_revision: Union[str, Sequence[str], None] = "8c0d15100001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "returns",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("return_number", sa.String(length=100), nullable=False),
        sa.Column("invoice_id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
        sa.Column("refund_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pharmacy_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pharmacy_id", "return_number", name="uq_return_pharmacy_number"),
    )
    op.create_index(op.f("ix_returns_invoice_id"), "returns", ["invoice_id"])
    op.create_index(op.f("ix_returns_pharmacy_id"), "returns", ["pharmacy_id"])
    op.create_index(op.f("ix_returns_customer_id"), "returns", ["customer_id"])

    op.create_table(
        "return_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("return_id", sa.Uuid(), nullable=False),
        sa.Column("invoice_item_id", sa.Uuid(), nullable=False),
        sa.Column("medicine_id", sa.Uuid(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_refund_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("refund_discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("refund_tax_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("line_refund_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pharmacy_id", sa.Uuid(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_return_item_quantity_positive"),
        sa.ForeignKeyConstraint(["invoice_item_id"], ["invoice_items.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["medicine_id"], ["medicines.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["return_id"], ["returns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_return_items_return_id"), "return_items", ["return_id"])
    op.create_index(op.f("ix_return_items_invoice_item_id"), "return_items", ["invoice_item_id"])
    op.create_index(op.f("ix_return_items_medicine_id"), "return_items", ["medicine_id"])
    op.create_index(op.f("ix_return_items_pharmacy_id"), "return_items", ["pharmacy_id"])

    op.create_table(
        "return_allocations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("return_item_id", sa.Uuid(), nullable=False),
        sa.Column("stock_allocation_id", sa.Uuid(), nullable=False),
        sa.Column("inventory_batch_id", sa.Uuid(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("pharmacy_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["inventory_batch_id"], ["inventory_batches.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["return_item_id"], ["return_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["stock_allocation_id"], ["stock_allocations.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_return_allocations_return_item_id"), "return_allocations", ["return_item_id"])
    op.create_index(op.f("ix_return_allocations_stock_allocation_id"), "return_allocations", ["stock_allocation_id"])
    op.create_index(op.f("ix_return_allocations_inventory_batch_id"), "return_allocations", ["inventory_batch_id"])
    op.create_index(op.f("ix_return_allocations_pharmacy_id"), "return_allocations", ["pharmacy_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_return_allocations_pharmacy_id"), table_name="return_allocations")
    op.drop_index(op.f("ix_return_allocations_inventory_batch_id"), table_name="return_allocations")
    op.drop_index(op.f("ix_return_allocations_stock_allocation_id"), table_name="return_allocations")
    op.drop_index(op.f("ix_return_allocations_return_item_id"), table_name="return_allocations")
    op.drop_table("return_allocations")

    op.drop_index(op.f("ix_return_items_pharmacy_id"), table_name="return_items")
    op.drop_index(op.f("ix_return_items_medicine_id"), table_name="return_items")
    op.drop_index(op.f("ix_return_items_invoice_item_id"), table_name="return_items")
    op.drop_index(op.f("ix_return_items_return_id"), table_name="return_items")
    op.drop_table("return_items")

    op.drop_index(op.f("ix_returns_customer_id"), table_name="returns")
    op.drop_index(op.f("ix_returns_pharmacy_id"), table_name="returns")
    op.drop_index(op.f("ix_returns_invoice_id"), table_name="returns")
    op.drop_table("returns")