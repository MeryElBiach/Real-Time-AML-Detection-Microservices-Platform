package com.meryem.aml.scoringservice.model;

import java.util.List;

public class ScoredTransaction {

    private Transaction transaction;
    private int riskScore;
    private List<String> triggeredRules;

    public ScoredTransaction() {
    }

    public ScoredTransaction(Transaction transaction, int riskScore, List<String> triggeredRules) {
        this.transaction = transaction;
        this.riskScore = riskScore;
        this.triggeredRules = triggeredRules;
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
    }

    public List<String> getTriggeredRules() {
        return triggeredRules;
    }

    public void setTriggeredRules(List<String> triggeredRules) {
        this.triggeredRules = triggeredRules;
    }
}