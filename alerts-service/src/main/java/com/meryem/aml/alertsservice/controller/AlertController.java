package com.meryem.aml.alertsservice.controller;

import com.meryem.aml.alertsservice.entity.Alert;
import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.alertsservice.repository.AlertRepository;
import com.meryem.aml.alertsservice.service.AlertPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/alerts")
public class AlertController {

    private final AlertRepository alertRepository;
    private final AlertPublisher alertPublisher;

    public AlertController(AlertRepository alertRepository, AlertPublisher alertPublisher) {
        this.alertRepository = alertRepository;
        this.alertPublisher = alertPublisher;
    }

    @GetMapping
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    @PutMapping("/{id}/status")
    public Alert updateStatus(@PathVariable Long id, @RequestBody AlertStatus status) {
        if (status == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }
        Alert alert = alertRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
        alert.setStatus(status);
        Alert saved = alertRepository.save(alert);
        alertPublisher.publish(saved);
        return saved;
    }
}
