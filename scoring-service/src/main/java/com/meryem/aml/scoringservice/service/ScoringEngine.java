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
            score += 50;
        }

        // Règle 2 : pattern de structuring.
        // Dans notre simulation, une transaction exactement égale
        // à 9 900 est utilisée comme indicateur de structuring.
        if (transaction.getAmount() == STRUCTURING_AMOUNT) {
            triggeredRules.add("STRUCTURING_PATTERN");
            score += 50;
        }

        // Règle 3 : pays à risque.
        // Si le pays de la transaction appartient à notre liste
        // de pays à risque, on ajoute 60 points.
        if (RISK_COUNTRIES.contains(transaction.getCountry())) {
            triggeredRules.add("RISK_COUNTRY");
            score += 60;
        }

        // Règle 4 : montant rond inhabituel.
        // On vérifie que le montant est au moins de 10 000
        // et qu'il est un multiple de 5 000.
        // Exemple : 10 000, 15 000, 20 000...
        if (transaction.getAmount() >= 10000
                && transaction.getAmount() % 5000 == 0) {
            triggeredRules.add("ROUND_AMOUNT");
            score += 15;
        }

        // Règle 5 : utilisation d'une devise étrangère.
        // Si la transaction est effectuée en EUR, USD ou GBP,
        // on ajoute 20 points comme indicateur de risque complémentaire.
        if (FOREIGN_CURRENCIES.contains(transaction.getCurrency())) {
            triggeredRules.add("FOREIGN_CURRENCY");
            score += 20;
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