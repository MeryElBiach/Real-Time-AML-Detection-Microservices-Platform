package com.meryem.aml.reportingservice.service;

import com.meryem.aml.reportingservice.entity.AlertReport;
import com.meryem.aml.reportingservice.model.Alert;
import com.meryem.aml.reportingservice.repository.AlertReportRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.meryem.aml.alertsservice.entity.AlertStatus;

@Service
public class AlertConsumer {

    private final AlertReportRepository alertReportRepository;

    public AlertConsumer(AlertReportRepository alertReportRepository) {
        this.alertReportRepository = alertReportRepository;
    }

    @KafkaListener(topics = "alerts", groupId = "reporting-service-group")
    @Transactional
    public void consume(Alert alert) {
        if (alert.getId() == null) {
            throw new IllegalArgumentException("Alert event must contain its source id");
        }
        AlertReport report = alertReportRepository.findByAlertId(alert.getId())
                .orElseGet(() -> alertReportRepository
                        .findFirstByTransactionIdAndAlertIdIsNullOrderByIdAsc(alert.getTransactionId())
                        .orElseGet(AlertReport::new));
        if (report.getAlertId() != null && report.getStatusVersion() > alert.getStatusVersion()) {
            return; // An older event or snapshot must not revert an investigation decision.
        }
        report.setAlertId(alert.getId());
        report.setStatusVersion(alert.getStatusVersion());
        report.setStatus(alert.getStatus() == null ? AlertStatus.PENDING : alert.getStatus());
        report.setTransactionId(alert.getTransactionId());
        report.setCountry(alert.getCountry());
        report.setAmount(alert.getAmount());
        report.setRiskScore(alert.getRiskScore());
        report.setTriggeredRules(alert.getTriggeredRules());
        report.setCreatedAt(alert.getCreatedAt());

        alertReportRepository.save(report);
    }
}
