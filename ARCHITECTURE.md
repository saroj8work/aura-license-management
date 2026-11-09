# Aura License & Subscription Management Platform
## System Architecture & Technical Specification (B2C & B2B Life Sciences)

---

### 1. Executive Summary & Domain Scope

**Aura License Management** is an enterprise-grade monorepo platform designed to govern software licensing and subscriptions in **Life Sciences** ecosystems, such as:
- Next-Generation Sequencing (NGS) alignment & ACMG clinical variant interpretation
- HPLC, Mass Spectrometry, and Chromatography automated quality control
- Digital Pathology deep learning whole-slide classification
- Clinical Trial Electronic Data Capture (EDC) & EHR interoperability (HL7/FHIR)

The platform bridges two distinct operational modes:
1. **B2C (Individual Clinicians & Researchers)**:
   - Self-serve credit card subscriptions (monthly/annual)
   - Single-seat named licenses
   - Self-service device activation and laptop workstation release
2. **B2B (Enterprise Life Science Organizations & CROs)**:
   - Multi-tenant departmental organization hierarchy
   - Concurrent floating license pools (10 to 500+ seats)
   - Enterprise Purchase Order (PO) and Net 30 invoicing
   - Hardware node-locking to physical lab instruments (CPU ID, Motherboard UUID, Hostname)
   - Zero-network air-gapped cryptographic validation (`.lic` bundles) for cleanrooms
   - FDA 21 CFR Part 11 & EU Annex 11 compliant tamper-evident audit trails

---

### 2. High-Level Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           CLIENT / ENDPOINT LAYER                         │
├──────────────────────────────┬─────────────────────────────┬──────────────┤
│ Web Management UI (React 18) │ Lab Client SDK (Python/CLI) │ Cleanroom    │
│ Vite SPA (:5173)             │ Sequencers & Chromatography │ Offline Node │
└──────────────┬───────────────┴──────────────┬──────────────┴───────┬──────┘
               │ HTTPS (REST)                 │ HTTPS (Heartbeats)   │ Offline .lic
               ▼                              ▼                      ▼
┌─────────────────────────────────────────────────────────────┐  ┌──────────┐
│                   FASTAPI BACKEND GATEWAY (:8000)           │  │ Ed25519  │
│  - JWT & API Key Authentication                             │  │ Public   │
│  - Role-Based Access Control (RBAC)                         │  │ Key      │
│  - 21 CFR Part 11 Audit Trail Interceptor                   │  │ (Embedded│
├─────────────────────────────────────────────────────────────┤  │ Locally) │
│                      CORE SERVICES LAYER                    │  └──────────┘
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │ Subscription & Billing  │  │ License Authority Engine │  │
│  │ (State Machine, Plans)  │  │ (Pools, Heartbeats, Node)│  │
│  └─────────────────────────┘  └──────────────────────────┘  │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │ Asymmetric Crypto       │  │ SHA-256 Merkle Ledger    │  │
│  │ (Ed25519 Signer V1)     │  │ (Part 11 Hash Chaining)  │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ PostgreSQL Dialect
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 POSTGRESQL RELATIONAL STORE                 │
│  - tenants (B2C & B2B Orgs)    - subscriptions & plans      │
│  - users & roles               - audit_logs (Chained)       │
│  - licenses & activations      - usage_records (Metered)    │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Architecture Review & GxP Compliance Matrix

| Regulatory / Architectural Standard | Risk Identified in Review | Solution Implemented in Aura |
| :--- | :--- | :--- |
| **FDA 21 CFR § 11.10(e) Audit Trails** | Direct database modifications or rogue DBA tampering can alter audit rows undetected. | **SHA-256 Hash Chaining**: Every log row seals `hash = SHA256(prev_hash + timestamp + actor + action + details + reason)`. Any alteration trips the chain alarm. |
| **FDA 21 CFR § 11.50 Electronic Signatures** | License tampering or forged licenses deployed on lab equipment. | **Asymmetric Ed25519 Signing**: Server signs license claims using private key; client software verifies with public key. |
| **Cleanroom Isolation (Air-Gap)** | Cleanrooms (BSL-3, hospitals) prohibit internet access, breaking cloud REST verification. | **Self-Contained `.lic` Files**: Bundles claims + signature into a `.lic` file verified mathematically offline with zero network pings. |
| **Multi-Tenancy Segregation** | B2C customers forced into cumbersome enterprise org flows, or B2B departments colliding. | **Unified Account Hierarchy**: Single-seat personal workspaces for B2C; multi-seat pooled orgs with CLIA/GxP validation for B2B. |
| **Network Jitter & High Availability** | Transient network drops in labs shouldn't halt active patient sequencing runs. | **Rolling Lease Heartbeats**: 7-day grace window; devices verify offline during temporary disconnections. |

---

### 4. Database Schema Specification

#### 4.1. `tenants`
- `id` (UUID, Primary Key)
- `name` (String 255, e.g. "Genomics Diagnostics Corp" or "Dr. Jane Aris MD")
- `slug` (String 128, Unique Index)
- `account_type` (`B2C_INDIVIDUAL` or `B2B_ENTERPRISE`)
- `contact_email` (String 255)
- `gxp_validation_status` (String, e.g. `VALIDATED`, `PENDING_AUDIT`, `EXEMPT`)
- `department_tag` (String, e.g. "Molecular Diagnostic Core")
- `metadata_json` (JSON, contains facility CLIA numbers, FDA registration IDs)
- `created_at`, `updated_at` (DateTime UTC)

