package com.meryem.aml.scoringservice.controller;

import com.meryem.aml.scoringservice.model.Transaction;
import com.meryem.aml.scoringservice.service.ScoringEngine;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/scoring")
public class ScoringController {
    private final ScoringEngine scoringEngine;

    public ScoringController(ScoringEngine scoringEngine) {
        this.scoringEngine = scoringEngine;
    }

    @GetMapping("/rules")
    public List<ScoringEngine.RuleDefinition> getRules() {
        return scoringEngine.getRules();
    }

    @PostMapping("/evaluate")
    public ResponseEntity<ScoringResponse> evaluate(@RequestBody ScoringRequest request) {
        if (request.amount() == null || !Double.isFinite(request.amount()) || request.amount() < 0
                || request.currency() == null || !request.currency().trim().matches("[a-zA-Z]{3}")
                || request.country() == null || !request.country().trim().matches("[a-zA-Z]{2}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide a non-negative amount, a three-letter currency and a two-letter country");
        }
        Transaction transaction = new Transaction();
        transaction.setAmount(request.amount());
        transaction.setCurrency(request.currency().trim().toUpperCase(Locale.ROOT));
        transaction.setCountry(request.country().trim().toUpperCase(Locale.ROOT));
        // Pure evaluation: the HTTP controller never invokes the Kafka consumer or publisher.
        var scored = scoringEngine.score(transaction);
        var evaluations = scoringEngine.getRules().stream().map(rule -> {
            boolean triggered = scored.getTriggeredRules().contains(rule.code());
            return new RuleEvaluation(rule.code(), triggered, triggered ? rule.scoreContribution() : 0);
        }).toList();
        return ResponseEntity.ok(new ScoringResponse(scored.getRiskScore(), scored.getTriggeredRules(), evaluations));
    }

    public record ScoringRequest(Double amount, String currency, String country) {}
    public record RuleEvaluation(String code, boolean triggered, int contribution) {}
    public record ScoringResponse(int riskScore, List<String> triggeredRules, List<RuleEvaluation> ruleEvaluations) {}
}
