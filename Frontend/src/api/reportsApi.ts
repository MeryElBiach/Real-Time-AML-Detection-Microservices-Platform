import type { StatsResponse } from "../types";
const API_BASE_URL = "http://localhost:8080/api";
export async function getReportStats(): Promise<StatsResponse> {
  const token =
    localStorage.getItem("aml_token") ||
    sessionStorage.getItem("aml_token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`${API_BASE_URL}/reports/stats`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch report statistics: ${response.status}`
    );
  }

  return response.json();
}