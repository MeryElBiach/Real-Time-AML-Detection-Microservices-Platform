import React, { useEffect, useState } from "react";
import {
    BookOpen,
    CheckCircle2,
    Calculator,
    Info,
} from "lucide-react";
import { getRules, evaluateTransaction } from "../api/scoringApi";
import type { AMLRuleDefinition, EvaluationResponse } from "../types";

import { RuleBadge } from "../components/RuleBadge";
import { RiskScoreBadge } from "../components/RiskScoreBadge";

export const RulesPage: React.FC = () => {
    // Interactive Rule Tester State
    const [testAmount, setTestAmount] = useState<number>(125000);
    const [testCurrency, setTestCurrency] = useState<string>("MAD");
    const [testCountry, setTestCountry] = useState<string>("MA");

    const [rules, setRules] = useState<AMLRuleDefinition[]>([]);
    const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
    const [rulesError, setRulesError] = useState<string | null>(null);
    const [evaluationError, setEvaluationError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        getRules(controller.signal).then(setRules).catch(() => {
            if (!controller.signal.aborted) setRulesError("Rules could not be loaded. Refresh the page to try again.");
        });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setEvaluation(null);
        setEvaluationError(null);
        const timer = setTimeout(() => {
            evaluateTransaction({ amount: testAmount, currency: testCurrency, country: testCountry }, controller.signal)
                .then((result) => { if (!controller.signal.aborted) setEvaluation(result); })
                .catch(() => { if (!controller.signal.aborted) setEvaluationError("Unable to evaluate these details. Check the amount, currency and country, then try again."); });
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [testAmount, testCurrency, testCountry]);

    const evaluationResults = evaluation?.ruleEvaluations ?? [];
    const totalCalculatedScore = evaluation?.riskScore;
    const isAlertThresholdReached = totalCalculatedScore !== undefined && totalCalculatedScore >= 50;

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <span>AML Rules</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Review the active rules and test how they affect a transaction's risk score.
                </p>
            </div>

            {/* Institutional Methodology Banner */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>How scoring works</span>
                </div>
                <p>
                    Each matching rule adds points to the <strong>risk score</strong>, up to a maximum of <strong>100</strong>.
                    In transaction monitoring, a score of <strong>50 or more</strong> creates an alert for review.
                    A rule match is a reason to investigate, not a finding of money laundering.
                </p>
            </div>

            {/* The 5 AML Rules Cards */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Rule catalog ({rules.length})
                    </h3>
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {rules.length ? `${rules.filter((rule) => rule.status === "Active").length} active rules` : rulesError || "Loading rules..."}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {rules.map((rule, idx) => (
                        <div
                            key={rule.code}
                            id={`rule-definition-${rule.code}`}
                            className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-bold text-slate-400 w-5">
                                        0{idx + 1}
                                    </span>
                                    <RuleBadge code={rule.code} size="md" definition={rule} />
                                    <span className="text-sm font-bold text-white">
                                        {rule.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2.5 py-1 rounded">
                                        Risk score: +{rule.scoreContribution}
                                    </span>
                                    <span className="text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded">
                                        {rule.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        Trigger condition
                                    </div>
                                    <div className="font-mono text-blue-300 font-medium">
                                        {rule.condition}
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 md:col-span-2">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        About this rule
                                    </div>
                                    <div className="text-slate-200">
                                        {rule.description}
                                    </div>
                                    {rule.simulationNote && (
                                        <div className="mt-1.5 text-[11px] text-slate-400 italic">
                                            {rule.simulationNote}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Interactive Simulation Evaluator for Analysts */}
            <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-blue-400" />
                            <span>Test a transaction</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Change the details below to see the score and matching rules. This test does not create a transaction or an alert.
                        </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                        Test mode
                    </span>
                </div>

                {/* Input Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Amount
                        </label>
                        <input
                            type="number"
                            value={testAmount}
                            onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. 125000"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setTestAmount(9900)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                            >
                                9,900
                            </button>
                            <button
                                type="button"
                                onClick={() => setTestAmount(125000)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                            >
                                125,000
                            </button>
                            <button
                                type="button"
                                onClick={() => setTestAmount(15000)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                            >
                                15,000
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Currency
                        </label>
                        <select
                            value={testCurrency}
                            onChange={(e) => setTestCurrency(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="MAD">MAD - Moroccan dirham</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="USD">USD - US dollar</option>
                            <option value="GBP">GBP - British pound</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Country
                        </label>
                        <select
                            value={testCountry}
                            onChange={(e) => setTestCountry(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="MA">MA - Morocco</option>
                            <option value="FR">FR - France</option>
                            <option value="ES">ES - Spain</option>
                            <option value="GB">GB - United Kingdom</option>
                            <option value="KP">KP - North Korea</option>
                            <option value="IR">IR - Iran</option>
                            <option value="SY">SY - Syria</option>
                        </select>
                    </div>
                </div>

                {/* Live Evaluation Breakdown */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Test result
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold font-mono text-white">
                                    Risk Score: {totalCalculatedScore ?? "..."} / 100
                                </span>
                                {evaluation ? (isAlertThresholdReached ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        Alert threshold reached
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                        Below alert threshold
                                    </span>
                                )) : (
                                    <span role={evaluationError ? "alert" : "status"} className="text-xs text-slate-400">
                                        {evaluationError || "Calculating score..."}
                                    </span>
                                )}
                            </div>
                        </div>
                        {totalCalculatedScore !== undefined && <RiskScoreBadge score={totalCalculatedScore} size="md" />}
                    </div>

                    <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Results by rule
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                            {evaluationResults.map(({ code, triggered, contribution }) => (
                                <div
                                    key={code}
                                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${triggered
                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                            : "bg-slate-900/40 border-slate-800/80 text-slate-400"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {triggered ? (
                                            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                        ) : (
                                            <span className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                                        )}
                                        <span className="font-mono text-xs">{code}</span>
                                    </div>
                                    <span className="font-mono font-bold">
                                        {triggered ? `+${contribution}` : "0"} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
