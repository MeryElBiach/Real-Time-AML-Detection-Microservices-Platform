package com.meryem.aml.reportingservice.dto;

import java.util.Map;

public class StatsResponse {

    private long totalAlerts;
    private Map<String, Long> alertsByRule;
    private Map<String, Long> alertsByCountry;
    private double averageRiskScore;
    private long highRiskAlerts;

    public StatsResponse(
            long totalAlerts,
            Map<String, Long> alertsByRule,
            Map<String, Long> alertsByCountry,
            double averageRiskScore,
            long highRiskAlerts) {

        this.totalAlerts = totalAlerts;
        this.alertsByRule = alertsByRule;
        this.alertsByCountry = alertsByCountry;
        this.averageRiskScore = averageRiskScore;
        this.highRiskAlerts = highRiskAlerts;
    }

    public long getTotalAlerts() {
        return totalAlerts;
    }

    public Map<String, Long> getAlertsByRule() {
        return alertsByRule;
    }

    public Map<String, Long> getAlertsByCountry() {
        return alertsByCountry;
    }

    public double getAverageRiskScore() {
        return averageRiskScore;
    }

    public long getHighRiskAlerts() {
        return highRiskAlerts;
    }
}