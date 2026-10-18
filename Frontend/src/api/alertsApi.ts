import type { Alert, AlertStatus } from "../types";

const API_BASE_URL = "http://localhost:8080/api";

export async function getAlerts(): Promise<Alert[]> {
    const token =
        localStorage.getItem("aml_token") ||
        sessionStorage.getItem("aml_token");

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
    }

    return response.json();
}
export async function updateAlertStatus(id: number, status: AlertStatus): Promise<Alert> {
    const token = localStorage.getItem("aml_token") || sessionStorage.getItem("aml_token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${API_BASE_URL}/alerts/${id}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(status),
    });
    if (!response.ok) {
        throw new Error(response.status === 503
            ? "The alert was saved but reporting could not be synchronized. Retry the same status."
            : `Failed to update alert status: ${response.status}`);
    }
    return response.json();
}
