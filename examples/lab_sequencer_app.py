"""
Example: Life Sciences Lab Sequencer Workstation Application
------------------------------------------------------------
Demonstrates how a Clinical Genomics / Sequencing instrument software
integrates the Aura License Client SDK.
"""

import sys
import os
import json

# Add parent directory to path to import sdk
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sdk.aura_client import AuraLicenseClient, EntitlementError, LicenseError

def run_sequencer_pipeline():
    print("=" * 65)
    print("🧬 NOVASEQ CLINICAL GENOMICS PIPELINE v4.2 (GxP VALIDATED)")
    print("=" * 65)

    client = AuraLicenseClient(server_url="http://127.0.0.1:8000/api/v1")
    print(f"[Device Telemetry] Hardware Fingerprint: {client.machine_fingerprint}")

    # 1. Check if offline .lic bundle exists in current directory, or activate online
    sample_lic_file = os.path.join(os.path.dirname(__file__), "sample_instrument.lic")

    # If sample file doesn't exist, create a mock signed one for demonstration
    if not os.path.exists(sample_lic_file):
        from app.core.crypto import crypto_manager
        claims = {
            "license_key": "AURA-GXP-DEMO-2026-AIRGAP",
            "tenant_name": "Genomics Diagnostics Corp - Cleanroom Lab #3",
            "allowed_features": ["ngs_alignment", "variant_calling", "pdf_report_export"],
            "expires_at": "2030-01-01T00:00:00",
            "issued_at": "2026-01-01T00:00:00"
        }
        bundle = crypto_manager.generate_airgap_license_file("AURA-GXP-DEMO-2026-AIRGAP", claims)
        with open(sample_lic_file, "w") as f:
            json.dump(bundle, f, indent=2)

    # 2. Verify Air-Gapped License (Zero-Network)
    print("\n[Step 1] Loading Air-Gapped Cryptographic License (.lic)...")
    try:
        verification = client.verify_offline_license_file(sample_lic_file)
        print(f"  ✓ Signature Verified: Ed25519 Cryptographically Authentic")
        print(f"  ✓ License Key:       {verification['license_key']}")
        print(f"  ✓ Licensed Account:  {verification['tenant_name']}")
        print(f"  ✓ Entitled Modules:  {', '.join(verification['entitled_features'])}")
    except LicenseError as e:
        print(f"  ❌ License Verification Blocked: {e}")
        return

    # 3. Define Entitled Clinical Functions with Decorators
    @client.require_feature("ngs_alignment")
    def run_bwa_alignment(fastq_file: str):
        print(f"  -> [OK] Executing BWA-MEM Next-Gen Alignment on '{fastq_file}'...")
        return "aligned_reads.bam"

    @client.require_feature("variant_calling")
    def call_clinical_variants(bam_file: str):
        print(f"  -> [OK] Running GATK HaplotypeCaller on '{bam_file}'...")
        return ["chr7:g.140453136A>T (BRAF V600E)", "chr17:g.7577121G>A (TP53 R273H)"]

    @client.require_feature("advanced_ai_pathology")
    def run_deep_learning_classifier():
        print("  -> Executing AI Pathology Slide Segmenter...")

    # 4. Execute Pipeline
    print("\n[Step 2] Executing Licensed Clinical Workflows:")
    bam = run_bwa_alignment("patient_sample_098_R1.fastq.gz")
    variants = call_clinical_variants(bam)
    print(f"  ✓ Discovered {len(variants)} Pathogenic Variants:")
    for v in variants:
        print(f"     * {v}")

    # 5. Demonstrate Entitlement Defense
    print("\n[Step 3] Testing Regulatory Entitlement Defense:")
    print("  -> Attempting to execute unauthorized module ('advanced_ai_pathology')...")
    try:
        run_deep_learning_classifier()
    except EntitlementError as e:
        print(f"  🔒 [ENFORCED] Defense Triggered: {e}")

    print("\n" + "=" * 65)
    print("✓ PIPELINE COMPLETED SUCCESSFULLY WITH ZERO UNAUTHORIZED MODULE ACCESS")
    print("=" * 65)

if __name__ == "__main__":
    run_sequencer_pipeline()
