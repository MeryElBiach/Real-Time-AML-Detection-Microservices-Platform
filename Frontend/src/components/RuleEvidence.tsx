import type { EvidenceValue, RuleHit } from "../types";
import { RuleBadge } from "./RuleBadge";

const LABELS: Record<string, string> = {
  amount: "Observed amount",
  currency: "Currency",
  threshold: "Configured threshold",
  comparison: "Comparison",
  expectedAmount: "Configured exact amount",
  minimumAmount: "Minimum amount",
  multipleOf: "Required multiple",
  scope: "Assessment scope",
  currencyConversionApplied: "Currency conversion applied",
  historyEvaluated: "Account history evaluated",
  limitation: "Limitation",
  country: "Observed country",
  configuredCountries: "Configured country list",
  listType: "List source",
  officialSanctionsCheckPerformed: "Official sanctions check performed",
  configuredCurrencies: "Configured currencies",
  crossBorderTransferVerified: "Cross-border transfer verified",
};

function formatEvidence(value: EvidenceValue): string {
  if (value === null || value === undefined) return "Unavailable";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (value === "SINGLE_TRANSACTION") return "Single transaction";
  if (value === "CURRENCY_ONLY") return "Currency only";
  if (value === "SIMULATION") return "Demonstration list, not an official list";
  return String(value);
}

interface RuleEvidenceProps {
  hits?: RuleHit[];
  scoringVersion?: string | null;
  emptyMessage?: string;
}

export function RuleEvidence({ hits = [], scoringVersion, emptyMessage = "Detailed scoring evidence is unavailable for this alert." }: RuleEvidenceProps) {
  if (hits.length === 0) {
    return <p data-testid="evidence-unavailable" className="text-xs text-slate-400">{emptyMessage}</p>;
  }
  const rawScore = hits.reduce((sum, hit) => sum + hit.points, 0);
  return (
    <div data-testid="rule-evidence" className="space-y-3">
      <p className="text-[11px] text-slate-400">
        Scoring version: <span className="font-mono text-slate-300">{scoringVersion || "Unavailable"}</span>.
        {" "}Contributions are added and the final score is capped at 100; it is not a probability.
        {rawScore > 100 && ` Contributions before the cap: ${rawScore}.`}
      </p>
      {hits.map((hit) => (
        <div key={hit.code} data-testid={`evidence-${hit.code}`} className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RuleBadge code={hit.code} points={hit.points} showTooltip={false} size="md" />
            <span className="text-[10px] text-slate-400 font-mono">{hit.ruleVersion}</span>
          </div>
          <dl className="space-y-2 text-xs">
            {Object.entries(hit.evidence).map(([key, value]) => (
              <div key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3">
                <dt className="text-slate-400">{LABELS[key] || key}</dt>
                <dd className="text-slate-200 break-words">{formatEvidence(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
