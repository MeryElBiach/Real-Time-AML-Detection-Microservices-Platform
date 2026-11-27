package com.meryem.aml.scoringservice.service;
import com.meryem.aml.scoringservice.model.ScoredTransaction;
import com.meryem.aml.scoringservice.model.Transaction;
import com.meryem.aml.contracts.scoring.RuleHit;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class ScoringEngine {

    public static final String SCORING_VERSION = "demo-v1";

//le moteur de règles AML
    private static final double HIGH_AMOUNT_THRESHOLD = 100000;
    private static final double STRUCTURING_AMOUNT = 9900;

    // Liste des pays considérés à risque pour notre simulation AML.
    private static final Set<String> RISK_COUNTRIES =
            Set.of("KP", "IR", "SY");

    // Devises étrangères utilisées pour simuler des transactions internationales.
    private static final Set<String> FOREIGN_CURRENCIES =
            Set.of("EUR", "USD", "GBP");

    private static final double ROUND_MINIMUM = 10000;
    private static final double ROUND_MULTIPLE = 5000;
    private static final int HIGH_AMOUNT_POINTS = 50;
    private static final int STRUCTURING_POINTS = 50;
    private static final int RISK_COUNTRY_POINTS = 60;
    private static final int ROUND_AMOUNT_POINTS = 15;
    private static final int FOREIGN_CURRENCY_POINTS = 20;

    public record RuleDefinition(String code, String name, String condition,
                                 int scoreContribution, String description, String status, String simulationNote) {}

    public List<RuleDefinition> getRules() {
        return List.of(
            new RuleDefinition("HIGH_AMOUNT", "High amount",
                "amount >= " + (long) HIGH_AMOUNT_THRESHOLD, HIGH_AMOUNT_POINTS,
                "Flags transactions at or above the configured amount threshold.", "Active",
                "The threshold applies to the entered amount; this rule does not convert currencies."),
            new RuleDefinition("STRUCTURING_PATTERN", "Exact amount indicator",
                "amount == " + (long) STRUCTURING_AMOUNT, STRUCTURING_POINTS,
                "Matches the exact amount configured for this test rule.", "Active",
                "This rule checks a single transaction. It does not detect a pattern across multiple transfers."),
            new RuleDefinition("RISK_COUNTRY", "Country risk",
                "country in " + RISK_COUNTRIES.stream().sorted().toList(), RISK_COUNTRY_POINTS,
                "Flags transactions whose country appears in the configured risk list.", "Active",
                "This is a demonstration list, not an official sanctions list."),
            new RuleDefinition("ROUND_AMOUNT", "Round amount",
                "amount >= " + (long) ROUND_MINIMUM + " AND amount % " + (long) ROUND_MULTIPLE + " == 0", ROUND_AMOUNT_POINTS,
                "Flags round amounts that meet the minimum and multiple shown in the condition.", "Active",
                "This rule checks the amount only; it does not assess the purpose of the payment."),
            new RuleDefinition("FOREIGN_CURRENCY", "Foreign currency",
                "currency in " + FOREIGN_CURRENCIES.stream().sorted().toList(), FOREIGN_CURRENCY_POINTS,
                "Flags transactions in one of the configured foreign currencies.", "Active",
                "Currency alone does not indicate a cross-border transfer or suspicious activity.")
        );
    }

    public ScoredTransaction score(Transaction transaction) {
        if (transaction == null || !Double.isFinite(transaction.getAmount())
                || transaction.getAmount() < 0 || transaction.getCurrency() == null
                || transaction.getCountry() == null) {
            throw new IllegalArgumentException("Scoring requires a finite non-negative amount, currency and country");
        }
        List<RuleHit> hits = new ArrayList<>();

        if (transaction.getAmount() >= HIGH_AMOUNT_THRESHOLD) {
            Map<String, Object> evidence = amountEvidence(transaction);
            evidence.put("threshold", decimal(HIGH_AMOUNT_THRESHOLD));
            evidence.put("comparison", ">=");
            hits.add(hit("HIGH_AMOUNT", HIGH_AMOUNT_POINTS, evidence));
        }

        if (transaction.getAmount() == STRUCTURING_AMOUNT) {
            Map<String, Object> evidence = amountEvidence(transaction);
            evidence.put("expectedAmount", decimal(STRUCTURING_AMOUNT));
            evidence.put("comparison", "==");
            evidence.put("historyEvaluated", false);
            evidence.put("limitation", "An exact amount match on one transaction does not establish repeated transfers or structuring.");
            hits.add(hit("STRUCTURING_PATTERN", STRUCTURING_POINTS, evidence));
        }

        if (RISK_COUNTRIES.contains(transaction.getCountry())) {
            hits.add(hit("RISK_COUNTRY", RISK_COUNTRY_POINTS, Map.of(
                    "country", transaction.getCountry(),
                    "configuredCountries", RISK_COUNTRIES.stream().sorted().toList(),
                    "listType", "SIMULATION",
                    "officialSanctionsCheckPerformed", false)));
        }

        if (transaction.getAmount() >= ROUND_MINIMUM
                && transaction.getAmount() % ROUND_MULTIPLE == 0) {
            Map<String, Object> evidence = amountEvidence(transaction);
            evidence.put("minimumAmount", decimal(ROUND_MINIMUM));
            evidence.put("multipleOf", decimal(ROUND_MULTIPLE));
            evidence.put("historyEvaluated", false);
            hits.add(hit("ROUND_AMOUNT", ROUND_AMOUNT_POINTS, evidence));
        }

        if (FOREIGN_CURRENCIES.contains(transaction.getCurrency())) {
            hits.add(hit("FOREIGN_CURRENCY", FOREIGN_CURRENCY_POINTS, Map.of(
                    "currency", transaction.getCurrency(),
                    "configuredCurrencies", FOREIGN_CURRENCIES.stream().sorted().toList(),
                    "scope", "CURRENCY_ONLY",
                    "crossBorderTransferVerified", false)));
        }

        int score = Math.min(hits.stream().mapToInt(RuleHit::points).sum(), 100);
        return new ScoredTransaction(transaction, score,
                hits.stream().map(RuleHit::code).toList(), hits, SCORING_VERSION);
    }

    private RuleHit hit(String code, int points, Map<String, Object> evidence) {
        return new RuleHit(code, points, SCORING_VERSION, evidence);
    }

    private Map<String, Object> amountEvidence(Transaction transaction) {
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("amount", decimal(transaction.getAmount()));
        evidence.put("currency", transaction.getCurrency());
        evidence.put("scope", "SINGLE_TRANSACTION");
        evidence.put("currencyConversionApplied", false);
        return evidence;
    }

    private String decimal(double amount) {
        BigDecimal value = BigDecimal.valueOf(amount);
        return value.setScale(Math.max(2, value.scale())).toPlainString();
    }
}

// TRANSACTION-CONSUMER
//         │ 
//         │ "Je reçois la transaction" 
//         ▼ 
// SCORING-ENGINE
//         │ 
//         │ "J'applique les règles AML" 
//         ▼ 
// SCORED-TRANSACTION
//         │ 
//         │ "Je publie le résultat" 
//         ▼ 
// KAFKA → scored-transactions
