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
            new RuleDefinition("STRUCTURING_PATTERN", "Structuring indicator",
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

        // Cette liste contient les règles qui ont été déclenchées
        // pour cette transaction.
        List<String> triggeredRules = new ArrayList<>();

        // Score initial de la transaction.
        int score = 0;

        // Règle 1 : montant très élevé.
        // Si le montant est supérieur ou égal à 100 000,
        // on considère cette transaction comme présentant
        // un indicateur de risque lié au montant.
        if (transaction.getAmount() >= HIGH_AMOUNT_THRESHOLD) {
            triggeredRules.add("HIGH_AMOUNT");
            score += HIGH_AMOUNT_POINTS;
        }

        // Règle 2 : pattern de structuring.
        // Dans notre simulation, une transaction exactement égale
        // à 9 900 est utilisée comme indicateur de structuring.
        if (transaction.getAmount() == STRUCTURING_AMOUNT) {
            triggeredRules.add("STRUCTURING_PATTERN");
            score += STRUCTURING_POINTS;
        }

        // Règle 3 : pays à risque.
        // Si le pays de la transaction appartient à notre liste
        // de pays à risque, on ajoute 60 points.
        if (RISK_COUNTRIES.contains(transaction.getCountry())) {
            triggeredRules.add("RISK_COUNTRY");
            score += RISK_COUNTRY_POINTS;
        }

        // Règle 4 : montant rond inhabituel.
        // On vérifie que le montant est au moins de 10 000
        // et qu'il est un multiple de 5 000.
        // Exemple : 10 000, 15 000, 20 000...
        if (transaction.getAmount() >= ROUND_MINIMUM
                && transaction.getAmount() % ROUND_MULTIPLE == 0) {
            triggeredRules.add("ROUND_AMOUNT");
            score += ROUND_AMOUNT_POINTS;
        }

        // Règle 5 : utilisation d'une devise étrangère.
        // Si la transaction est effectuée en EUR, USD ou GBP,
        // on ajoute 20 points comme indicateur de risque complémentaire.
        if (FOREIGN_CURRENCIES.contains(transaction.getCurrency())) {
            triggeredRules.add("FOREIGN_CURRENCY");
            score += FOREIGN_CURRENCY_POINTS;
        }

        // Le score final est limité à 100.
        // Même si plusieurs règles sont déclenchées,
        // le score ne peut jamais dépasser 100.
        int finalScore = Math.min(score, 100);

        // On retourne la transaction originale avec son score
        // et la liste des règles qui ont été déclenchées.
        return new ScoredTransaction(
                transaction,
                finalScore,
                triggeredRules
        );
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