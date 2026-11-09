# Aura Life Sciences License & Subscription Management Platform

> An enterprise monorepo licensing and subscription governance engine purpose-built for **Life Sciences** applications (Genomics NGS, HPLC & Mass Spectrometry, Digital Pathology AI, and Clinical EDC Systems). Supporting both **B2C Individual Clinicians/Researchers** and **B2B Multi-Site Pharmaceutical/CRO Enterprises**, with **FDA 21 CFR Part 11 Tamper-Evident Audit Trails** and **Ed25519 Cryptographic Air-Gapped Instrument Validation**.

---

## 🏛️ System Architecture & Cloud Review

Aura synthesizes the strengths of industry-renowned cloud licensing patterns:
- **Stripe Billing / Zuora**: Subscription state machines, automated proration, billing cycles, tiered plans.
- **Keygen.sh / Sentinel RMS**: Cryptographic asymmetric offline license tokens (Ed25519), hardware node-locking, floating pool lease heartbeats.
- **Auth0 / AWS Organizations**: Multi-tenancy isolation (Personal Single-Seat for B2C; Multi-User Department Hierarchies for B2B).

### Architecture Review Corrections Incorporated (GxP / 21 CFR Part 11)
1. **SHA-256 Merkle-Chained Audit Ledger**: All modifications to subscriptions, entitlements, activations, or licenses calculate a chained hash `hash = SHA256(prev_hash + timestamp + actor + action + details + reason)`. Any direct SQL tampering breaks the cryptographic chain immediately.
2. **Air-Gapped Instrument Support**: Complete zero-network offline license verification using asymmetric Ed25519 keys, allowing sequencers in BSL-3 cleanrooms and hospital intranets to verify authenticity without internet access.
3. **Dual B2C/B2B Model**: B2C users get instant credit-card self-serve checkout with single-seat licensing; B2B enterprises get floating license pools, PO numbers, and departmental validation tags.

Detailed architecture review document: [docs/architecture_design.md](docs/architecture_design.md).

---

## 📂 Monorepo Structure

```
aura-license-management/
├── backend/                  # Python 3.12 + FastAPI Backend
│   ├── app/
│   │   ├── api/v1/          # Endpoints (auth, tenants, products, subscriptions, licenses, audit, analytics)
│   │   ├── core/            # Cryptographic Ed25519 engine & 21 CFR Part 11 hash chaining
│   │   ├── db/              # PostgreSQL session & initial seed generator
│   │   ├── models/          # SQLAlchemy ORM models (Tenant, User, Product, Plan, License, AuditLog)
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Domain business logic (LicenseService, SubscriptionService, AuditService)
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Pytest integration & unit test suite (10/10 passed)
│   └── requirements.txt
├── frontend/                 # React 18 + Vite + Tailwind CSS Single-Page Application
│   ├── src/
│   │   ├── api/             # Centralized REST client
│   │   ├── components/      # Navbar, Sidebar, Badges, Modals
│   │   ├── pages/           # Dashboard, B2C, B2B Enterprise, License Manager, Lab Simulator, Audit Trail, Pricing
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/                     # Architectural design & review blueprints
├── scripts/                  # Launchers & automation scripts
│   ├── start_backend.bat    # Launches FastAPI backend on port 8000
│   ├── start_frontend.bat   # Launches Vite dev server on port 5173
│   └── start_pg.bat         # Localhost PostgreSQL starter
└── README.md
```

---

## 🗄️ Database Setup (PostgreSQL Localhost)

The system is configured to connect to PostgreSQL hosted on localhost:
- **Default Port**: `5433` (or `5432` if your Windows service is active)
- **Database**: `auralicense`
- **Username**: `postgres`

To customize the database connection, set the `DATABASE_URL` environment variable:
```bash
set DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/auralicense
```

---

## 🚀 Quick Start Guide

### 1. Backend (FastAPI)
```bash
# In repository root:
set PYTHONPATH=backend
python backend/app/db/init_db.py   # Initializes schema & seeds Life Science demo data
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive OpenAPI Docs: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

### 3. Run Backend Test Suite
```bash
set PYTHONPATH=backend
python -m pytest backend/tests/test_backend.py -v
```
All 10 integration tests verify:
- Health check & API routes
- B2C & B2B product/tenant separation
- Ed25519 asymmetric cryptographic signing & validation
- Hardware node activation, seat quotas, and heartbeat extension
- Air-gapped offline `.lic` bundle generation and validation
- 21 CFR Part 11 SHA-256 audit hash-chaining and tamper alarm detection

---

## 🔬 Core Life Science Capabilities

1. **Executive Overview Dashboard**: High-level ARR metrics, B2C/B2B subscription split, active hardware devices, and real-time 21 CFR Part 11 integrity indicator.
2. **B2C Clinicians & Independent Labs**: Self-serve portal with single-seat subscriptions, device deactivation, and immediate license key provisioning.
3. **B2B Enterprise Hub**: Floating license pools with concurrent utilization tracking, CLIA/FDA registration numbers, departmental tagging, and PO billing.
4. **License Authority & Provisioning**: Mint Ed25519 signed licenses with custom feature flags, node-locking, and GxP revocation reason logging.
5. **Air-Gapped Instrument Simulator**: Real-time interactive lab workstation simulator to test both online heartbeats and zero-network `.lic` verification.
6. **21 CFR Part 11 Audit Trail**: Immutable cryptographic ledger, audit trail report exporter, and simulated DBA tampering/repair demonstration.
