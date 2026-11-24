package com.meryem.aml.reportingservice.service;

import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.reportingservice.entity.AlertReport;
import com.meryem.aml.reportingservice.model.Alert;
import com.meryem.aml.reportingservice.repository.AlertReportRepository;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportingEventCompatibilityTest {
    @Test void enrichedAlertEventsStillFeedTheExistingReportingProjection() {
        String event = """
                {"id":42,"transactionId":"TX-EVIDENCE","fromAccount":"ACC-1","toAccount":"ACC-2",
                 "amount":125000.25,"country":"IR","riskScore":100,"triggeredRules":"HIGH_AMOUNT,RISK_COUNTRY,FOREIGN_CURRENCY",
                 "createdAt":"2026-11-24T10:00:00","status":"CONFIRMED","statusVersion":2,
                 "currency":"USD","transactionTimestamp":"2026-11-24T09:00:00","scoringVersion":"demo-v1",
                 "ruleHits":[{"code":"HIGH_AMOUNT","points":50,"ruleVersion":"demo-v1",
                   "evidence":{"amount":"125000.25","currency":"USD","threshold":"100000.00"}}]}
                """;
        var repository = mock(AlertReportRepository.class);
        when(repository.findByAlertId(42L)).thenReturn(Optional.empty());
        when(repository.findFirstByTransactionIdAndAlertIdIsNullOrderByIdAsc("TX-EVIDENCE"))
                .thenReturn(Optional.empty());
        try (var deserializer = new JsonDeserializer<>(Alert.class, false)) {
            Alert decoded = deserializer.deserialize("alerts", event.getBytes(StandardCharsets.UTF_8));
            new AlertConsumer(repository).consume(decoded);
        }
        var captured = org.mockito.ArgumentCaptor.forClass(AlertReport.class);
        verify(repository).save(captured.capture());
        AlertReport report = captured.getValue();
        assertEquals(42L, report.getAlertId());
        assertEquals(AlertStatus.CONFIRMED, report.getStatus());
        assertEquals(2, report.getStatusVersion());
        assertEquals(100, report.getRiskScore());
        assertEquals(125000.25, report.getAmount());
        assertEquals("HIGH_AMOUNT,RISK_COUNTRY,FOREIGN_CURRENCY", report.getTriggeredRules());
    }
}
