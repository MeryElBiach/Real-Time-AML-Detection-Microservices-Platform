package com.meryem.aml.reportingservice.service;

import com.meryem.aml.reportingservice.dto.StatsResponse;
import com.meryem.aml.reportingservice.entity.AlertReport;
import com.meryem.aml.reportingservice.repository.AlertReportRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportingStatsService {

    private static final int HIGH_RISK_THRESHOLD = 50;

    private final AlertReportRepository alertReportRepository;

    public ReportingStatsService(AlertReportRepository alertReportRepository) {
        this.alertReportRepository = alertReportRepository;
    }

    public StatsResponse computeStats() {

        List<AlertReport> alerts = alertReportRepository.findAll();

        // Total number of alerts
        long total = alerts.size();

        // Number of alerts by AML rule
        Map<String, Long> byRule = alerts.stream()
                .flatMap(a -> Arrays.stream(a.getTriggeredRules().split(",")))
                .map(String::trim)
                .collect(Collectors.groupingBy(
                        rule -> rule,
                        Collectors.counting()
                ));

        // Number of alerts by country
        Map<String, Long> byCountry = alerts.stream()
                .collect(Collectors.groupingBy(
                        AlertReport::getCountry,
                        Collectors.counting()
                ));

        // Average risk score
        double avgScore = alerts.stream()
                .mapToInt(AlertReport::getRiskScore)
                .average()
                .orElse(0);

        // Number of high-risk alerts
        // High risk is defined by the AML threshold: riskScore >= 50
        long highRiskAlerts = alerts.stream()
                .filter(a -> a.getRiskScore() >= HIGH_RISK_THRESHOLD)
                .count();

        return new StatsResponse(
                total,
                byRule,
                byCountry,
                avgScore,
                highRiskAlerts
        );
    }
}