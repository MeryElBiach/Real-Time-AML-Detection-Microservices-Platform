package com.meryem.aml.reportingservice.service;

import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.reportingservice.entity.AlertReport;
import com.meryem.aml.reportingservice.model.Alert;
import com.meryem.aml.reportingservice.repository.AlertReportRepository;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StatusReportingTest {
    private final AlertReportRepository repository = mock(AlertReportRepository.class);

    private AlertReport report(AlertStatus status, String date) {
        AlertReport report = new AlertReport();
        report.setStatus(status);
        report.setCreatedAt(LocalDateTime.parse(date));
        report.setCountry("MA");
        report.setTriggeredRules("HIGH_AMOUNT");
        report.setRiskScore(50);
        return report;
    }

    @Test void statisticsShareDailyTotalsAndUseCreationDates() {
        when(repository.findAll()).thenReturn(List.of(
                report(AlertStatus.CONFIRMED, "2026-09-24T10:00:00"),
                report(AlertStatus.FALSE_POSITIVE, "2026-09-24T12:00:00"),
                report(AlertStatus.PENDING, "2026-09-24T13:00:00"),
                report(null, "2026-08-04T10:00:00")));
        var stats = new ReportingStatsService(repository).computeStats();
        assertEquals(4, stats.getTotalAlerts());
        assertEquals(2, stats.getStatusDistribution().get("PENDING"));
        assertEquals(1, stats.getStatusDistribution().get("CONFIRMED"));
        assertEquals(1, stats.getStatusDistribution().get("FALSE_POSITIVE"));
        assertEquals("04 Aug", stats.getTimeSeries().get(0).getDate());
        for (int i = 0; i < stats.getTimeSeries().size(); i++) {
            var total = stats.getTimeSeries().get(i);
            var statuses = stats.getStatusTimeSeries().get(i);
            assertEquals(total.getDate(), statuses.date());
            assertEquals(total.getAlerts(), statuses.pending() + statuses.confirmed() + statuses.falsePositive());
        }
    }

    @Test void emptyDatabaseReturnsThreeZerosAndNoInventedDays() {
        when(repository.findAll()).thenReturn(List.of());
        var stats = new ReportingStatsService(repository).computeStats();
        assertEquals(3, stats.getStatusDistribution().size());
        assertTrue(stats.getStatusDistribution().values().stream().allMatch(n -> n == 0));
        assertTrue(stats.getTimeSeries().isEmpty());
        assertTrue(stats.getStatusTimeSeries().isEmpty());
    }

    @Test void repeatedStatusEventsUpdateTheSameReportAndIgnoreOlderVersions() {
        AlertReport report = report(AlertStatus.PENDING, "2026-09-24T10:00:00");
        report.setId(400L);
        report.setAlertId(123L);
        when(repository.findByAlertId(123L)).thenReturn(Optional.of(report));
        Alert event = new Alert();
        event.setId(123L);
        event.setTransactionId("TX-123");
        event.setStatus(AlertStatus.CONFIRMED);
        event.setStatusVersion(2);
        var consumer = new AlertConsumer(repository);
        consumer.consume(event);
        consumer.consume(event);
        assertEquals(400L, report.getId());
        assertEquals(AlertStatus.CONFIRMED, report.getStatus());
        verify(repository, times(2)).save(report);
        event.setStatus(AlertStatus.PENDING);
        event.setStatusVersion(1);
        consumer.consume(event);
        assertEquals(AlertStatus.CONFIRMED, report.getStatus());
        verify(repository, times(2)).save(report);
    }

    @Test void legacyReportIsLinkedToSourceIdWithoutInsertingAnotherRow() {
        AlertReport legacy = report(null, "2026-09-24T10:00:00");
        legacy.setId(400L);
        when(repository.findByAlertId(123L)).thenReturn(Optional.empty());
        when(repository.findFirstByTransactionIdAndAlertIdIsNullOrderByIdAsc("TX-123"))
                .thenReturn(Optional.of(legacy));
        Alert event = new Alert();
        event.setId(123L);
        event.setTransactionId("TX-123");
        event.setStatus(AlertStatus.FALSE_POSITIVE);
        new AlertConsumer(repository).consume(event);
        assertEquals(400L, legacy.getId());
        assertEquals(123L, legacy.getAlertId());
        assertEquals(AlertStatus.FALSE_POSITIVE, legacy.getStatus());
        verify(repository).save(legacy);
    }
}
