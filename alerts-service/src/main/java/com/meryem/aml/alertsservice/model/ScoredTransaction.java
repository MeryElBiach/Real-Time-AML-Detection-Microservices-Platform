package com.meryem.aml.alertsservice.model;

import com.meryem.aml.contracts.scoring.RuleHit;
import java.util.List;

public class ScoredTransaction {

    private Transaction transaction;
    private int riskScore;
    private List<String> triggeredRules;
    private List<RuleHit> ruleHits = List.of();
    private String scoringVersion;

    public List<RuleHit> getRuleHits() {
        return ruleHits;
    }

    public void setRuleHits(List<RuleHit> ruleHits) {
        this.ruleHits = ruleHits == null ? List.of() : List.copyOf(ruleHits);
    }

    public String getScoringVersion() {
        return scoringVersion;
    }

    public void setScoringVersion(String scoringVersion) {
        this.scoringVersion = scoringVersion;
    }

    public ScoredTransaction() {
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
