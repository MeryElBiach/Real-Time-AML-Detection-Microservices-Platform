package com.meryem.aml.scoringservice;

import com.meryem.aml.contracts.scoring.RuleHit;
import com.meryem.aml.scoringservice.controller.ScoringController;
import com.meryem.aml.scoringservice.model.ScoredTransaction;
import com.meryem.aml.scoringservice.model.Transaction;
import com.meryem.aml.scoringservice.service.ScoringEngine;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ScoringEvidenceTest {
    private final ScoringEngine engine = new ScoringEngine();

    private Transaction transaction(double amount, String currency, String country) {
        Transaction transaction = new Transaction();
        transaction.setId("TX-EVIDENCE");
        transaction.setAmount(amount);
        transaction.setCurrency(currency);
        transaction.setCountry(country);
        transaction.setTimestamp(LocalDateTime.of(2026, 11, 24, 10, 30));
        return transaction;
    }

    @Test void everyHitCarriesTheActualInputsAndContributionsBeforeTheScoreCap() {
        ScoredTransaction result = engine.score(transaction(125000.25, "USD", "IR"));
        assertEquals(100, result.getRiskScore());
        assertEquals(ScoringEngine.SCORING_VERSION, result.getScoringVersion());
        assertEquals(result.getTriggeredRules(), result.getRuleHits().stream().map(RuleHit::code).toList());
        assertEquals(130, result.getRuleHits().stream().mapToInt(RuleHit::points).sum());
        RuleHit amount = result.getRuleHits().get(0);
        assertEquals("125000.25", amount.evidence().get("amount"));
        assertEquals("USD", amount.evidence().get("currency"));
        assertEquals("100000.00", amount.evidence().get("threshold"));
        assertEquals(false, amount.evidence().get("currencyConversionApplied"));
        RuleHit country = result.getRuleHits().get(1);
        assertEquals("IR", country.evidence().get("country"));
        assertEquals(List.of("IR", "KP", "SY"), country.evidence().get("configuredCountries"));
        assertEquals(false, country.evidence().get("officialSanctionsCheckPerformed"));
        assertEquals(false, result.getRuleHits().get(2).evidence().get("crossBorderTransferVerified"));
        assertTrue(result.getRuleHits().stream().allMatch(hit -> hit.ruleVersion().equals(result.getScoringVersion())));
    }

    @Test void exactAmountDoesNotClaimHistoryAndRoundAmountsExposeBothPredicates() {
        RuleHit exact = engine.score(transaction(9900, "MAD", "MA")).getRuleHits().get(0);
        assertEquals(50, exact.points());
        assertEquals("9900.00", exact.evidence().get("expectedAmount"));
        assertEquals(false, exact.evidence().get("historyEvaluated"));
        assertEquals("SINGLE_TRANSACTION", exact.evidence().get("scope"));
        assertTrue(engine.score(transaction(9899.99, "MAD", "MA")).getRuleHits().isEmpty());
        assertTrue(engine.score(transaction(9900.01, "MAD", "MA")).getRuleHits().isEmpty());
        RuleHit round = engine.score(transaction(15000, "MAD", "MA")).getRuleHits().get(0);
        assertEquals(15, round.points());
        assertEquals("10000.00", round.evidence().get("minimumAmount"));
        assertEquals("5000.00", round.evidence().get("multipleOf"));
    }

    @Test void evidenceRetainsFractionalInputInsteadOfRoundingItIntoAnotherFact() {
        RuleHit hit = engine.score(transaction(125000.1234, "EUR", "MA")).getRuleHits().get(0);
        assertEquals("125000.1234", hit.evidence().get("amount"));
        assertThrows(IllegalArgumentException.class, () -> engine.score(transaction(Double.NaN, "MAD", "MA")));
        assertThrows(IllegalArgumentException.class, () -> engine.score(transaction(-1, "MAD", "MA")));
    }

    @Test void httpEvaluationAndKafkaSerializationExposeTheSameStructuredEvidence() {
        var response = new ScoringController(engine).evaluate(
                new ScoringController.ScoringRequest(125000.0, "USD", "IR")).getBody();
        var scored = engine.score(transaction(125000, "USD", "IR"));
        assertNotNull(response);
        assertEquals(scored.getRuleHits(), response.ruleHits());
        assertEquals(scored.getScoringVersion(), response.scoringVersion());
        try (var serializer = new JsonSerializer<ScoredTransaction>();
             var deserializer = new JsonDeserializer<>(ScoredTransaction.class, false)) {
            byte[] bytes = serializer.serialize("scored-transactions", scored);
            ScoredTransaction decoded = deserializer.deserialize("scored-transactions", bytes);
            assertEquals(scored.getRuleHits(), decoded.getRuleHits());
            assertEquals(scored.getTransaction().getTimestamp(), decoded.getTransaction().getTimestamp());
            assertEquals(scored.getScoringVersion(), decoded.getScoringVersion());
        }
    }
}
