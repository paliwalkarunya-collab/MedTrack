# MedTrack – PROJECT_CONTEXT.md

> **Version:** v0.5.0
>
> This document is the single source of truth for the MedTrack project.
> Every AI coding assistant MUST read this file before making any code changes.
>
> Do NOT violate the architecture or business rules described here.

---

# 1. Project Overview

## Project Name

MedTrack

## Description

MedTrack is a modern Pharmacy Inventory & Billing Management System.

The objective is to build a production-quality application suitable for real pharmacy usage and software engineering placement portfolios.

This is NOT a simple CRUD application.

The architecture is designed to support:

- Batch-level inventory
- Barcode scanning
- FIFO inventory deduction
- Reports
- Authentication
- FastAPI backend
- Supabase
- AI-powered analytics

---

# 2. Tech Stack

## Frontend

- React 19
- Vite
- React Router
- Tailwind CSS
- Lucide React
- Recharts

## State Management

React Context

## Barcode

- USB Barcode Scanner
- Webcam Scanner (ZXing)

## Future Backend

FastAPI

## Future Database

Supabase

## Future AI

- AI Assistant
- Invoice OCR
- Disease Trend Analytics
- Smart Reorder
- Dead Stock Detection

---

# 3. Current Progress

## Completed

✅ Dashboard

✅ Inventory CRUD

✅ Dynamic Product Model

✅ Product Details

✅ Add/Edit Product

✅ Billing

✅ Shopping Cart

✅ Barcode Search

✅ USB Barcode Scanner

✅ Webcam Barcode Scanner

✅ Inventory Deduction

✅ Shared Inventory Context

---

## In Progress

⬜ Supplier Management

⬜ Purchase Management

⬜ Purchase History

---

## Future

⬜ Reports

⬜ Alerts

⬜ Authentication

⬜ Supabase

⬜ FastAPI

⬜ AI Center

---

# 4. Project Architecture

The application architecture is:

Products

↓

Purchase Batches

↓

Inventory

↓

Billing

↓

Reports

↓

AI

Every future feature must follow this architecture.

---

# 5. Business Rules

These rules MUST NEVER be violated.

## Inventory

Inventory is updated only through:

- Purchases
- Billing

Never edit stock directly.

---

## Purchases

Purchases always increase inventory.

Purchases never create duplicate products.

If a product exists:

Increase inventory.

If product does not exist:

Offer to create it.

---

## Billing

Billing always decreases inventory.

Inventory deduction must be automatic.

---

## Barcode

Barcode must be unique.

Barcode may be entered by:

- Manual entry
- USB Scanner
- Webcam Scanner

---

## Product

A Product can have multiple suppliers.

Do NOT permanently attach a product to only one supplier.

Preferred Supplier is optional.

---

## Batch Management

Every purchase creates a NEW batch.

Each batch stores:

- Batch Number
- Manufacturing Date
- Expiry Date
- Purchase Date
- Supplier
- Purchase Price
- Selling Price
- GST
- Quantity Received
- Quantity Remaining
- Status

Inventory shown to the user is the TOTAL across batches.

---

## FIFO

Billing MUST follow

First Expiry First Out (FIFO).

Always deduct stock from the earliest-expiring active batch.

Never deduct randomly.

This rule is mandatory.

---

## Expired Products

Expired batches cannot be sold.

---

## Recalled Products

Future feature.

Recalled batches cannot be sold.

---

# 6. Dynamic Product Model

The system supports:

Medicine

Personal Care

Medical Device

Surgical Item

Supplement

Products are NOT limited to medicines.

Examples:

- Tablet
- Capsule
- Soap
- Facewash
- Shampoo
- Syrup
- Gloves
- Thermometer

Packaging is configurable.

Never hardcode

Strip

Tablet

inside business logic.

---

# 7. AI Roadmap

AI will only be implemented AFTER the application is production-ready.

Modules:

1. AI Assistant

Natural language queries.

Examples:

Which medicines expire next month?

Which supplier is cheapest?

How much profit today?

---

2. Invoice OCR

Upload supplier invoice.

AI extracts:

- Supplier
- Products
- Batch
- Quantity
- Price
- Expiry

Automatically fills Purchase form.

---

3. Disease Trend Analytics

Analyze medicine sales.

Detect seasonal trends.

Recommend stock increases.

---

4. Smart Reorder

Predict reorder quantity.

---

5. Dead Stock Detection

Identify products that rarely sell.

---

# 8. Folder Structure

Current structure:

src/

components/

pages/

hooks/

utils/

Future:

models/

services/

api/

Keep business logic outside pages whenever possible.

---

# 9. Coding Standards

Every implementation MUST:

- Keep components modular.
- Avoid duplicated logic.
- Reuse helpers.
- Preserve UI consistency.
- Preserve responsiveness.
- Maintain backward compatibility.

---

# 10. Before Finishing Any Ticket

Always:

Run

npm run lint

Run

npm run build

Fix ALL warnings.

Fix ALL errors.

---

Provide this report:

FILES CREATED

FILES MODIFIED

FILES DELETED

SUMMARY OF CHANGES

DEPENDENCIES

MANUAL STEPS

For EVERY modified file explain WHY it was modified.

Do NOT omit any section.

---

# 11. Git Workflow

After every completed ticket:

git add .

git commit

git push

Never begin a major ticket with uncommitted changes.

---

# 12. Next Sprint

Ticket 7A

Supplier Management

Ticket 7B

Purchase Management

Ticket 7C

Purchase History

---

# 13. Future Roadmap

v0.6

Supplier Management

Purchase Management

Purchase History

Batch Tracking

FIFO

---

v0.7

Reports

Alerts

---

v0.8

Authentication

Supabase

---

v0.9

FastAPI

---

v1.0

Production Release

---

v2.0

AI Center

- AI Assistant
- Invoice OCR
- Disease Trend Analytics
- Smart Reorder
- Dead Stock Detection

---

# Final Rule

Every future implementation must improve the architecture instead of introducing shortcuts.

The project should always remain production-ready and scalable.