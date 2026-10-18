import React from "react";
import type { AlertStatus } from "../types";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: AlertStatus;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const isSmall = size === "sm";

  switch (status) {
    case "PENDING":
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 ${
            isSmall ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Clock className={isSmall ? "w-3 h-3 text-amber-400" : "w-3.5 h-3.5 text-amber-400"} />
          <span>Pending</span>
        </span>
      );
    case "CONFIRMED":
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-300 ${
            isSmall ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <CheckCircle2 className={isSmall ? "w-3 h-3 text-rose-400" : "w-3.5 h-3.5 text-rose-400"} />
          <span>Confirmed</span>
        </span>
      );
    case "FALSE_POSITIVE":
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 ${
            isSmall ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <XCircle className={isSmall ? "w-3 h-3 text-emerald-400" : "w-3.5 h-3.5 text-emerald-400"} />
          <span>False Positive</span>
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-400">
          {status}
        </span>
      );
  }
};
