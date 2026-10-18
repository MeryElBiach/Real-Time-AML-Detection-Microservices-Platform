package com.meryem.aml.reportingservice.dto;

import java.util.List;
import java.util.Map;

public class StatsResponse {

    private long totalAlerts;
    private Map<String, Long> alertsByRule;
    private Map<String, Long> alertsByCountry;
    private double averageRiskScore;
    private long highRiskAlerts;

    private Map<String, Long> riskScoreDistribution;
    private List<TimeSeriesPoint> timeSeries;
    private Map<String, Long> statusDistribution;
    private List<StatusTimeSeriesPoint> statusTimeSeries;

    public StatsResponse(
            long totalAlerts,
            Map<String, Long> alertsByRule,
            Map<String, Long> alertsByCountry,
            double averageRiskScore,
            long highRiskAlerts,
            Map<String, Long> riskScoreDistribution,
            List<TimeSeriesPoint> timeSeries,
            Map<String, Long> statusDistribution,
            List<StatusTimeSeriesPoint> statusTimeSeries) {

        this.totalAlerts = totalAlerts;
        this.alertsByRule = alertsByRule;
        this.alertsByCountry = alertsByCountry;
        this.averageRiskScore = averageRiskScore;
        this.highRiskAlerts = highRiskAlerts;
        this.riskScoreDistribution = riskScoreDistribution;
        this.timeSeries = timeSeries;
        this.statusDistribution = statusDistribution;
        this.statusTimeSeries = statusTimeSeries;
    }

    public Map<String, Long> getStatusDistribution() { return statusDistribution; }

    public List<StatusTimeSeriesPoint> getStatusTimeSeries() { return statusTimeSeries; }

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

    public Map<String, Long> getRiskScoreDistribution() {
        return riskScoreDistribution;
    }

    public List<TimeSeriesPoint> getTimeSeries() {
        return timeSeries;
    }
}