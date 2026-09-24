import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  RefreshCcw,
  ShieldAlert,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Alert } from "../types";
import { AML_RULES } from "../data/mockData";
import { getAlerts } from "../api/alertsApi";
import {
  formatCurrency,
  formatShortDate,
  getCountryName,
} from "../utils/formatters";
import { RiskScoreBadge } from "../components/RiskScoreBadge";
import { StatusBadge } from "../components/StatusBadge";
import { RuleBadge } from "../components/RuleBadge";
import { exportAlertsToCsv } from "../utils/exportCsv";
import { SkeletonTable } from "../components/SkeletonLoader";

interface AlertsPageProps {
  onSelectAlert: (alert: Alert) => void;
}

type SortField = "createdAt" | "amount" | "riskScore";
type SortOrder = "asc" | "desc";

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onSelectAlert,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [selectedScoreRange, setSelectedScoreRange] =
    useState<string>("ALL");
  const [selectedRule, setSelectedRule] = useState<string>("ALL");

  // Sort State
  const [sortField, setSortField] =
    useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<SortOrder>("desc");

  // Load real alerts from backend
  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getAlerts();

      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load alerts");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Unique countries from alert dataset
  const availableCountries = useMemo(() => {
    const list = Array.from(
      new Set(alerts.map((a) => a.country))
    ).sort();

    return list;
  }, [alerts]);

  // Filtered & Sorted Alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        // 1. Search filter
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();

          const matchesTx = alert.transactionId
            .toLowerCase()
            .includes(query);

          const matchesFrom = alert.fromAccount
            .toLowerCase()
            .includes(query);

          const matchesTo = alert.toAccount
            .toLowerCase()
            .includes(query);

          const matchesCountry = alert.country
            .toLowerCase()
            .includes(query);

          if (
            !matchesTx &&
            !matchesFrom &&
            !matchesTo &&
            !matchesCountry
          ) {
            return false;
          }
        }

        // 2. Status filter
        if (
          selectedStatus !== "ALL" &&
          alert.status !== selectedStatus
        ) {
          return false;
        }

        // 3. Country filter
        if (
          selectedCountry !== "ALL" &&
          alert.country !== selectedCountry
        ) {
          return false;
        }

        // 4. Score range filter
        if (
          selectedScoreRange === "HIGH" &&
          alert.riskScore < 80
        ) {
          return false;
        }

        if (
          selectedScoreRange === "ELEVATED" &&
          (alert.riskScore < 50 ||
            alert.riskScore >= 80)
        ) {
          return false;
        }

        if (
          selectedScoreRange === "BELOW" &&
          alert.riskScore >= 50
        ) {
          return false;
        }

        // 5. Triggered rule filter
        if (selectedRule !== "ALL") {
          const rules = alert.triggeredRules
            .split(",")
            .map((r) => r.trim());

          if (!rules.includes(selectedRule)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortField === "createdAt") {
          comparison =
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime();
        } else if (sortField === "amount") {
          comparison = a.amount - b.amount;
        } else if (sortField === "riskScore") {
          comparison = a.riskScore - b.riskScore;
        }

        return sortOrder === "asc"
          ? comparison
          : -comparison;
      });
  }, [
    alerts,
    searchTerm,
    selectedStatus,
    selectedCountry,
    selectedScoreRange,
    selectedRule,
    sortField,
    sortOrder,
  ]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCountry, selectedScoreRange, selectedRule]);

  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, currentPage, pageSize]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(
        sortOrder === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStatus("ALL");
    setSelectedCountry("ALL");
    setSelectedScoreRange("ALL");
    setSelectedRule("ALL");
  };

  const isFiltered =
    searchTerm !== "" ||
    selectedStatus !== "ALL" ||
    selectedCountry !== "ALL" ||
    selectedScoreRange !== "ALL" ||
    selectedRule !== "ALL";

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            <span>Alerts Management</span>
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Real-time transaction monitoring queues and compliance triage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-export-alerts-csv"
            onClick={() => exportAlertsToCsv(filteredAlerts)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Export CSV ({filteredAlerts.length})
            </span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Filter and Search Bar Container */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">

        {/* Search row */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

            <input
              type="text"
              id="search-alerts-input"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Search by Transaction ID (e.g. TX-2026), Account (AC-...), or Country..."
              className="w-full bg-[#0b1222] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-800/60">

          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>

            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value)
              }
              className="w-full bg-[#0b1222] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">
                Pending (Investigation)
              </option>
              <option value="CONFIRMED">
                Confirmed (AML Alert)
              </option>
              <option value="FALSE_POSITIVE">
                False Positive
              </option>
            </select>
          </div>

          {/* Risk Score */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Risk Score
            </label>

            <select
              id="filter-score-range"
              value={selectedScoreRange}
              onChange={(e) =>
                setSelectedScoreRange(e.target.value)
              }
              className="w-full bg-[#0b1222] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All Scores (0-100)
              </option>
              <option value="HIGH">
                High Risk (80 - 100)
              </option>
              <option value="ELEVATED">
                Elevated Risk (50 - 79)
              </option>
              <option value="BELOW">
                Below Threshold (&lt; 50)
              </option>
            </select>
          </div>

          {/* Rule */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Triggered Rule
            </label>

            <select
              id="filter-rule"
              value={selectedRule}
              onChange={(e) =>
                setSelectedRule(e.target.value)
              }
              className="w-full bg-[#0b1222] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All 5 AML Rules
              </option>

              {AML_RULES.map((rule) => (
                <option
                  key={rule.code}
                  value={rule.code}
                >
                  {rule.code} (+{rule.scoreContribution})
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Jurisdiction / Country
            </label>

            <select
              id="filter-country"
              value={selectedCountry}
              onChange={(e) =>
                setSelectedCountry(e.target.value)
              }
              className="w-full bg-[#0b1222] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All Countries
              </option>

              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c} - {getCountryName(c)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Result Count and Sort */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">

        <div>
          Showing{" "}
          <span className="font-semibold text-white">
            {filteredAlerts.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-white">
            {alerts.length}
          </span>{" "}
          alerts
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            Sort:
          </span>

          <button
            onClick={() =>
              handleSortChange("createdAt")
            }
            className={`flex items-center gap-1 font-medium transition-colors ${sortField === "createdAt"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <span>Date</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() =>
              handleSortChange("amount")
            }
            className={`flex items-center gap-1 font-medium transition-colors ${sortField === "amount"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <span>Amount</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() =>
              handleSortChange("riskScore")
            }
            className={`flex items-center gap-1 font-medium transition-colors ${sortField === "riskScore"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <span>Risk Score</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Alerts Table */}
      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : filteredAlerts.length === 0 ? (
        <div
          id="alerts-empty-state"
          className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800 space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <Filter className="w-6 h-6" />
          </div>

          <h3 className="text-base font-semibold text-slate-200">
            No AML alerts match the selected filters
          </h3>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search criteria, clearing the jurisdiction or rule filter, or resetting all parameters.
          </p>

          <button
            onClick={handleResetFilters}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">

              <thead className="bg-[#0b1222] border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Alert ID</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">From Account</th>
                  <th className="py-3 px-4">To Account</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Triggered Rules</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {paginatedAlerts.map((alert) => {
                  const rules = alert.triggeredRules
                    .split(",")
                    .map((r) => r.trim())
                    .filter(Boolean);

                  return (
                    <tr
                      key={alert.id}
                      id={`alert-row-${alert.id}`}
                      onClick={() =>
                        onSelectAlert(alert)
                      }
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        #{alert.id}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {alert.transactionId}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">
                        {alert.fromAccount}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">
                        {alert.toAccount}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-100">
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
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
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
                        {formatShortDate(
                          alert.createdAt
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAlert(alert);
                          }}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors font-medium inline-flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

          {/* Pagination Controls Footer */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#090f1d] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-white">
                  {Math.min(currentPage * pageSize, filteredAlerts.length)}
                </span>{" "}
                of <span className="font-semibold text-white">{filteredAlerts.length}</span> alerts
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2 text-slate-300 font-mono text-xs">
                  Page <strong className="text-white">{currentPage}</strong> / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};