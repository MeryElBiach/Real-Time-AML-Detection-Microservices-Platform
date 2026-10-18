package com.meryem.aml.reportingservice.dto;

public class TimeSeriesPoint {

    private String date;
    private long alerts;

    public TimeSeriesPoint(String date, long alerts) {
        this.date = date;
        this.alerts = alerts;
    }

    public String getDate() {
        return date;
    }

    public long getAlerts() {
        return alerts;
    }
}