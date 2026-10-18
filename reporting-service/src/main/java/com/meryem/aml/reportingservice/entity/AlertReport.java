package com.meryem.aml.reportingservice.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import com.meryem.aml.alertsservice.entity.AlertStatus;

import java.time.LocalDateTime;

@Entity
public class AlertReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String transactionId;
    private String country;
    private double amount;
    private int riskScore;
    private String triggeredRules;
    private LocalDateTime createdAt;

    @Column(unique = true)
    private Long alertId;

    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long statusVersion;

    @Enumerated(EnumType.STRING)
    private AlertStatus status;

    public Long getAlertId() { return alertId; }
    public void setAlertId(Long alertId) { this.alertId = alertId; }
    public long getStatusVersion() { return statusVersion; }
    public void setStatusVersion(long statusVersion) { this.statusVersion = statusVersion; }
    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }

    public AlertReport() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
    }

    public String getTriggeredRules() {
        return triggeredRules;
    }

    public void setTriggeredRules(String triggeredRules) {
        this.triggeredRules = triggeredRules;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
