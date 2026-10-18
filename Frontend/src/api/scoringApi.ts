import type { AMLRuleDefinition, EvaluationRequest, EvaluationResponse } from "../types";

const API_BASE_URL = "http://localhost:8080/api/scoring";

async function scoringRequest<T>(path: string, options: RequestInit): Promise<T> {
  const token = localStorage.getItem("aml_token") || sessionStorage.getItem("aml_token");
  if (!token) throw new Error("No authentication token found");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Scoring request failed: ${response.status}`);
  return response.json();
}

export function getRules(signal?: AbortSignal): Promise<AMLRuleDefinition[]> {
  return scoringRequest("/rules", { method: "GET", signal });
}

export function evaluateTransaction(request: EvaluationRequest, signal?: AbortSignal): Promise<EvaluationResponse> {
  return scoringRequest("/evaluate", { method: "POST", body: JSON.stringify(request), signal });
}