#### 4.2. `products` & `plans`
- `products`: `id`, `code` (`AURA-GENOMICS-SUITE`, `AURA-CHROMATO-QC`), `name`, `description`
- `plans`: `id`, `product_id`, `code` (`B2C-GENOMICS-PRO-MO`, `B2B-ENTERPRISE-GXP`), `target_audience` (`B2C`/`B2B`), `price_cents`, `currency`, `billing_interval` (`MONTHLY`/`ANNUAL`), `seat_limit`, `max_devices_per_seat`, `features` (JSON array of strings)

#### 4.3. `subscriptions`
- `id` (UUID, Primary Key)
- `tenant_id` (FK -> `tenants.id`)
- `plan_id` (FK -> `plans.id`)
- `status` (`ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`, `EXPIRED`)
- `allocated_seats`, `used_seats` (Integer)
- `current_period_start`, `current_period_end` (DateTime)
- `payment_method` (`CREDIT_CARD`, `PURCHASE_ORDER`, `INVOICE_NET30`)
- `purchase_order_number` (String, for B2B enterprises)

#### 4.4. `licenses` & `license_activations`
- `licenses`:
  - `id` (UUID, Primary Key)
  - `tenant_id` (FK -> `tenants.id`)
  - `product_id` (FK -> `products.id`)
  - `license_key` (Unique, e.g. `AURA-GXP-8812-4491-BC39`)
  - `license_type` (`SINGLE_SEAT`, `FLOATING_POOL`, `NODE_LOCKED`, `AIR_GAPPED`)
  - `status` (`ACTIVE`, `REVOKED`, `EXPIRED`)
  - `max_activations`, `current_activations` (Integer)
  - `expires_at` (DateTime, Null for perpetual cleanroom licenses)
  - `allowed_features` (JSON array of entitlement strings)
  - `signature` (Ed25519 digital signature string)
  - `public_claims` (JSON payload signed)
- `license_activations`:
  - `id` (UUID)
  - `license_id` (FK -> `licenses.id`)
  - `machine_fingerprint` (String 128, hash of CPU/Host/OS)
  - `hostname`, `platform_os`, `device_label`, `ip_address`
  - `lease_expires_at`, `last_heartbeat_at`
  - `activation_token` (Signed runtime token)

#### 4.5. `audit_logs` (21 CFR Part 11 Tamper-Evident Ledger)
- `id` (BigInteger, Primary Key, Autoincrement)
- `timestamp` (DateTime UTC)
- `tenant_id`, `actor_user_id` (Nullable FKs)
- `actor_email` (String)
- `action` (String, e.g. `LICENSE_ISSUED`, `LICENSE_ACTIVATED`, `PLAN_UPGRADED`)
- `entity_type`, `entity_id` (String)
- `details` (JSON change diff)
- `reason_for_change` (String 500, mandatory in GxP operations)
- `client_ip`, `user_agent`
- `previous_hash` (SHA-256 of preceding row)
- `hash` (SHA-256 of current entry chained)

---

### 5. Cryptographic Licensing Specification (Ed25519 RFC 8032)

1. **Key Generation**: Asymmetric Ed25519 keypair. The private key resides securely in the backend authority; the public key is embedded in client SDKs.
2. **Canonical Signing**:
   ```python
   canonical_bytes = json.dumps(claims, sort_keys=True, separators=(",", ":")).encode("utf-8")
   signature = private_key.sign(canonical_bytes)
   signature_b64 = base64.urlsafe_b64encode(signature).decode("utf-8")
   ```
3. **Air-Gapped `.lic` Bundle Format**:
   ```json
   {
     "format": "AURA_LIFESCIENCES_LIC_V1",
     "license_key": "AURA-AIRGAP-9911-3312-7F01",
     "claims": {
       "license_key": "AURA-AIRGAP-9911-3312-7F01",
       "tenant_name": "Genomics Diagnostics Corp - Cleanroom Lab #3",
       "allowed_features": ["ngs_alignment", "variant_calling", "pdf_report_export"],
       "expires_at": "2030-01-01T00:00:00"
     },
     "signature": "<URLSafe_Base64_Ed25519_Signature>",
     "public_key": "<Base64_Public_Key>",
     "algorithm": "Ed25519"
   }
   ```
4. **Client Verification**:
   The client SDK uses the embedded public key to verify `signature` over canonical `claims`. If any claim (e.g. expiration date or feature list) is altered by 1 bit, verification fails mathematically.

---

### 6. Client SDK Integration Pattern

Lab instruments protect clinical functions using Python decorators:
```python
from sdk.aura_client import AuraLicenseClient

client = AuraLicenseClient()
client.verify_offline_license_file("sample_instrument.lic")

@client.require_feature("ngs_alignment")
def run_bwa_alignment(fastq_path: str):
    # Executed only if 'ngs_alignment' is present in signed license
    ...
```

---

### 7. Monorepo Execution & Ports

| Service | Port | Description |
| :--- | :--- | :--- |
| **PostgreSQL Database** | `5433` (or `5432`) | Localhost database `auralicense` |
| **FastAPI Backend** | `8000` | REST API Gateway & Swagger Docs (`/api/v1/docs`) |
| **React Frontend** | `5173` | Management Single Page Application (Vite) |

Launcher scripts:
- `scripts\start_backend.bat` -> Starts FastAPI server on `http://127.0.0.1:8000`
- `scripts\start_frontend.bat` -> Starts React dev server on `http://localhost:5173`
- `aura_cli.py` -> Command-line interface for GxP auditors & instrument technicians
