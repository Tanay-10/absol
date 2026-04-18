"""Claim estimation — computes probability and estimated amount per exposure match."""
from __future__ import annotations


def estimate_claim(
    match: dict,
    policy: dict,
    relevance: dict,
    event: dict,
    zone: dict,
) -> dict:
    """Apply the claim estimation formula from the spec.

    Formula:
        claim_probability = base_claim_rate × (severity_score/100 × severity_multiplier) × distance_decay
        estimated_amount = coverage_amount × claim_probability
        distance_decay = max(0.1, 1.0 - (distance_km / radius_km))
    """
    base_rate = relevance["base_claim_rate"]
    sev_mult = relevance["severity_multiplier"]
    severity = event["severity_score"]
    coverage = policy["coverage_amount"]

    # Distance decay
    distance_km = match.get("distance_km")
    radius_km = zone.get("radius_km")

    if distance_km is not None and radius_km is not None and radius_km > 0:
        decay = max(0.1, 1.0 - (distance_km / radius_km))
    else:
        decay = 0.7  # default for bbox/admin matches without distance

    severity_factor = (severity / 100) * sev_mult
    probability = min(1.0, base_rate * severity_factor * decay)
    amount = round(coverage * probability, 2)

    return {
        "claim_probability": round(probability, 4),
        "estimated_amount": amount,
        "risk_factors": {
            "base_claim_rate": base_rate,
            "severity_factor": round(severity_factor, 4),
            "distance_decay": round(decay, 4),
            "final_probability": round(probability, 4),
            "reasoning": (
                f"{policy['policy_type']} policy, "
                f"severity {severity}/100, "
                f"decay {decay:.2f}"
            ),
        },
    }
