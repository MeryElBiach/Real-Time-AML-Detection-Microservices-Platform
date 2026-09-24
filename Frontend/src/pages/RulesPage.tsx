import React, { useState } from "react";
import {
    BookOpen,
    CheckCircle2,
    Calculator,
    Info,
} from "lucide-react";
import { AML_RULES, SIMULATION_RISK_COUNTRIES } from "../data/mockData";

import { RuleBadge } from "../components/RuleBadge";
import { RiskScoreBadge } from "../components/RiskScoreBadge";

export const RulesPage: React.FC = () => {
    // Interactive Rule Tester State
    const [testAmount, setTestAmount] = useState<number>(125000);
    const [testCurrency, setTestCurrency] = useState<string>("MAD");
    const [testCountry, setTestCountry] = useState<string>("MA");

    // Evaluate which rules trigger based on current inputs
    const evaluationResults = AML_RULES.map((rule) => {
        let triggered = false;
        switch (rule.code) {
            case "HIGH_AMOUNT":
                triggered = testAmount >= 100000;
                break;
            case "STRUCTURING_PATTERN":
                triggered = testAmount === 9900;
                break;
            case "RISK_COUNTRY":
                triggered = SIMULATION_RISK_COUNTRIES.includes(testCountry.toUpperCase());
                break;
            case "ROUND_AMOUNT":
                triggered = testAmount >= 10000 && testAmount % 5000 === 0;
                break;
            case "FOREIGN_CURRENCY":
                triggered = ["EUR", "USD", "GBP"].includes(testCurrency.toUpperCase());
                break;
        }
        return {
            rule,
            triggered,
            contribution: triggered ? rule.scoreContribution : 0,
        };
    });

    const totalCalculatedScore = Math.min(
        100,
        evaluationResults.reduce((acc, curr) => acc + curr.contribution, 0)
    );

    const isAlertThresholdReached = totalCalculatedScore >= 50;

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <span>AML Rules Engine</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Standardized detection heuristics, scoring contributions, and simulated risk triggers
                </p>
            </div>

            {/* Institutional Methodology Banner */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>Compliance Scoring Methodology</span>
                </div>
                <p>
                    Le moteur de détection AML évalue chaque transaction entrante selon les 5 règles prédéfinies ci-dessous.
                    Chaque règle déclenchée contribue au <strong>Risk Score (0 à 100)</strong>. Dès que le score cumulé atteint ou dépasse le seuil de <strong>50</strong>, une alerte est automatiquement enregistrée pour revue par un analyste de conformité.
                </p>
            </div>

            {/* The 5 AML Rules Cards */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Active AML Rule Catalog (5 Rules)
                    </h3>
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        All 5 Rules Active in Engine
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {AML_RULES.map((rule, idx) => (
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
                                    <RuleBadge code={rule.code} size="md" />
                                    <span className="text-sm font-bold text-white">
                                        {rule.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2.5 py-1 rounded">
                                        Score Contribution: +{rule.scoreContribution}
                                    </span>
                                    <span className="text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded">
                                        {rule.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        Condition Logique
                                    </div>
                                    <div className="font-mono text-blue-300 font-medium">
                                        {rule.condition}
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 md:col-span-2">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        Description & Objectif Métier
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
                            <span>Interactive Rule Simulation Evaluator</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Simulate a custom transaction to test scoring behavior across the 5 AML heuristics
                        </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                        Analyst Workbench
                    </span>
                </div>

                {/* Input Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Transaction Amount
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
                                9,900 (Structuring)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTestAmount(125000)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                            >
                                125,000 (High Amt)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTestAmount(15000)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                            >
                                15,000 (Round)
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
                            <option value="MAD">MAD (Domestic Currency)</option>
                            <option value="EUR">EUR (Foreign Currency - +20)</option>
                            <option value="USD">USD (Foreign Currency - +20)</option>
                            <option value="GBP">GBP (Foreign Currency - +20)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Country Jurisdiction
                        </label>
                        <select
                            value={testCountry}
                            onChange={(e) => setTestCountry(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="MA">MA - Morocco (Standard)</option>
                            <option value="FR">FR - France (Standard)</option>
                            <option value="ES">ES - Spain (Standard)</option>
                            <option value="GB">GB - United Kingdom (Standard)</option>
                            <option value="KP">KP - North Korea (Simulated Risk Country - +60)</option>
                            <option value="IR">IR - Iran (Simulated Risk Country - +60)</option>
                            <option value="SY">SY - Syria (Simulated Risk Country - +60)</option>
                        </select>
                    </div>
                </div>

                {/* Live Evaluation Breakdown */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Simulated Output Result
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold font-mono text-white">
                                    Risk Score: {totalCalculatedScore} / 100
                                </span>
                                {isAlertThresholdReached ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        Generates AML Alert (Score &ge; 50)
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                        Below Alert Threshold (Score &lt; 50)
                                    </span>
                                )}
                            </div>
                        </div>
                        <RiskScoreBadge score={totalCalculatedScore} size="md" />
                    </div>

                    <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Rule Trigger Status For This Test Scenario:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                            {evaluationResults.map(({ rule, triggered, contribution }) => (
                                <div
                                    key={rule.code}
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
                                        <span className="font-mono text-xs">{rule.code}</span>
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
