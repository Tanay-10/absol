import type { EventDetail } from "@/lib/types";

const MIX_TONES = [
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-violet)",
  "var(--accent-emerald)",
  "var(--accent-coral)",
];

export interface ImpactTrajectoryPoint {
  label: string;
  claims: number;
  amount: number;
  share: number;
}

export interface ImpactPolicyMixItem {
  label: string;
  policies: number;
  amount: number;
  share: number;
  averageProbability: number;
  tone: string;
}

export interface ImpactModel {
  policyCount: number;
  estimatedClaims: number;
  estimatedAmount: number;
  averageProbability: number;
  severityPressure: number;
  topPolicyMixShare: number;
  trajectory: ImpactTrajectoryPoint[];
  policyMix: ImpactPolicyMixItem[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveImpactModel(detail: EventDetail): ImpactModel {
  const estimateMap = new Map(
    detail.estimates.map((estimate) => [estimate.exposure_match_id, estimate])
  );
  const policyCount =
    detail.alert?.total_policies_affected ?? Math.max(detail.matches.length, 0);
  const estimatedClaims =
    detail.alert?.estimated_claim_count ??
    detail.estimates.filter((estimate) => estimate.claim_probability > 0.1).length;
  const estimatedAmount =
    detail.alert?.estimated_total_amount ??
    detail.estimates.reduce((sum, estimate) => sum + estimate.estimated_amount, 0);
  const averageProbability =
    detail.estimates.length > 0
      ? detail.estimates.reduce(
          (sum, estimate) => sum + estimate.claim_probability,
          0
        ) / detail.estimates.length
      : 0;

  const mixSeed = new Map<
    string,
    { label: string; policies: number; amount: number; probabilityTotal: number }
  >();

  detail.matches.forEach((match) => {
    const estimate = estimateMap.get(match.id);
    const label = match.policies?.policy_type || "Unclassified";
    const current = mixSeed.get(label) || {
      label,
      policies: 0,
      amount: 0,
      probabilityTotal: 0,
    };

    current.policies += 1;
    current.amount += estimate?.estimated_amount ?? 0;
    current.probabilityTotal += estimate?.claim_probability ?? 0;
    mixSeed.set(label, current);
  });

  const policyMix = Array.from(mixSeed.values())
    .sort((left, right) => right.amount - left.amount || right.policies - left.policies)
    .map((item, index) => ({
      label: item.label,
      policies: item.policies,
      amount: item.amount,
      share: policyCount > 0 ? item.policies / policyCount : 0,
      averageProbability:
        item.policies > 0 ? item.probabilityTotal / item.policies : 0,
      tone: MIX_TONES[index % MIX_TONES.length],
    }));

  const topPolicyMixShare = policyMix[0]?.share ?? 0;
  const severityPressure = clamp(
    detail.event.severity_score / 100 + topPolicyMixShare * 0.22,
    0.18,
    1
  );
  const trajectoryCurve = [0.2, 0.38, 0.61, 0.84, 1].map((share, index) =>
    clamp(share + severityPressure * [0.04, 0.06, 0.07, 0.05, 0][index], 0, 1)
  );
  trajectoryCurve[trajectoryCurve.length - 1] = 1;

  const trajectoryLabels = [
    "Signal lock",
    "Claims screen",
    "Field surge",
    "Reserve build",
    "Recovery watch",
  ];

  const trajectory = trajectoryCurve.map((share, index) => ({
    label: trajectoryLabels[index],
    share,
    claims: Math.max(1, Math.round(estimatedClaims * share)),
    amount: estimatedAmount * share,
  }));

  return {
    policyCount,
    estimatedClaims,
    estimatedAmount,
    averageProbability,
    severityPressure,
    topPolicyMixShare,
    trajectory,
    policyMix,
  };
}
