#!/usr/bin/env python3
"""
Aura CLI - Life Sciences License & Compliance Command-Line Interface
-------------------------------------------------------------------
Usage:
    python aura_cli.py status
    python aura_cli.py fingerprint
    python aura_cli.py verify-file <path_to_license.lic>
    python aura_cli.py audit-check
    python aura_cli.py audit-export [output.json]
"""

import sys
import os
import argparse
import json
from datetime import datetime

# Add root and backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from sdk.aura_client import AuraLicenseClient, LicenseError

def cmd_fingerprint(args):
    fp = AuraLicenseClient.generate_machine_fingerprint()
    print("=" * 60)
    print("🔬 AURA HARDWARE TELEMETRY & NODE IDENTIFIER")
    print("=" * 60)
    print(f"Machine Fingerprint: {fp}")
    print("This fingerprint is used for strict hardware node-locking on sequencers & lab PCs.")

def cmd_verify_file(args):
    client = AuraLicenseClient()
    print("=" * 60)
    print(f"🔬 VERIFYING AIR-GAPPED LICENSE FILE: {args.file}")
    print("=" * 60)
    try:
        res = client.verify_offline_license_file(args.file)
        print("  ✓ Cryptographic Signature: VALID (Ed25519 Verified)")
        print(f"  ✓ License Key:             {res['license_key']}")
        print(f"  ✓ Account / Organization:  {res['tenant_name']}")
        print(f"  ✓ Entitled Modules:        {', '.join(res['entitled_features'])}")
        print(f"  ✓ Expiration:              {res['expires_at'] or 'Perpetual'}")
        print("\nSTATUS: PASS - Instrument software authorized to run.")
    except LicenseError as e:
        print(f"\n❌ VERIFICATION BLOCKED: {e}")
        sys.exit(1)

def cmd_audit_check(args):
    from app.db.base import Base, Tenant, User, AuditLog
    from app.db.session import SessionLocal
    from app.services.audit_service import audit_service
    print("=" * 60)
    print("🔬 FDA 21 CFR PART 11 CRYPTOGRAPHIC AUDIT LEDGER INTEGRITY CHECK")
    print("=" * 60)
    db = SessionLocal()
    try:
        report = audit_service.verify_full_chain(db)
        print(f"Total Audit Entries Scanned: {report['total_records']}")
        print(f"Chain Status:                 {report['chain_status']}")
        if report['is_valid']:
            print("\n✓ SUCCESS: Cryptographic SHA-256 hash chain is intact and untampered.")
        else:
            print("\n❌ ALARM: Chain breach detected! Anomalies:")
            for a in report['anomalies_detected']:
                print(f"   * Record ID {a['record_id']} - Error: {a['error']}")
            sys.exit(2)
    finally:
        db.close()

def cmd_audit_export(args):
    from app.db.base import Base, Tenant, User, AuditLog
    from app.db.session import SessionLocal
    output_file = args.output or f"Aura_21CFR_Part11_Audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    db = SessionLocal()
    try:
        records = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
        data = [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "actor_email": r.actor_email,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "details": r.details,
                "reason_for_change": r.reason_for_change,
                "previous_hash": r.previous_hash,
                "hash": r.hash
            }
            for r in records
        ]
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"✓ Exported {len(data)} immutable 21 CFR Part 11 audit records to '{output_file}'")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Aura Life Sciences License & Compliance CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # fingerprint
    subparsers.add_parser("fingerprint", help="Display local device hardware node fingerprint")

    # verify-file
    p_verify = subparsers.add_parser("verify-file", help="Mathematically verify an offline .lic bundle")
    p_verify.add_argument("file", help="Path to .lic file")

    # audit-check
    subparsers.add_parser("audit-check", help="Verify 21 CFR Part 11 SHA-256 chain integrity")

    # audit-export
    p_export = subparsers.add_parser("audit-export", help="Export audit trail to JSON")
    p_export.add_argument("output", nargs="?", default=None, help="Output JSON path")

    args = parser.parse_args()

    if args.command == "fingerprint":
        cmd_fingerprint(args)
    elif args.command == "verify-file":
        cmd_verify_file(args)
    elif args.command == "audit-check":
        cmd_audit_check(args)
    elif args.command == "audit-export":
        cmd_audit_export(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
