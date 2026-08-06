# MEDTRACK MASTER SPECIFICATION

Version: 2.0

---

# Project Name

MedTrack

---

# Project Vision

MedTrack is a modern healthcare inventory and medicine management platform.

The application should look and feel like a professional SaaS dashboard rather than a college project.

Primary users:

- Hospitals
- Clinics
- NGOs
- Pharmacies
- Medical Camps

---

# Technology Stack

Frontend

- React
- Vite
- JavaScript
- Tailwind CSS v4
- shadcn/ui
- React Router
- Lucide React
- Recharts

Backend

- Supabase

---

# Design Philosophy

The interface should be:

- Clean
- Minimal
- Spacious
- Modern
- Professional
- Fast
- Responsive

Inspired by:

- Stripe Dashboard
- Vercel Dashboard
- Linear
- Notion
- Clerk Dashboard

---

# Theme

Primary Color

Medical Blue

Secondary Color

Green

Danger

Red

Warning

Orange

Background

Very Light Gray

Cards

White

Dark Mode

Supported

---

# Typography

Use modern readable fonts.

Recommended:

- Geist
- Inter

Use consistent spacing.

---

# Icons

Use only Lucide React.

Never mix icon libraries.

---

# Component Rules

- Maximum 200 lines per component.
- Reusable components only.
- No duplicate code.
- Separate UI from business logic.
- Use props instead of repeating code.

---

# Folder Structure

Organize the project by feature.

Components should stay inside their respective folders.

---

# Navigation

Sidebar contains:

Dashboard

Inventory

Distribution

Purchases

Donations

Analytics

Reports

Alerts

Settings

---

# Dashboard Rules

Dashboard should NOT contain every feature.

It is only an overview.

Allowed:

- Welcome section
- Inventory Health
- Critical Alerts
- Recent Activity
- Quick Actions
- Inventory Category Pie Chart
- Stock Trend Line Chart

---

# Inventory Rules

Inventory contains:

- Categories
- All Medicines
- Low Stock
- Expiring Soon
- Search
- Filters

Medicines belong to categories.

Example:

Pain Killers

Antibiotics

Vitamins

Syrups

Injections

---

# Search Rules

Global search must be available from the header.

Search by:

- Medicine Name
- Category
- Supplier
- Batch Number
- Medicine ID

Search should be fast and easy to use.

---

# Analytics Rules

Analytics page contains charts only.

Examples:

- Inventory Distribution
- Monthly Distribution
- Purchase Trends
- Donation Trends
- Top Medicines
- Expiry Analysis

Do not place forms here.

---

# Reports

Reports should allow:

- PDF Export
- Excel Export
- Monthly Reports
- Inventory Reports
- Distribution Reports

---

# Alerts

Alert page shows:

- Low Stock
- Expiring Soon
- Expired Medicines
- Critical Inventory

---

# Settings

Contains:

- Organization Details
- Users
- Notifications
- Theme
- Profile

---

# UI Rules

Use:

- Rounded corners
- Soft shadows
- Consistent spacing
- Smooth animations

Avoid:

- Bright gradients
- Flashy effects
- Cluttered layouts

---

# Responsiveness

Desktop

Tablet

Mobile

All pages must work properly.

---

# Charts

Charts should use Recharts only.

Use charts only when they add value.

---

# Forms

Large inputs.

Clear labels.

Validation.

Good spacing.

---

# Tables

Every table should support:

- Search
- Filter
- Sort
- Pagination

---

# Notifications

Use toast notifications.

---

# Performance

Avoid unnecessary renders.

Lazy load pages where appropriate.

---

# Accessibility

Good color contrast.

Keyboard navigation.

Proper labels.

---

# Git Rules

Commit after every completed ticket.

Example:

feat: sidebar

feat: dashboard

feat: inventory

---

# AI Rules

When generating code:

- Modify only files required for the current ticket.
- Do not rewrite unrelated code.
- Do not regenerate the project.
- Do not add unnecessary dependencies.
- Reuse existing components whenever possible.

---

# Ultimate Goal

Build MedTrack as a production-quality healthcare inventory management platform suitable for a professional portfolio and real-world usage.