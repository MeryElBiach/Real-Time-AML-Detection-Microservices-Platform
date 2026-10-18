package com.meryem.aml.scoringservice;

import com.meryem.aml.scoringservice.controller.ScoringController;
import com.meryem.aml.scoringservice.model.Transaction;
import com.meryem.aml.scoringservice.service.ScoringEngine;
import com.meryem.aml.scoringservice.service.TransactionConsumer;
import com.meryem.aml.scoringservice.model.ScoredTransaction;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ScoringRulesTest {
    private final ScoringEngine engine = new ScoringEngine();
    private final ScoringController controller = new ScoringController(engine);

    @Test void requestedExamplesUseTheActualEngine() {
        check(125000, "MAD", "MA", 65, List.of("HIGH_AMOUNT", "ROUND_AMOUNT"));
        check(9900, "MAD", "MA", 50, List.of("STRUCTURING_PATTERN"));
        check(50000, "USD", "IR", 95, List.of("RISK_COUNTRY", "ROUND_AMOUNT", "FOREIGN_CURRENCY"));
        check(125000, "USD", "IR", 100, List.of("HIGH_AMOUNT", "RISK_COUNTRY", "ROUND_AMOUNT", "FOREIGN_CURRENCY"));
        check(9999, "MAD", "MA", 0, List.of());
        check(10000, "MAD", "MA", 15, List.of("ROUND_AMOUNT"));
        check(99999, "MAD", "MA", 0, List.of());
        check(100000, "MAD", "MA", 65, List.of("HIGH_AMOUNT", "ROUND_AMOUNT"));
        check(1, "MAD", "MM", 0, List.of());
    }

    private void check(double amount, String currency, String country, int score, List<String> rules) {
        var response = controller.evaluate(new ScoringController.ScoringRequest(amount, currency, country)).getBody();
        assertNotNull(response);
        assertEquals(score, response.riskScore());
        assertEquals(rules, response.triggeredRules());
        assertEquals(5, response.ruleEvaluations().size());
        assertEquals(score, Math.min(100, response.ruleEvaluations().stream().mapToInt(r -> r.contribution()).sum()));
        var transaction = new Transaction();
        transaction.setAmount(amount); transaction.setCurrency(currency); transaction.setCountry(country);
        assertEquals(engine.score(transaction).getTriggeredRules(), response.triggeredRules());
        assertEquals(engine.score(transaction).getRiskScore(), response.riskScore());
    }

    @Test void catalogMatchesContributionsAndHasFiveUniqueCodes() {
        var rules = controller.getRules();
        assertEquals(5, rules.size());
        assertEquals(5, rules.stream().map(ScoringEngine.RuleDefinition::code).distinct().count());
        assertEquals(List.of(50, 50, 60, 15, 20), rules.stream().map(ScoringEngine.RuleDefinition::scoreContribution).toList());
        assertEquals("country in [IR, KP, SY]", rules.get(2).condition());
    }

    @Test void invalidInputIsRejectedAndLowercaseIsNormalized() {
        assertThrows(ResponseStatusException.class, () -> controller.evaluate(new ScoringController.ScoringRequest(null, "MAD", "MA")));
        assertThrows(ResponseStatusException.class, () -> controller.evaluate(new ScoringController.ScoringRequest(-1.0, "MAD", "MA")));
        assertThrows(ResponseStatusException.class, () -> controller.evaluate(new ScoringController.ScoringRequest(Double.NaN, "MAD", "MA")));
        assertThrows(ResponseStatusException.class, () -> controller.evaluate(new ScoringController.ScoringRequest(10.0, null, "MA")));
        assertEquals(95, controller.evaluate(new ScoringController.ScoringRequest(50000.0, " usd ", "ir")).getBody().riskScore());
    }

    @Test void kafkaConsumerStillPublishesTheEngineResult() {
        @SuppressWarnings("unchecked")
        KafkaTemplate<String, ScoredTransaction> kafka = mock(KafkaTemplate.class);
        var scoring = mock(ScoringEngine.class);
        var transaction = new Transaction(); transaction.setId("test");
        var scored = new ScoredTransaction(transaction, 65, List.of("HIGH_AMOUNT", "ROUND_AMOUNT"));
        when(scoring.score(transaction)).thenReturn(scored);
        new TransactionConsumer(scoring, kafka).consume(transaction);
        verify(scoring).score(transaction);
        verify(kafka).send("scored-transactions", "test", scored);
    }
}
