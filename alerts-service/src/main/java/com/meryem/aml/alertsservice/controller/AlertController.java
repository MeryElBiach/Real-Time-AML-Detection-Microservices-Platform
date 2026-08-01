package com.meryem.aml.alertsservice.controller;

import com.meryem.aml.alertsservice.entity.Alert;
import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.alertsservice.repository.AlertRepository;
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

    public AlertController(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    @GetMapping
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    @PutMapping("/{id}/status")
    public Alert updateStatus(@PathVariable Long id, @RequestBody AlertStatus status) {
        Alert alert = alertRepository.findById(id).orElseThrow();
        alert.setStatus(status);
        return alertRepository.save(alert);
    }
}