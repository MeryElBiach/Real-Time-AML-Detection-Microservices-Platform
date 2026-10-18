package com.meryem.aml.reportingservice.service;

import com.meryem.aml.reportingservice.dto.StatsResponse;
import com.meryem.aml.reportingservice.dto.TimeSeriesPoint;
import com.meryem.aml.reportingservice.entity.AlertReport;
import com.meryem.aml.reportingservice.repository.AlertReportRepository;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Locale;
import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.reportingservice.dto.StatusTimeSeriesPoint;
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

        // ============================================================
        // TOTAL ALERTS
        // ============================================================

        long total = alerts.size();

        // ============================================================
        // ALERTS BY AML RULE
        // ============================================================

        Map<String, Long> byRule = alerts.stream()
                .flatMap(a -> Arrays.stream(a.getTriggeredRules().split(",")))
                .map(String::trim)
                .collect(Collectors.groupingBy(
                        rule -> rule,
                        Collectors.counting()
                ));

        // ============================================================
        // ALERTS BY COUNTRY
        // ============================================================

        Map<String, Long> byCountry = alerts.stream()
                .collect(Collectors.groupingBy(
                        AlertReport::getCountry,
                        Collectors.counting()
                ));

        // ============================================================
        // AVERAGE RISK SCORE
        // ============================================================

        double avgScore = alerts.stream()
                .mapToInt(AlertReport::getRiskScore)
                .average()
                .orElse(0);

        // ============================================================
        // HIGH-RISK ALERTS
        // ============================================================

        long highRiskAlerts = alerts.stream()
                .filter(a -> a.getRiskScore() >= HIGH_RISK_THRESHOLD)
                .count();

        // ============================================================
        // RISK SCORE DISTRIBUTION
        // ============================================================

        Map<String, Long> riskScoreDistribution = Map.of(
                "0-49",
                alerts.stream()
                        .filter(a -> a.getRiskScore() < 50)
                        .count(),

                "50-64",
                alerts.stream()
                        .filter(a -> a.getRiskScore() >= 50 && a.getRiskScore() <= 64)
                        .count(),

                "65-79",
                alerts.stream()
                        .filter(a -> a.getRiskScore() >= 65 && a.getRiskScore() <= 79)
                        .count(),

                "80-100",
                alerts.stream()
                        .filter(a -> a.getRiskScore() >= 80)
                        .count()
        );

        // ============================================================
        // DAILY ALERT TIME SERIES
        // ============================================================

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);

        // Both daily series share the same grouping and creation-date semantics.
        var byDate = alerts.stream()
                .filter(a -> a.getCreatedAt() != null)
                .collect(Collectors.groupingBy(a -> a.getCreatedAt().toLocalDate()));

        List<TimeSeriesPoint> timeSeries = byDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new TimeSeriesPoint(entry.getKey().format(formatter), entry.getValue().size()))
                .toList();

        Map<String, Long> statusDistribution = countStatuses(alerts);
        List<StatusTimeSeriesPoint> statusTimeSeries = byDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    var counts = countStatuses(entry.getValue());
                    return new StatusTimeSeriesPoint(entry.getKey().format(formatter),
                            counts.get("PENDING"), counts.get("CONFIRMED"), counts.get("FALSE_POSITIVE"));
                })
                .toList();

        // ============================================================
        // RESPONSE
        // ============================================================

        return new StatsResponse(
                total,
                byRule,
                byCountry,
                avgScore,
                highRiskAlerts,
                riskScoreDistribution,
                timeSeries,
                statusDistribution,
                statusTimeSeries
        );
    }
    private Map<String, Long> countStatuses(List<AlertReport> alerts) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (AlertStatus status : AlertStatus.values()) {
            counts.put(status.name(), 0L);
        }
        for (AlertReport alert : alerts) {
            // Legacy events had no status; new events and the historical replay populate it.
            AlertStatus status = alert.getStatus() == null ? AlertStatus.PENDING : alert.getStatus();
            counts.merge(status.name(), 1L, Long::sum);
        }
        return counts;
    }

}