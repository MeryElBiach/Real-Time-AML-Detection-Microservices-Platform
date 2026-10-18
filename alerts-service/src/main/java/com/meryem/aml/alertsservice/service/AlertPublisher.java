package com.meryem.aml.alertsservice.service;

import com.meryem.aml.alertsservice.entity.Alert;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class AlertPublisher {
    private final KafkaTemplate<String, Alert> kafkaTemplate;

    public AlertPublisher(KafkaTemplate<String, Alert> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(Alert alert) {
        try {
            // Keep the existing partition key for both creation and status changes.
            kafkaTemplate.send("alerts", alert.getTransactionId(), alert).get(10, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw publicationFailure(exception);
        } catch (ExecutionException | TimeoutException exception) {
            throw publicationFailure(exception);
        }
    }

    private ResponseStatusException publicationFailure(Exception cause) {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Alert saved; reporting publication failed. Retry the same status to synchronize.", cause);
    }
}
