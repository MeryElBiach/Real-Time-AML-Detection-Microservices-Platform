package com.meryem.aml.reportingservice.dto;

public record StatusTimeSeriesPoint(String date, long pending, long confirmed, long falsePositive) {
}
