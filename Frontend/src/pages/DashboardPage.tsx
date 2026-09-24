import React from "react";
import {
  ShieldAlert,
  Clock,
  Activity,
  CalendarDays,
  ArrowRight,
  Globe2,
  Sliders,
} from "lucide-react";

import type { Alert, StatsResponse } from "../types";

import {
  formatCurrency,
  formatShortDate,
  getCountryName,
} from "../utils/formatters";

import { RiskScoreBadge } from "../components/RiskScoreBadge";
import { StatusBadge } from "../components/StatusBadge";
import { RuleBadge } from "../components/RuleBadge";

import {
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
} from "../components/SkeletonLoader";

interface DashboardPageProps {
  stats: StatsResponse;
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onNavigateToAlerts: () => void;
  isLoading?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  alerts,
  onSelectAlert,
  onNavigateToAlerts,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        <SkeletonTable rows={6} />
      </div>
    );
  }

  // Display top 7 recent alerts
  const recentAlerts = alerts.slice(0, 7);

  // Maximum values used to calculate the width of the bars
  const maxRuleValue = Math.max(
    ...Object.values(stats.alertsByRule),
    1
  );

  const maxCountryValue = Math.max(
    ...Object.values(stats.alertsByCountry),
    1
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ============================================================
          KPI CARDS
          ============================================================ */}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ==========================================================
            KPI 1: TOTAL ALERTS
            ========================================================== */}

        <div
          id="kpi-total-alerts"
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Alerts
            </span>

            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-blue-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {stats.totalAlerts.toLocaleString()}
            </span>

            <span className="text-xs text-slate-400">
              monitored cases
            </span>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400">
            Reported by AML monitoring engine
          </div>
        </div>

        {/* ==========================================================
            KPI 2: PENDING ALERTS

            The current backend StatsResponse does not provide
            pendingAlerts, so we do NOT display a fake value.
            ========================================================== */}

        {/* ==========================================================
    KPI 2: HIGH-RISK ALERTS
    ========================================================== */}

        <div
          id="kpi-high-risk-alerts"
          className="p-5 rounded-xl bg-slate-900/60 border border-amber-500/20 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              High-Risk Alerts
            </span>

            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-200">
              {stats.highRiskAlerts.toLocaleString()}
            </span>

            <span className="text-xs text-amber-400/80">
              risk score ≥ 50
            </span>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400">
            Alerts reaching the AML high-risk threshold
          </div>
        </div>

        {/* ==========================================================
            KPI 3: AVERAGE RISK SCORE
            ========================================================== */}

        <div
          id="kpi-avg-risk-score"
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Average Risk Score
            </span>

            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {stats.averageRiskScore.toFixed(2)}
            </span>

            <span className="text-xs font-mono text-slate-400">
              / 100
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-400" />

            <span className="text-amber-300 font-medium">
              Elevated Baseline (Threshold: 50)
            </span>
          </div>
        </div>

        {/* ==========================================================
            KPI 4: ALERTS TODAY

            The current backend StatsResponse does not provide
            alertsToday, so we do NOT display a fake value.
            ========================================================== */}

        <div
          id="kpi-alerts-today"
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Alerts Today
            </span>

            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              —
            </span>

            <span className="text-xs text-slate-400">
              unavailable
            </span>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400">
            Daily count is not provided by the reporting API yet
          </div>
        </div>
      </section>

      {/* ============================================================
          VISUALIZATIONS
          ============================================================ */}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ==========================================================
            CHART 1: ALERTS BY RULE
            ========================================================== */}

        <div
          id="chart-alerts-by-rule"
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/90 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />

                <span>
                  Alerts by Triggered AML Rule
                </span>
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Frequency distribution across the monitored compliance indicators
              </p>
            </div>

            <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">
              Active Rules: 5
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {Object.entries(stats.alertsByRule).map(
              ([ruleCode, count]) => {
                const percentage = Math.round(
                  (count / maxRuleValue) * 100
                );

                return (
                  <div
                    key={ruleCode}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <RuleBadge
                        code={ruleCode}
                        size="sm"
                      />

                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-200">
                          {count.toLocaleString()}
                        </span>

                        <span className="text-slate-400 text-[11px]">
                          alerts
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* ==========================================================
            CHART 2: ALERTS BY COUNTRY
            ========================================================== */}

        <div
          id="chart-alerts-by-country"
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/90 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />

                <span>
                  Alerts by Transaction Country
                </span>
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Geographical volume distribution for flagged operations
              </p>
            </div>

            <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              Live Backend Data
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(stats.alertsByCountry).map(
              ([countryCode, count]) => {
                const percentage = Math.round(
                  (count / maxCountryValue) * 100
                );

                const isRiskCountry =
                  countryCode === "KP" ||
                  countryCode === "IR";

                return (
                  <div
                    key={countryCode}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">

                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-xs border border-slate-700">
                          {countryCode}
                        </span>

                        <span className="text-slate-300 font-medium">
                          {getCountryName(countryCode)}
                        </span>

                        {isRiskCountry && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/70 text-red-400 border border-red-800/40">
                            Risk Country
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-bold text-slate-200">
                        {count.toLocaleString()}
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isRiskCountry
                          ? "bg-rose-500"
                          : "bg-cyan-500"
                          }`}
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          RECENT ALERTS
          ============================================================ */}

      <section className="bg-slate-900/50 border border-slate-800/90 rounded-xl overflow-hidden shadow-sm">

        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">

          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />

              <span>
                Recent Alerts
              </span>
            </h2>

            <p className="text-xs text-slate-400 mt-0.5">
              Latest flagged transactions displaying AML risk indicators
            </p>
          </div>

          <button
            id="btn-view-all-alerts"
            onClick={onNavigateToAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/50 border border-blue-800/40 hover:bg-blue-900/50 transition-all"
          >
            <span>
              View All Alerts ({stats.totalAlerts.toLocaleString()})
            </span>

            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ==========================================================
            TABLE
            ========================================================== */}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">

            <thead className="bg-[#0b1222] border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">
                  Transaction ID
                </th>

                <th className="py-3 px-4">
                  Amount
                </th>

                <th className="py-3 px-4">
                  Country
                </th>

                <th className="py-3 px-4">
                  Risk Score
                </th>

                <th className="py-3 px-4">
                  Triggered Rules
                </th>

                <th className="py-3 px-4">
                  Status
                </th>

                <th className="py-3 px-4">
                  Created At
                </th>

                <th className="py-3 px-4 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">

              {recentAlerts.map((alert) => {

                const rules = alert.triggeredRules
                  .split(",")
                  .map((rule) => rule.trim())
                  .filter(Boolean);

                return (
                  <tr
                    key={alert.id}
                    id={`recent-alert-row-${alert.id}`}
                    onClick={() => onSelectAlert(alert)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >

                    <td className="py-3.5 px-4 font-mono font-medium text-white group-hover:text-blue-400 transition-colors">
                      {alert.transactionId}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {formatCurrency(
                        alert.amount,
                        alert.currency || "MAD"
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                        {alert.country}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <RiskScoreBadge
                        score={alert.riskScore}
                        size="sm"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {rules.map((rule) => (
                          <RuleBadge
                            key={rule}
                            code={rule}
                            size="sm"
                          />
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={alert.status}
                        size="sm"
                      />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {formatShortDate(alert.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectAlert(alert);
                        }}
                        className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors font-medium"
                      >
                        Investigate
                      </button>
                    </td>

                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};