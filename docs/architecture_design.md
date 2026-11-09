# Aura License & Subscription Management Platform
## Architecture Design Document & Review (B2C / B2B Life Sciences)

---

### 1. Executive Summary & Domain Context

**Aura License Management** is a cloud-native, multi-tenant license and subscription management platform purpose-built for **Life Sciences** software ecosystems. Life Sciences applications (e.g., DNA sequencing analysis suites, HPLC chromatography software, clinical trial EDC platforms, AI-assisted pathology diagnostic tools, and robotic lab automation systems) require unique architectural characteristics:
1. **Hybrid Deployment Realities**: Software runs in modern cloud environments, private hospital networks, and completely **air-gapped / offline lab instruments**.
2. **Regulatory Rigor**: Stringent compliance with **FDA 21 CFR Part 11**, **EU Annex 11**, and **GxP** guidelines—mandating immutable, tamper-evident audit logs, time synchronization, electronic signatures, and deterministic traceability of all entitlement modifications.
3. **Dual Market Dynamics (B2C & B2B)**:
   - **B2C**: Independent researchers, bioinformatician consultants, and private clinicians purchasing seat-based or usage-tiered self-service monthly/annual plans with instant credit card checkout, self-serve seat management, and single-device activation.
   - **B2B**: Pharmaceutical enterprises, Contract Research Organizations (CROs), academic medical centers, and diagnostic laboratory networks requiring organizational hierarchies, pooled floating licenses, concurrent workstation allocations, hardware node-locking, role-based governance, and purchase order/enterprise contract support.

---

### 2. Industry Reference Cloud Architecture: The "Three-Pillar" Hybrid Model

To establish a world-class architecture, Aura references proven cloud design patterns from:
- **Stripe Billing / Zuora**: Subscription state machines, proration, recurring billing cycles, usage-based metering, and tiered pricing plans.
- **Keygen.sh / Cryptolens / Thales Sentinel**: Cryptographic offline license verification (asymmetric digital signatures), hardware fingerprinting, floating pool leasing, and lease heartbeat intervals.
- **Auth0 / AWS Organizations**: Hierarchical multi-tenancy (Single-seat personal workspaces for B2C; Multi-user Organizations with RBAC for B2B).

---

### 3. Architecture Review & Critique by Principal Architect

> **Architectural Review Assessment**  
> **Reviewer**: Lead Cloud & Compliance Solutions Architect  
> **Verdict**: APPROVED WITH CRITICAL CORRECTIONS APPLIED

#### Initial Proposal Vulnerabilities & Corrections:
1. **Audit Log Tampering Vulnerability (GxP / 21 CFR Part 11 Risk)**:
   - *Observation*: Standard database logs with `created_at` timestamps can be modified or backdated by database administrators or SQL injection.
   - *Correction*: Implement **SHA-256 Cryptographic Hash Chaining** (similar to a blockchain or git commit tree). Every audit record must contain `previous_hash` and `hash = SHA256(id + prev_hash + timestamp + actor + action + payload)`. Any tampering breaks the integrity chain, immediately detectable in compliance audits.

2. **Air-Gapped Lab Instrument Verification Breakdown**:
   - *Observation*: Lab instruments in cleanrooms, BSL-3 facilities, and hospital networks frequently have zero internet access. A pure REST API heartbeat mechanism would cause critical lab workflow disruptions.
   - *Correction*: Implement **Asymmetric Cryptographic License Bundles (Ed25519)**. The license engine signs the license payload (tenant, allowed features, max cores, expiration date, hardware machine-id) using an Ed25519 private key. The offline software embeds the public key, enabling mathematically unverifiable forgery-proof local authorization with zero network calls.

3. **B2C vs. B2B Architectural Friction**:
   - *Observation*: Forcing individual B2C users into rigid B2B organizational hierarchy structures creates bad onboarding UX, while treating B2B customers as flat accounts prevents department/lab isolation.
   - *Correction*: Adopt a unified **Tenant Hierarchy Model**. An entity is an `Account/Tenant` with `account_type` (`B2C_INDIVIDUAL` or `B2B_ENTERPRISE`). B2C accounts default to a single-seat personal workspace with streamlined billing. B2B accounts enable multi-seat pooling, department tags, floating seat checkouts, and manager/scientist role delegations.

4. **Hardware Node-Locking Drift in Virtualized / Lab Environments**:
   - *Observation*: Virtual machines or Dockerized lab software generate fluctuating MAC addresses and container IDs, causing false license invalidations.
   - *Correction*: Multi-attribute fingerprint hashing: combination of CPU ID, Motherboard UUID, and Hostname with fuzzy tolerance thresholds or explicit Dongle/TPM ID binding.

---

### 4. Technical Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, PyJWT, Cryptography (Ed25519 / RSA), psycopg 3
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Database**: PostgreSQL on localhost (port 5433 / default fallback 5432)
