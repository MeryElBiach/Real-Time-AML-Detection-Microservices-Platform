package com.meryem.aml.alertsservice.controller;

import com.meryem.aml.alertsservice.entity.Alert;
import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.alertsservice.model.ScoredTransaction;
import com.meryem.aml.alertsservice.repository.AlertRepository;
import com.meryem.aml.alertsservice.service.AlertPublisher;
import com.meryem.aml.alertsservice.service.ScoredTransactionConsumer;
import com.meryem.aml.contracts.scoring.RuleHit;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AlertEvidenceTest {
    private final AlertRepository repository = mock(AlertRepository.class);
    private final AlertPublisher publisher = mock(AlertPublisher.class);
    private final AlertController controller = new AlertController(repository, publisher);

    @Test void scoredKafkaEventKeepsCurrencyOriginalTimestampVersionAndStructuredFacts() throws Exception {
        String event = """
                {"transaction":{"id":"TX-USD","fromAccount":"ACC-1","toAccount":"ACC-2",
                  "amount":125000.25,"currency":"USD","country":"MA","timestamp":"2026-11-24T08:30:00"},
                 "riskScore":70,"triggeredRules":["HIGH_AMOUNT","FOREIGN_CURRENCY"],"scoringVersion":"demo-v1",
                 "ruleHits":[{"code":"HIGH_AMOUNT","points":50,"ruleVersion":"demo-v1",
                   "evidence":{"amount":"125000.25","currency":"USD","threshold":"100000.00","currencyConversionApplied":false}},
                   {"code":"FOREIGN_CURRENCY","points":20,"ruleVersion":"demo-v1",
                   "evidence":{"currency":"USD","configuredCurrencies":["EUR","GBP","USD"],"crossBorderTransferVerified":false}}]}
                """;
        ScoredTransaction scored;
        try (var deserializer = new JsonDeserializer<>(ScoredTransaction.class, false)) {
            scored = deserializer.deserialize("scored-transactions", event.getBytes(StandardCharsets.UTF_8));
        }
        when(repository.save(any(Alert.class))).thenAnswer(invocation -> {
            Alert alert = invocation.getArgument(0);
            alert.setId(42L);
            return alert;
        });
        new ScoredTransactionConsumer(repository, publisher).consume(scored);
        var captured = org.mockito.ArgumentCaptor.forClass(Alert.class);
        verify(publisher).publish(captured.capture());
        Alert saved = captured.getValue();
        assertEquals("USD", saved.getCurrency());
        assertEquals(scored.getTransaction().getTimestamp(), saved.getTransactionTimestamp());
        assertEquals("demo-v1", saved.getScoringVersion());
        assertEquals(scored.getRuleHits(), saved.getRuleHits());
        assertEquals(AlertStatus.PENDING, saved.getStatus());
        when(repository.findById(42L)).thenReturn(Optional.of(saved));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/alerts/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.transactionTimestamp").value("2026-11-24T08:30:00"))
                .andExpect(jsonPath("$.scoringVersion").value("demo-v1"))
                .andExpect(jsonPath("$.ruleHits").isArray())
                .andExpect(jsonPath("$.ruleHits[0].evidence.amount").value("125000.25"))
                .andExpect(jsonPath("$.ruleHits[1].evidence.configuredCurrencies[2]").value("USD"));
        mvc.perform(put("/alerts/42/status").contentType("application/json").content("\"CONFIRMED\""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.ruleHits[0].ruleVersion").value("demo-v1"));
        assertEquals(scored.getRuleHits(), saved.getRuleHits());
        assertEquals(scored.getTransaction().getTimestamp(), saved.getTransactionTimestamp());
    }

    @Test void legacyAndMissingAlertsHaveExplicitlyDifferentResponses() throws Exception {
        Alert legacy = new Alert();
        legacy.setId(1L);
        legacy.setStatus(AlertStatus.PENDING);
        when(repository.findById(1L)).thenReturn(Optional.of(legacy));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/alerts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ruleHits").isEmpty())
                .andExpect(jsonPath("$.currency").doesNotExist())
                .andExpect(jsonPath("$.transactionTimestamp").doesNotExist())
                .andExpect(jsonPath("$.scoringVersion").doesNotExist());
        mvc.perform(get("/alerts/999")).andExpect(status().isNotFound());
        verifyNoInteractions(publisher);
    }

    @Test void eventsWithoutEvidenceStayReadableAndFactsAreNotInferredFromTheirCodes() {
        try (var deserializer = new JsonDeserializer<>(ScoredTransaction.class, false)) {
            var legacy = deserializer.deserialize("scored-transactions",
                    "{\"riskScore\":50,\"triggeredRules\":[\"HIGH_AMOUNT\"]}".getBytes(StandardCharsets.UTF_8));
            assertTrue(legacy.getRuleHits().isEmpty());
            assertNull(legacy.getScoringVersion());
        }
        Alert alert = new Alert();
        alert.setRuleHits(List.of(new RuleHit("HIGH_AMOUNT", 50, "demo-v1", Map.of("amount", "100000.00"))));
        assertThrows(UnsupportedOperationException.class, () -> alert.getRuleHits().clear());
    }
}
