import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Tuple, List
from app.core.config import settings

class AuditChainEngine:
    """
    21 CFR Part 11 / GxP Tamper-Evident Audit Chaining.
    Every audit entry cryptographically seals itself to the preceding entry
    via SHA-256 hash chaining.
    """
    @staticmethod
    def calculate_entry_hash(
        prev_hash: str,
        timestamp_iso: str,
        actor_email: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Dict[str, Any],
        reason_for_change: str
    ) -> str:
        canonical_details = json.dumps(details or {}, sort_keys=True, separators=(",", ":"))
        raw = (
            f"{prev_hash}|{timestamp_iso}|{actor_email.strip().lower()}|"
            f"{action.strip().upper()}|{entity_type.strip().upper()}|"
            f"{str(entity_id)}|{canonical_details}|{reason_for_change or ''}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    def verify_chain(cls, log_records: List[Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Validates the cryptographic chain of all provided log records in chronological order.
        Returns (is_valid, anomalies_detected).
        """
        anomalies = []
        if not log_records:
            return True, []

        expected_prev_hash = settings.AUDIT_GENESIS_HASH

        for idx, rec in enumerate(log_records):
            # Check previous hash pointer
            if rec.previous_hash != expected_prev_hash:
                anomalies.append({
                    "record_id": str(rec.id),
                    "index": idx,
                    "error": "PREVIOUS_HASH_MISMATCH",
                    "expected": expected_prev_hash,
                    "actual": rec.previous_hash,
                    "timestamp": rec.timestamp.isoformat()
                })

            # Recompute record's hash
            iso_time = rec.timestamp.isoformat()
            recomputed = cls.calculate_entry_hash(
                prev_hash=rec.previous_hash,
                timestamp_iso=iso_time,
                actor_email=rec.actor_email,
                action=rec.action,
                entity_type=rec.entity_type,
                entity_id=str(rec.entity_id or ""),
                details=rec.details,
                reason_for_change=rec.reason_for_change
            )

            if rec.hash != recomputed:
                anomalies.append({
                    "record_id": str(rec.id),
                    "index": idx,
                    "error": "CONTENT_HASH_TAMPERED",
                    "expected": recomputed,
                    "actual": rec.hash,
                    "timestamp": iso_time
                })

            expected_prev_hash = rec.hash

        is_valid = len(anomalies) == 0
        return is_valid, anomalies

audit_chain_engine = AuditChainEngine()
