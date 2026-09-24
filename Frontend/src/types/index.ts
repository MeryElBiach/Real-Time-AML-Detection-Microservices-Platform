export type AlertStatus =
  | "PENDING"
  | "CONFIRMED"
  | "FALSE_POSITIVE";

export type RuleCode =
  | "HIGH_AMOUNT"
  | "STRUCTURING_PATTERN"
  | "RISK_COUNTRY"
  | "ROUND_AMOUNT"
  | "FOREIGN_CURRENCY";

export interface Transaction {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  country: string;
  timestamp: string;
}

export interface InvestigationNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Alert {
  id: number;
  transactionId: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency?: string;
  country: string;
  riskScore: number;
  triggeredRules: string;
  createdAt: string;
  status: AlertStatus;
  notes?: InvestigationNote[];
}

export interface StatsResponse {
  totalAlerts: number;
  alertsByRule: Record<string, number>;
  alertsByCountry: Record<string, number>;
  averageRiskScore: number;
  highRiskAlerts: number;
  alertsToday?: number;
}

export interface AMLRuleDefinition {
  code: RuleCode;
  name: string;
  condition: string;
  scoreContribution: number;
  description: string;
  status: "Active" | "Inactive";
  simulationNote?: string;
}

export interface UserSession {
  email: string;
  name: string;
  role: string;
  institution: string;
}