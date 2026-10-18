import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Globe2,
} from "lucide-react";

import type { StatsResponse } from "../types";

import {
  AML_RULES,
} from "../data/mockData";

import { getCountryName } from "../utils/formatters";
import { RuleBadge } from "../components/RuleBadge";
import { SkeletonChart } from "../components/SkeletonLoader";

interface ReportingPageProps {
  stats: StatsResponse;
  isLoading?: boolean;
}

export const ReportingPage: React.FC<ReportingPageProps> = ({
  stats,
  isLoading = false,
}) => {
  const [timeRange, setTimeRange] =
    useState<"14d" | "30d" | "90d">("14d");

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  // ============================================================
  // REAL BACKEND DATA
  // ============================================================

  const maxRuleVal = Math.max(
    ...Object.values(stats.alertsByRule),
    1
  );

  const maxCountryVal = Math.max(
    ...Object.values(stats.alertsByCountry),
    1
  );

  const statusSeries = stats.statusTimeSeries.slice(-15).map((point) => ({
    ...point, alerts: point.pending + point.confirmed + point.falsePositive,
  }));
  const maxStatusSeriesAlerts = Math.max(...statusSeries.map((point) => point.alerts), 1);
  const statusPresentation = [
    { status: "PENDING" as const, label: "Pending Investigation", color: "#f59e0b" },
    { status: "CONFIRMED" as const, label: "Confirmed AML Alert", color: "#ef4444" },
    { status: "FALSE_POSITIVE" as const, label: "Resolved False Positive", color: "#10b981" },
  ];
  const totalStatusCases = Object.values(stats.statusDistribution).reduce((sum, count) => sum + count, 0);
  const statusDistribution = statusPresentation.map((item) => ({
    ...item,
    count: stats.statusDistribution[item.status],
    percentage: totalStatusCases ? ((stats.statusDistribution[item.status] / totalStatusCases) * 100).toFixed(1) : "0.0",
  }));

  const totalScoreCases = Object.values(
    stats.riskScoreDistribution
  ).reduce((acc, count) => acc + count, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ============================================================
          TOP HEADER
          ============================================================ */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-blue-400" />

            <span>Reporting & Risk Analytics</span>
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Aggregate compliance metrics, typology trends, and risk distributions
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-1 text-xs">

            <button
              onClick={() => setTimeRange("14d")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeRange === "14d"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              14 Days
            </button>

            <button
              onClick={() => setTimeRange("30d")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeRange === "30d"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              30 Days
            </button>

            <button
              onClick={() => setTimeRange("90d")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeRange === "90d"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              Quarter
            </button>

          </div>
        </div>
      </div>

      {/* ============================================================
          PRIMARY KPI STRIP
          ============================================================ */}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* TOTAL ALERTS */}

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">

          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Monitored Alerts
          </div>

          <div className="text-2xl font-bold font-mono text-white mt-1">
            {stats.totalAlerts.toLocaleString()}
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            Cumulative across active rules
          </div>

        </div>

        {/* AVERAGE RISK SCORE */}

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">

          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Mean AML Risk Score
          </div>

          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
            {stats.averageRiskScore.toFixed(2)}{" "}
            <span className="text-xs text-slate-400">
              / 100
            </span>
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            Calculated from monitored alerts
          </div>

        </div>

        {/* HIGH-RISK ALERTS */}

        <div className="p-4 rounded-xl bg-slate-900/50 border border-amber-500/20">

          <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
            High-Risk Alerts
          </div>

          <div className="text-2xl font-bold font-mono text-amber-200 mt-1">
            {stats.highRiskAlerts.toLocaleString()}
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            Risk score ≥ 50
          </div>

        </div>

        {/* ACTIVE AML RULES */}

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">

          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active AML Rules
          </div>

          <div className="text-2xl font-bold font-mono text-blue-300 mt-1">
            {AML_RULES.length}
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            Detection heuristics configured
          </div>

        </div>

      </section>

      {/* ============================================================
          CHART ROW 1: REAL STATUS TIME SERIES
          ============================================================ */}

      <section className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />

              <span>
                Daily AML Alert Inflow (Last 15 Days)
              </span>
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              Historical alert volume with investigation status breakdown
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span className="text-slate-300">
                Confirmed
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-slate-300">
                False Positive
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-slate-300">
                Pending
              </span>
            </div>

          </div>
        </div>

        <div className="pt-6 pb-2">

          <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-slate-800">

            {statusSeries.map((item, index) => {

              const totalHeightPercent =
                (item.alerts / (maxStatusSeriesAlerts * 1.15)) * 100;

              const confirmedH =
                (item.confirmed / (item.alerts || 1)) *
                totalHeightPercent;

              const fpH =
                (item.falsePositive / (item.alerts || 1)) *
                totalHeightPercent;

              const pendingH =
                (item.pending / (item.alerts || 1)) *
                totalHeightPercent;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                >

                  {/* Tooltip */}

                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap shadow-xl">

                    <div className="font-semibold text-white">
                      {item.date}
                    </div>

                    <div className="text-slate-300">
                      Total:{" "}
                      <span className="font-mono font-bold text-blue-400">
                        {item.alerts}
                      </span>{" "}
                      (Conf: {item.confirmed}, FP:{" "}
                      {item.falsePositive}, Pend:{" "}
                      {item.pending})
                    </div>

                  </div>

                  {/* Stacked bar */}

                  <div
                    className="w-full max-w-[32px] rounded-t flex flex-col overflow-hidden bg-slate-800/40"
                    style={{
                      height: `${totalHeightPercent}%`,
                    }}
                  >

                    <div
                      style={{
                        height: `${totalHeightPercent ? (pendingH / totalHeightPercent) * 100 : 0}%`,
                      }}
                      className="w-full bg-amber-500/90"
                    />

                    <div
                      style={{
                        height: `${totalHeightPercent ? (fpH / totalHeightPercent) * 100 : 0}%`,
                      }}
                      className="w-full bg-emerald-500/90"
                    />

                    <div
                      style={{
                        height: `${totalHeightPercent ? (confirmedH / totalHeightPercent) * 100 : 0}%`,
                      }}
                      className="w-full bg-rose-500/90"
                    />

                  </div>

                  <span className="text-[10px] text-slate-400 font-mono mt-2 truncate">
                    {item.date.split(" ")[0]}
                  </span>

                </div>
              );
            })}

          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 px-2 pt-2">
            <span>
              Last 15 available alert dates
            </span>

            <span>
              Reporting Service
            </span>
          </div>

        </div>

      </section>

      {/* ============================================================
          CHART ROW 2
          ============================================================ */}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* RISK SCORE DISTRIBUTION */}

        <div
          id="chart-risk-distribution"
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4"
        >

          <div>

            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">

              <Activity className="w-4 h-4 text-amber-400" />

              <span>
                Risk Score Distribution
              </span>

            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              Real-time score distribution from the Reporting Service
            </p>

          </div>

          <div className="space-y-3 pt-2">

            {Object.entries(stats.riskScoreDistribution).map(
              ([range, count]) => {

                const pct =
                  totalScoreCases > 0
                    ? Math.round((count / totalScoreCases) * 100)
                    : 0;

                return (
                  <div
                    key={range}
                    className="space-y-1"
                  >

                    <div className="flex items-center justify-between text-xs">

                      <div className="flex items-center gap-2">

                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />

                        <span className="text-slate-200 font-medium">
                          {range}
                        </span>

                      </div>

                      <div className="font-mono text-slate-300">

                        <span className="font-bold">
                          {count.toLocaleString()}
                        </span>{" "}

                        <span className="text-slate-400 text-[11px]">
                          ({pct}%)
                        </span>

                      </div>

                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">

                      <div
                        className="h-full rounded-full transition-all duration-700 bg-amber-400"
                        style={{
                          width: `${pct}%`,
                        }}
                      />

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* STATUS DISTRIBUTION */}

        <div
          id="chart-status-distribution"
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4"
        >

          <div>

            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">

              <PieChart className="w-4 h-4 text-emerald-400" />

              <span>
                Alert Status Resolution
              </span>

            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              Current investigation statuses from the Reporting Service
            </p>

          </div>

          <div className="space-y-3.5 pt-2">

            {statusDistribution.map((item) => (

              <div
                key={item.status}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
              >

                <div className="flex items-center gap-3">

                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >

                    {item.status === "CONFIRMED" && (
                      <CheckCircle2 className="w-4 h-4" />
                    )}

                    {item.status === "FALSE_POSITIVE" && (
                      <XCircle className="w-4 h-4" />
                    )}

                    {item.status === "PENDING" && (
                      <Clock className="w-4 h-4" />
                    )}

                  </div>

                  <div>

                    <div className="text-xs font-semibold text-slate-200">
                      {item.label}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Status: {item.status}
                    </div>

                  </div>

                </div>

                <div className="text-right">

                  <div className="text-base font-bold font-mono text-white">
                    {item.count}
                  </div>

                  <div
                    className="text-xs font-mono font-medium"
                    style={{
                      color: item.color,
                    }}
                  >
                    {item.percentage}%
                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* ============================================================
          CHART ROW 3
          ============================================================ */}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ALERT TYPOLOGY */}

        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">

                <Layers className="w-4 h-4 text-blue-400" />

                <span>
                  Alert Typology Breakdown
                </span>

              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Real-time data from the Reporting Service
              </p>

            </div>

            <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
              LIVE
            </span>

          </div>

          <div className="space-y-3">

            {AML_RULES.map((rule) => {

              const count =
                stats.alertsByRule[rule.code] || 0;

              const ratio = Math.round(
                (count / maxRuleVal) * 100
              );

              return (
                <div
                  key={rule.code}
                  className="p-3 rounded-lg bg-slate-950/40 border border-slate-800"
                >

                  <div className="flex items-center justify-between mb-1.5">

                    <div className="flex items-center gap-2">

                      <RuleBadge
                        code={rule.code}
                        size="sm"
                      />

                      <span className="text-xs font-medium text-slate-200">
                        {rule.name}
                      </span>

                    </div>

                    <span className="font-mono font-bold text-xs text-white">

                      {count.toLocaleString()}{" "}

                      <span className="text-slate-400 font-normal">
                        cases
                      </span>

                    </span>

                  </div>

                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${ratio}%`,
                      }}
                    />

                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-mono">

                    <span>
                      Condition: {rule.condition}
                    </span>

                    <span className="text-amber-400 font-semibold">
                      +{rule.scoreContribution} pts
                    </span>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* COUNTRY BREAKDOWN */}

        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">

                <Globe2 className="w-4 h-4 text-cyan-400" />

                <span>
                  Jurisdiction Concentration
                </span>

              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Real-time country distribution from the Reporting Service
              </p>

            </div>

            <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
              LIVE
            </span>

          </div>

          <div className="space-y-2.5">

            {Object.entries(stats.alertsByCountry).map(
              ([countryCode, count], idx) => {

                const pct = Math.round(
                  (count / maxCountryVal) * 100
                );

                const isRiskCountry =
                  countryCode === "KP" ||
                  countryCode === "IR";

                return (
                  <div
                    key={countryCode}
                    className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                  >

                    <div className="flex items-center gap-3">

                      <span className="font-mono text-xs text-slate-400 w-4">
                        #{idx + 1}
                      </span>

                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                        {countryCode}
                      </span>

                      <span className="text-xs text-slate-200 font-medium">
                        {getCountryName(countryCode)}
                      </span>

                      {isRiskCountry && (
                        <span className="text-[10px] text-red-400 bg-red-950/60 border border-red-800/40 px-1.5 py-0.5 rounded">
                          Risk Country
                        </span>
                      )}

                    </div>

                    <div className="flex items-center gap-3">

                      <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">

                        <div
                          className={`h-full ${isRiskCountry
                              ? "bg-red-500"
                              : "bg-cyan-500"
                            }`}
                          style={{
                            width: `${pct}%`,
                          }}
                        />

                      </div>

                      <span className="font-mono font-bold text-xs text-white">
                        {count.toLocaleString()}
                      </span>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

      </section>

    </div>
  );
};