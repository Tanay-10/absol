"""Alert generation — aggregates claim estimates into an event-level alert."""
from __future__ import annotations


def generate_alert(
    estimates: list[dict],
    total_policies: int,
) -> dict:
    """Generate an alert from a list of claim estimates.

    Alert levels:
        0-10 claims → low (Monitor)
        11-50 → medium (Notify team lead)
        51-200 → high (Activate surge team)
        200+ → critical (Full emergency response)
    """
    likely_claims = [e for e in estimates if e["claim_probability"] > 0.1]
    claim_count = len(likely_claims)
    total_amount = sum(e["estimated_amount"] for e in likely_claims)

    if claim_count > 200:
        level, action = "critical", "Full emergency response"
    elif claim_count > 50:
        level, action = "high", "Activate surge team"
    elif claim_count > 10:
        level, action = "medium", "Notify team lead"
    else:
        level, action = "low", "Monitor"

    return {
        "alert_level": level,
        "total_policies_affected": total_policies,
        "estimated_claim_count": claim_count,
        "estimated_total_amount": round(total_amount, 2),
        "recommended_action": action,
    }
