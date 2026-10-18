import { useState } from "react";
import {
  X,
  ShieldAlert,
  Calendar,
  CreditCard,
  Globe2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Send,
  HelpCircle,
} from "lucide-react";
import type { Alert, AlertStatus } from "../types";
import { AML_RULES, SIMULATION_RISK_COUNTRIES } from "../data/mockData";
import { formatCurrency, formatDate, getCountryName } from "../utils/formatters";
import { RiskScoreBadge } from "./RiskScoreBadge";
import { StatusBadge } from "./StatusBadge";
import { RuleBadge } from "./RuleBadge";

interface AlertDetailDrawerProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (alertId: number, newStatus: AlertStatus) => Promise<void>;
  onAddNote: (alertId: number, noteText: string) => void;
}

export const AlertDetailDrawer: React.FC<AlertDetailDrawerProps> = ({
  alert,
  isOpen,
  onClose,
  onUpdateStatus,
  onAddNote,
}) => {
  const [newNoteText, setNewNoteText] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !alert) return null;

  const ruleCodes = alert.triggeredRules.split(",").map((r) => r.trim()).filter(Boolean);
  const isSimulationRiskCountry = SIMULATION_RISK_COUNTRIES.includes(alert.country);

  const handleStatusChange = async (status: AlertStatus) => {
    if (isSaving) return;
    setIsSaving(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      await onUpdateStatus(alert.id, status);
      setActionSuccess(`Status updated to ${status}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Status update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(alert.id, newNoteText.trim());
    setNewNoteText("");
  };

  return (
    <div
      id="alert-detail-drawer-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        id="alert-detail-drawer-panel"
        className="w-full max-w-2xl bg-[#0b1120] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/80 bg-[#0d1424] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800/50 flex items-center justify-center text-blue-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  {alert.transactionId}
                </h2>
                <StatusBadge status={alert.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AML Alert #{alert.id} • Created {formatDate(alert.createdAt)}
              </p>
            </div>
          </div>
          <button
            id="close-drawer-button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action success alert banner */}
        {actionSuccess && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div role="alert" className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-xs text-red-400">
            {actionError}
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Institutional Compliance Disclaimer */}
          <div className="p-3.5 rounded-lg bg-blue-950/25 border border-blue-800/30 text-xs text-blue-200/90 leading-relaxed flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-blue-300">Transaction Monitoring Notice :</span>{" "}
              Cette transaction présente un ou plusieurs indicateurs de risque AML. Elle fait l'objet d'une analyse de conformité et ne doit pas être qualifiée de blanchiment avéré sans investigation complète.
            </div>
          </div>

          {/* Section 1: Risk Assessment Overview */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Risk Assessment
            </h3>
            <RiskScoreBadge score={alert.riskScore} size="lg" />
          </div>

          {/* Section 2: Transaction Information */}
          <div className="bg-slate-900/40 rounded-lg border border-slate-800/80 p-4 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Transaction Information
            </h3>

            {/* Financial Amount Highlight */}
            <div className="flex items-baseline justify-between p-3 rounded-md bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-[11px] text-slate-400">Total Transaction Amount</div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {formatCurrency(alert.amount, alert.currency || "MAD")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Operating Currency</div>
                <div className="text-sm font-semibold font-mono text-blue-400 mt-0.5">
                  {alert.currency || "MAD"}
                </div>
              </div>
            </div>

            {/* Routing from/to accounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Originating Account (From)</span>
                </div>
                <div className="text-sm font-mono font-medium text-slate-200 truncate">
                  {alert.fromAccount}
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Beneficiary Account (To)</span>
                </div>
                <div className="text-sm font-mono font-medium text-slate-200 truncate">
                  {alert.toAccount}
                </div>
              </div>
            </div>

            {/* Country and Timestamp */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-md bg-slate-900/50 border border-slate-800/60">
                <div className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
                  <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jurisdiction / Country</span>
                </div>
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-xs text-white">
                    {alert.country}
                  </span>
                  <span className="truncate">{getCountryName(alert.country)}</span>
                </div>
                {isSimulationRiskCountry && (
                  <div className="mt-1 text-[10px] text-amber-400/90 font-medium">
                    Jurisdiction incluse dans la liste de simulation à risque.
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-md bg-slate-900/50 border border-slate-800/60">
                <div className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Detection Timestamp</span>
                </div>
                <div className="font-mono text-slate-200 text-xs">
                  {formatDate(alert.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Triggered AML Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Triggered AML Rules ({ruleCodes.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Rule Engine Assessment
              </span>
            </div>

            <div className="space-y-2.5">
              {ruleCodes.map((code) => {
                const ruleDef = AML_RULES.find((r) => r.code === code);
                return (
                  <div
                    key={code}
                    className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <RuleBadge code={code} size="md" />
                        <span className="text-xs font-semibold text-slate-200">
                          {ruleDef?.name || code}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded">
                        +{ruleDef?.scoreContribution || 0} pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-1">
                      {ruleDef?.description}
                    </p>
                    {ruleDef?.simulationNote && (
                      <p className="text-[11px] text-slate-400 italic">
                        {ruleDef.simulationNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Investigation Workflow Actions */}
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Analyst Investigation Decision
            </h3>
            <p className="text-xs text-slate-400 mb-3.5">
              Select an investigation outcome to update the alert state in this prototype session.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                id="btn-mark-confirmed"
                disabled={isSaving}
                onClick={() => handleStatusChange("CONFIRMED")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  alert.status === "CONFIRMED"
                    ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/50"
                    : "bg-slate-900 text-slate-300 border-slate-700 hover:border-rose-500 hover:text-rose-300 hover:bg-rose-500/10"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-rose-400" />
                <span>Mark Confirmed</span>
              </button>

              <button
                id="btn-mark-false-positive"
                disabled={isSaving}
                onClick={() => handleStatusChange("FALSE_POSITIVE")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  alert.status === "FALSE_POSITIVE"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50"
                    : "bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500 hover:text-emerald-300 hover:bg-emerald-500/10"
                }`}
              >
                <XCircle className="w-4 h-4 text-emerald-400" />
                <span>False Positive</span>
              </button>

              <button
                id="btn-revert-pending"
                disabled={isSaving}
                onClick={() => handleStatusChange("PENDING")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  alert.status === "PENDING"
                    ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/50"
                    : "bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500 hover:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Keep Pending</span>
              </button>
            </div>
          </div>

          {/* Section 5: Investigation Notes (Section 21) */}
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Investigation Audit Notes</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Prototype Log</span>
            </div>

            {/* Existing notes */}
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {(!alert.notes || alert.notes.length === 0) && (
                <div className="text-xs text-slate-400 italic py-2">
                  No investigation notes recorded for this alert yet.
                </div>
              )}
              {alert.notes?.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 rounded-md bg-slate-950/70 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-medium text-slate-300">{note.author}</span>
                    <span className="font-mono">{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-slate-200">{note.text}</p>
                </div>
              ))}
            </div>

            {/* Add note input */}
            <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
              <input
                type="text"
                id="input-investigation-note"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add compliance note (e.g. Document requested, justification verified)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                id="btn-submit-note"
                disabled={!newNoteText.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            </form>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0d1424] flex items-center justify-between text-xs text-slate-400">
          <span>Sentinel AML Prototype ID #{alert.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
