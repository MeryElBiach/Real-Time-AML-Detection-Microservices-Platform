import React from "react";

interface RuleBadgeProps {
  code: string;
  size?: "sm" | "md";
  showTooltip?: boolean;
}

const RULE_METADATA: Record<
  string,
  { label: string; score: string; bg: string; text: string; border: string; description: string }
> = {
  HIGH_AMOUNT: {
    label: "HIGH_AMOUNT",
    score: "+50",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    border: "border-blue-500/30",
    description: "Amount >= 100,000",
  },
  STRUCTURING_PATTERN: {
    label: "STRUCTURING_PATTERN",
    score: "+50",
    bg: "bg-purple-500/15",
    text: "text-purple-300",
    border: "border-purple-500/30",
    description: "Amount == 9,900 (Simulation indicator)",
  },
  RISK_COUNTRY: {
    label: "RISK_COUNTRY",
    score: "+60",
    bg: "bg-red-500/15",
    text: "text-red-300",
    border: "border-red-500/30",
    description: "Jurisdiction in simulated high-risk list",
  },
  ROUND_AMOUNT: {
    label: "ROUND_AMOUNT",
    score: "+15",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    description: "Amount >= 10,000 & multiple of 5,000",
  },
  FOREIGN_CURRENCY: {
    label: "FOREIGN_CURRENCY",
    score: "+20",
    bg: "bg-cyan-500/15",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
    description: "Currency is EUR, USD or GBP",
  },
};

export const RuleBadge: React.FC<RuleBadgeProps> = ({ code, size = "sm" }) => {
  const meta = RULE_METADATA[code] || {
    label: code,
    score: "",
    bg: "bg-slate-800",
    text: "text-slate-300",
    border: "border-slate-700",
    description: code,
  };

  const isSmall = size === "sm";

  return (
    <span
      id={`rule-badge-${code}`}
      title={meta.description}
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${meta.bg} ${meta.text} ${meta.border} ${
        isSmall ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
      }`}
    >
      <span>{meta.label}</span>
      {meta.score && (
        <span className="opacity-70 text-[10px]">({meta.score})</span>
      )}
    </span>
  );
};
