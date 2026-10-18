import React from "react";
import { getRiskCategory } from "../utils/formatters";

interface RiskScoreBadgeProps {
  score: number;
  showBar?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  score,
  showBar = true,
  showLabel = true,
  size = "md",
}) => {
  const info = getRiskCategory(score);

  if (size === "sm") {
    return (
      <div className="inline-flex items-center gap-1.5" id={`risk-score-sm-${score}`}>
        <span
          className={`px-1.5 py-0.5 rounded font-mono font-semibold text-xs border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}
        >
          {score}
        </span>
        {showLabel && (
          <span className="text-[11px] text-slate-400 truncate max-w-[110px]">
            {info.label}
          </span>
        )}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800" id={`risk-score-lg-${score}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Assessed Risk Score
          </span>
          <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
            {info.label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-slate-100">{score}</span>
          <span className="text-xs text-slate-500 font-mono">/ 100</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full ${info.barColor} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
      </div>
    );
  }

  // Default 'md'
  return (
    <div className="flex items-center gap-2.5" id={`risk-score-md-${score}`}>
      <span
        className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}
      >
        {score}
      </span>
      {showBar && (
        <div className="w-16 bg-slate-800/80 h-1.5 rounded-full overflow-hidden hidden sm:block">
          <div
            className={`h-full ${info.barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
      {showLabel && (
        <span className={`text-xs font-medium ${info.badgeText}`}>
          {info.label}
        </span>
      )}
    </div>
  );
};
