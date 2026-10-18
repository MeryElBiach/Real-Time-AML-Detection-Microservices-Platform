import type { Alert } from "../types";

export function exportAlertsToCsv(alerts: Alert[], filename: string = "sentinel_aml_alerts.csv") {
    const headers = [
        "Alert ID",
        "Transaction ID",
        "From Account",
        "To Account",
        "Amount",
        "Currency",
        "Country",
        "Risk Score",
        "Triggered Rules",
        "Status",
        "Created At",
    ];

    const rows = alerts.map((a) => [
        a.id,
        `"${a.transactionId}"`,
        `"${a.fromAccount}"`,
        `"${a.toAccount}"`,
        a.amount,
        `"${a.currency || "MAD"}"`,
        `"${a.country}"`,
        a.riskScore,
        `"${a.triggeredRules}"`,
        `"${a.status}"`,
        `"${a.createdAt}"`,
    ]);

    const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
