package com.meryem.aml.scoringservice.service;

import com.meryem.aml.scoringservice.model.ScoredTransaction;
import com.meryem.aml.scoringservice.model.Transaction;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class ScoringEngine {
//le moteur de règles AML
    private static final double HIGH_AMOUNT_THRESHOLD = 100000;
    private static final double STRUCTURING_AMOUNT = 9900;
    private static final Set<String> RISK_COUNTRIES = Set.of("KP", "IR", "SY");

    public ScoredTransaction score(Transaction transaction) {
        List<String> triggeredRules = new ArrayList<>();
        int score = 0;

        if (transaction.getAmount() >= HIGH_AMOUNT_THRESHOLD) {
            triggeredRules.add("HIGH_AMOUNT");
            score += 50;
        }

        if (transaction.getAmount() == STRUCTURING_AMOUNT) {
            triggeredRules.add("STRUCTURING_PATTERN");
            score += 40;
        }

        if (RISK_COUNTRIES.contains(transaction.getCountry())) {
            triggeredRules.add("RISK_COUNTRY");
            score += 60;
        }

        int finalScore = Math.min(score, 100);

        return new ScoredTransaction(transaction, finalScore, triggeredRules);
    }
}