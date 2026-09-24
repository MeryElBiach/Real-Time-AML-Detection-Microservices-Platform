package com.meryem.aml.reportingservice.service;

import com.meryem.aml.reportingservice.entity.AlertReport;
import com.meryem.aml.reportingservice.model.Alert;
import com.meryem.aml.reportingservice.repository.AlertReportRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class AlertConsumer {

    private final AlertReportRepository alertReportRepository;

    public AlertConsumer(AlertReportRepository alertReportRepository) {
        this.alertReportRepository = alertReportRepository;
    }

    @KafkaListener(topics = "alerts", groupId = "reporting-service-group")
    public void consume(Alert alert) {
        AlertReport report = new AlertReport();
        report.setTransactionId(alert.getTransactionId());
        report.setCountry(alert.getCountry());
        report.setAmount(alert.getAmount());
        report.setRiskScore(alert.getRiskScore());
        report.setTriggeredRules(alert.getTriggeredRules());
        report.setCreatedAt(alert.getCreatedAt());

        alertReportRepository.save(report);
    }
}