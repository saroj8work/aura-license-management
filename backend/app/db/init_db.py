import hashlib
from datetime import datetime, timedelta
from app.db.session import engine, SessionLocal, Base
from app.models.tenant import Tenant, User, AccountType, UserRole
from app.models.product import Product, Plan, TargetAudience, BillingInterval
from app.models.subscription import Subscription, SubscriptionStatus, PaymentMethodType
from app.models.license import License, LicenseActivation, LicenseType, LicenseStatus
from app.models.audit_log import AuditLog
from app.core.crypto import crypto_manager
from app.services.audit_service import audit_service
from app.core.config import settings

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

def init_db():
    print("Creating database tables on PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Product).first():
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding Life Sciences catalog, plans, tenants, and initial cryptographic licenses...")

        # 1. Products
        p_genomics = Product(
            code="AURA-GENOMICS-SUITE",
            name="Aura Genomics Diagnostic Suite",
            description="Next-Generation Sequencing (NGS) alignment, variant calling, and clinical ACMG report generator."
        )
        p_chromato = Product(
            code="AURA-CHROMATO-QC",
            name="Aura Chromato-QC Automation",
            description="GxP-compliant automated chromatography analysis for HPLC, GC-MS, and spectrometry instruments."
        )
        p_pathology = Product(
            code="AURA-PATHOLOGY-AI",
            name="Aura Digital Pathology AI",
            description="Deep learning tissue segmentation, biomarker scoring, and whole-slide imaging diagnosis."
        )
        db.add_all([p_genomics, p_chromato, p_pathology])
        db.flush()

        # 2. Plans (B2C and B2B)
        plan_b2c_mo = Plan(
            product_id=p_genomics.id,
            code="B2C-GENOMICS-PRO-MO",
            name="Genomics Pro (B2C Monthly)",
            target_audience=TargetAudience.B2C.value,
            price_cents=14900,
            currency="USD",
            billing_interval=BillingInterval.MONTHLY.value,
            seat_limit=1,
            max_devices_per_seat=2,
            features=["ngs_alignment", "variant_calling", "pdf_report_export"]
        )
        plan_b2c_yr = Plan(
            product_id=p_genomics.id,
            code="B2C-GENOMICS-PRO-YR",
            name="Genomics Pro (B2C Annual)",
            target_audience=TargetAudience.B2C.value,
            price_cents=149000,
            currency="USD",
            billing_interval=BillingInterval.ANNUAL.value,
            seat_limit=1,
            max_devices_per_seat=2,
            features=["ngs_alignment", "variant_calling", "pdf_report_export", "priority_compute"]
        )
        plan_b2b_lab = Plan(
            product_id=p_genomics.id,
            code="B2B-LAB-STARTER",
            name="Lab Team Standard (B2B)",
            target_audience=TargetAudience.B2B.value,
            price_cents=95000,
            currency="USD",
            billing_interval=BillingInterval.MONTHLY.value,
            seat_limit=10,
            max_devices_per_seat=2,
            features=["ngs_alignment", "variant_calling", "pdf_report_export", "hl7_fhir_export", "batch_processing", "team_license_pooling"]
        )
        plan_b2b_ent = Plan(
            product_id=p_genomics.id,
            code="B2B-ENTERPRISE-GXP",
            name="Enterprise GxP Suite (B2B)",
            target_audience=TargetAudience.B2B.value,
            price_cents=490000,
            currency="USD",
            billing_interval=BillingInterval.MONTHLY.value,
            seat_limit=50,
            max_devices_per_seat=3,
            features=["ngs_alignment", "variant_calling", "pdf_report_export", "hl7_fhir_export", "batch_processing", "team_license_pooling", "gxp_part11_audit_trail", "airgap_instrument_support", "hardware_node_locking", "dedicated_compliance_ledger"]
        )
        db.add_all([plan_b2c_mo, plan_b2c_yr, plan_b2b_lab, plan_b2b_ent])
        db.flush()

        # 3. Tenants (B2B & B2C)
        t_b2b_gxp = Tenant(
            name="Genomics Diagnostics Corp",
            slug="genomics-diag-corp",
            account_type=AccountType.B2B_ENTERPRISE.value,
            contact_email="director@genomicsdiag.com",
            department_tag="Clinical Molecular Pathology",
            gxp_validation_status="VALIDATED",
            metadata_json={"facility_clia_id": "CLIA-99D2049182", "fda_registration": "FEI-30129482"}
        )
        t_b2b_pharma = Tenant(
            name="BioPharma Therapeutics",
            slug="biopharma-tx",
            account_type=AccountType.B2B_ENTERPRISE.value,
            contact_email="licensing@biopharmatx.com",
            department_tag="Drug Discovery QC",
            gxp_validation_status="VALIDATED",
            metadata_json={"facility_site": "Cambridge Innovation Center"}
        )
        t_b2c_clinician = Tenant(
            name="Dr. Jane Aris - Clinical Genetics",
            slug="jane-aris-genetics",
            account_type=AccountType.B2C_INDIVIDUAL.value,
            contact_email="dr.aris@clinics.org",
            department_tag="Private Practice",
            gxp_validation_status="STANDARD"
        )
        db.add_all([t_b2b_gxp, t_b2b_pharma, t_b2c_clinician])
        db.flush()

        # 4. Users with Roles
        u_admin = User(
            tenant_id=t_b2b_gxp.id,
            email="admin@aura.io",
            hashed_password=hash_pw("Admin@12345"),
            full_name="Dr. Alexander Vance (SuperAdmin)",
            role=UserRole.SUPERADMIN.value
        )
        u_compliance = User(
            tenant_id=t_b2b_gxp.id,
            email="compliance@genomicsdiag.com",
            hashed_password=hash_pw("GxP@Secure2026"),
            full_name="Sarah Chen, RAC (GxP Compliance Officer)",
            role=UserRole.COMPLIANCE_OFFICER.value
        )
        u_b2c = User(
            tenant_id=t_b2c_clinician.id,
            email="dr.aris@clinics.org",
            hashed_password=hash_pw("Clinician@2026"),
            full_name="Dr. Jane Aris, MD",
            role=UserRole.SCIENTIST_USER.value
        )
        db.add_all([u_admin, u_compliance, u_b2c])
        db.flush()

        # 5. Subscriptions
        now = datetime.utcnow()
        sub_enterprise = Subscription(
            tenant_id=t_b2b_gxp.id,
            plan_id=plan_b2b_ent.id,
            status=SubscriptionStatus.ACTIVE.value,
            allocated_seats=50,
            used_seats=2,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            payment_method=PaymentMethodType.PURCHASE_ORDER.value,
            purchase_order_number="PO-GXP-2026-8819",
            billing_email="billing@genomicsdiag.com"
        )
        sub_b2c = Subscription(
            tenant_id=t_b2c_clinician.id,
            plan_id=plan_b2c_yr.id,
            status=SubscriptionStatus.ACTIVE.value,
            allocated_seats=1,
            used_seats=1,
            current_period_start=now,
            current_period_end=now + timedelta(days=365),
            payment_method=PaymentMethodType.CREDIT_CARD.value,
            billing_email="dr.aris@clinics.org"
        )
        db.add_all([sub_enterprise, sub_b2c])
        db.flush()

        # 6. Cryptographically Signed Licenses (Ed25519)
        # License 1: B2B Enterprise Floating Pool with GxP & Airgap features
        claims_ent = {
            "license_key": "AURA-GXP-8812-4491-BC39",
            "tenant_id": str(t_b2b_gxp.id),
            "tenant_name": t_b2b_gxp.name,
            "product_code": p_genomics.code,
            "license_type": LicenseType.FLOATING_POOL.value,
            "max_activations": 150,
            "allowed_features": plan_b2b_ent.features,
            "expires_at": (now + timedelta(days=365)).isoformat(),
            "issued_at": now.isoformat()
        }
        sig_ent = crypto_manager.sign_payload(claims_ent)
        lic_enterprise = License(
            tenant_id=t_b2b_gxp.id,
            product_id=p_genomics.id,
            subscription_id=sub_enterprise.id,
            license_key="AURA-GXP-8812-4491-BC39",
            license_type=LicenseType.FLOATING_POOL.value,
            status=LicenseStatus.ACTIVE.value,
            max_activations=150,
            current_activations=2,
            expires_at=now + timedelta(days=365),
            allowed_features=plan_b2b_ent.features,
            public_claims=claims_ent,
            signature=sig_ent
        )

        # License 2: B2C Single Seat
        claims_b2c = {
            "license_key": "AURA-B2C-1092-7741-992A",
            "tenant_id": str(t_b2c_clinician.id),
            "tenant_name": t_b2c_clinician.name,
            "product_code": p_genomics.code,
            "license_type": LicenseType.SINGLE_SEAT.value,
            "max_activations": 2,
            "allowed_features": plan_b2c_yr.features,
            "expires_at": (now + timedelta(days=365)).isoformat(),
            "issued_at": now.isoformat()
        }
        sig_b2c = crypto_manager.sign_payload(claims_b2c)
        lic_b2c = License(
            tenant_id=t_b2c_clinician.id,
            product_id=p_genomics.id,
            subscription_id=sub_b2c.id,
            license_key="AURA-B2C-1092-7741-992A",
            license_type=LicenseType.SINGLE_SEAT.value,
            status=LicenseStatus.ACTIVE.value,
            max_activations=2,
            current_activations=1,
            expires_at=now + timedelta(days=365),
            allowed_features=plan_b2c_yr.features,
            public_claims=claims_b2c,
            signature=sig_b2c
        )

        # License 3: Pure Air-Gapped Cleanroom Node-Locked License
        claims_airgap = {
            "license_key": "AURA-AIRGAP-9911-3312-7F01",
            "tenant_id": str(t_b2b_gxp.id),
            "tenant_name": t_b2b_gxp.name,
            "product_code": p_chromato.code,
            "license_type": LicenseType.AIR_GAPPED.value,
            "max_activations": 1,
            "allowed_features": ["gxp_part11_audit_trail", "chromatography_auto_qc", "hplc_driver_lock"],
            "expires_at": None,  # Perpetual air-gapped lab instrument
            "issued_at": now.isoformat()
        }
        sig_airgap = crypto_manager.sign_payload(claims_airgap)
        lic_airgap = License(
            tenant_id=t_b2b_gxp.id,
            product_id=p_chromato.id,
            subscription_id=sub_enterprise.id,
            license_key="AURA-AIRGAP-9911-3312-7F01",
            license_type=LicenseType.AIR_GAPPED.value,
            status=LicenseStatus.ACTIVE.value,
            max_activations=1,
            current_activations=1,
            expires_at=None,
            allowed_features=claims_airgap["allowed_features"],
            public_claims=claims_airgap,
            signature=sig_airgap
        )
        db.add_all([lic_enterprise, lic_b2c, lic_airgap])
        db.flush()

        # 7. Device Activations
        act1 = LicenseActivation(
            license_id=lic_enterprise.id,
            machine_fingerprint="fp_novaseq_lab3_9942a1bc8f",
            hostname="ILLUMINA-NOVASEQ-6000-01",
            platform_os="Ubuntu 22.04 LTS (Real-time Lab Kernel)",
            device_label="Illumina NovaSeq Sequencer Workstation #1",
            ip_address="10.14.2.45",
            lease_expires_at=now + timedelta(days=7),
            last_heartbeat_at=now,
            is_active=True
        )
        act2 = LicenseActivation(
            license_id=lic_enterprise.id,
            machine_fingerprint="fp_bioinfo_cluster_node04",
            hostname="HPC-GENOMICS-NODE-04",
            platform_os="Red Hat Enterprise Linux 9",
            device_label="High-Throughput Alignment Node 04",
            ip_address="10.14.2.88",
            lease_expires_at=now + timedelta(days=7),
            last_heartbeat_at=now,
            is_active=True
        )
        act_b2c = LicenseActivation(
            license_id=lic_b2c.id,
            machine_fingerprint="fp_macbook_pro_m3_dr_aris",
            hostname="MacBook-Pro-Jane.local",
            platform_os="macOS 15.1 Sonoma",
            device_label="Dr. Jane Aris Clinic Laptop",
            ip_address="192.168.1.112",
            lease_expires_at=now + timedelta(days=7),
            last_heartbeat_at=now,
            is_active=True
        )
        act_airgap = LicenseActivation(
            license_id=lic_airgap.id,
            machine_fingerprint="fp_agilent_1260_infinity_hplc",
            hostname="AGILENT-1260-HPLC-ISOLATED",
            platform_os="Windows 10 IoT Enterprise LTSC",
            device_label="Agilent 1260 Infinity II Cleanroom Workstation",
            ip_address="127.0.0.1 (Air-Gapped)",
            lease_expires_at=now + timedelta(days=3650),
            last_heartbeat_at=now,
            is_active=True
        )
        db.add_all([act1, act2, act_b2c, act_airgap])
        db.flush()

        # 8. 21 CFR Part 11 Audit Trail Hash-Chained Entries
        print("Constructing 21 CFR Part 11 cryptographic audit ledger...")
        audit_service.record_event(
            db=db,
            action="SYSTEM_INITIALIZED",
            entity_type="SYSTEM",
            entity_id="GENESIS",
            actor_email="system@aura.io",
            details={"version": "1.0.0", "regulatory_mode": "21 CFR Part 11 / EU Annex 11"},
            reason_for_change="System installation and initialization"
        )
        audit_service.record_event(
            db=db,
            action="TENANT_VALIDATED",
            entity_type="TENANT",
            entity_id=str(t_b2b_gxp.id),
            actor_email="compliance@genomicsdiag.com",
            tenant_id=str(t_b2b_gxp.id),
            details={"tenant_name": t_b2b_gxp.name, "clia_id": "CLIA-99D2049182"},
            reason_for_change="Annual GxP software vendor validation review"
        )
        audit_service.record_event(
            db=db,
            action="SUBSCRIPTION_PROVISIONED",
            entity_type="SUBSCRIPTION",
            entity_id=str(sub_enterprise.id),
            actor_email="director@genomicsdiag.com",
            tenant_id=str(t_b2b_gxp.id),
            details={"po_number": "PO-GXP-2026-8819", "seats": 50, "plan": "B2B-ENTERPRISE-GXP"},
            reason_for_change="Enterprise master services agreement executed"
        )
        audit_service.record_event(
            db=db,
            action="LICENSE_ISSUED",
            entity_type="LICENSE",
            entity_id=str(lic_enterprise.id),
            actor_email="admin@aura.io",
            tenant_id=str(t_b2b_gxp.id),
            details={"license_key": lic_enterprise.license_key, "max_activations": 150},
            reason_for_change="Issuance of floating lab license pool"
        )
        audit_service.record_event(
            db=db,
            action="NODE_ACTIVATED",
            entity_type="LICENSE_ACTIVATION",
            entity_id=str(act1.id),
            actor_email="lab-technician@genomicsdiag.com",
            tenant_id=str(t_b2b_gxp.id),
            details={"device": "Illumina NovaSeq Sequencer Workstation #1", "ip": "10.14.2.45"},
            reason_for_change="Instrument integration in molecular diagnostic lab suite"
        )
        audit_service.record_event(
            db=db,
            action="B2C_SUBSCRIPTION_ACTIVE",
            entity_type="SUBSCRIPTION",
            entity_id=str(sub_b2c.id),
            actor_email="dr.aris@clinics.org",
            tenant_id=str(t_b2c_clinician.id),
            details={"plan": "B2C-GENOMICS-PRO-YR", "seats": 1},
            reason_for_change="Clinician self-serve annual subscription signup"
        )

        db.commit()
        print("Life Sciences database successfully initialized and seeded with GxP audit ledger!")

    except Exception as e:
        db.rollback()
        print(f"Error during database initialization: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
