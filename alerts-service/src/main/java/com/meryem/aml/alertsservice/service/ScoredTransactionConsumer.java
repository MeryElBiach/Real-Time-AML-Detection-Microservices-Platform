package com.meryem.aml.alertsservice.service;

import com.meryem.aml.alertsservice.entity.Alert;
import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.alertsservice.model.ScoredTransaction;
import com.meryem.aml.alertsservice.repository.AlertRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ScoredTransactionConsumer {

    private static final int ALERT_THRESHOLD = 50;

    private final AlertRepository alertRepository;
    private final KafkaTemplate<String, Alert> kafkaTemplate;

    public ScoredTransactionConsumer(AlertRepository alertRepository,
                                     KafkaTemplate<String, Alert> kafkaTemplate) {
        this.alertRepository = alertRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "scored-transactions", groupId = "alerts-service-group")
    public void consume(ScoredTransaction scoredTransaction) {
        if (scoredTransaction.getRiskScore() < ALERT_THRESHOLD) {
            return;
        }

        Alert alert = new Alert();
        alert.setTransactionId(scoredTransaction.getTransaction().getId());
        alert.setFromAccount(scoredTransaction.getTransaction().getFromAccount());
        alert.setToAccount(scoredTransaction.getTransaction().getToAccount());
        alert.setAmount(scoredTransaction.getTransaction().getAmount());
        alert.setCountry(scoredTransaction.getTransaction().getCountry());
        alert.setRiskScore(scoredTransaction.getRiskScore());
        alert.setTriggeredRules(String.join(",", scoredTransaction.getTriggeredRules()));
        alert.setCreatedAt(LocalDateTime.now());
        alert.setStatus(AlertStatus.PENDING);
        Alert saved = alertRepository.save(alert);
        kafkaTemplate.send("alerts", saved.getTransactionId(), saved);
    }
}