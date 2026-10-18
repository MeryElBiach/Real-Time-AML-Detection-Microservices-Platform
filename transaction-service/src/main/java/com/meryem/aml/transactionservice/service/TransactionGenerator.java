package com.meryem.aml.transactionservice.service;
import com.meryem.aml.transactionservice.model.Transaction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.UUID;

//toutes les 2 secondes, il génère soit une transaction normale (70% des cas),
// soit une transaction suspecte (30% des cas, selon 5 patterns : gros montant,
// fractionnement, pays à risque, montant rond, devise étrangère),
// et la dépose dans le topic Kafka transactions.
@Service
public class TransactionGenerator {

    private static final List<String> RISK_COUNTRIES = List.of("KP", "IR", "SY");

    // Nouvelles devises utilisées pour simuler des transactions en devise
    // étrangère.
    private static final List<String> FOREIGN_CURRENCIES = List.of("EUR", "USD", "GBP");

    // un objet Spring déjà prêt à envoyer des messages vers Kafka
    private final KafkaTemplate<String, Transaction> kafkaTemplate;

    private final Random random = new Random();

    @Value("${app.kafka.topic.transactions:transactions}")
    private String topic;

    public TransactionGenerator(KafkaTemplate<String, Transaction> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedRate = 2000)
    public void generateTransaction() {

        int pattern = random.nextInt(100);

        Transaction transaction;

        if (pattern < 70) {
            // 70% des transactions sont normales.
            transaction = buildNormalTransaction();

        } else if (pattern < 80) {
            // 10% : simulation d'une transaction avec un montant très élevé.
            transaction = buildHighAmountTransaction();

        } else if (pattern < 87) {
            // 7% : simulation d'un pattern de structuring.
            transaction = buildStructuringTransaction();

        } else if (pattern < 93) {
            // 6% : simulation d'une transaction provenant d'un pays à risque.
            transaction = buildRiskCountryTransaction();

        } else if (pattern < 97) {
            // 4% : simulation d'un montant rond inhabituel.
            transaction = buildRoundAmountTransaction();

        } else {
            // 3% : simulation d'une transaction dans une devise étrangère.
            transaction = buildForeignCurrencyTransaction();
        }

        kafkaTemplate.send(topic, transaction.getId(), transaction);
        // Envoie la transaction au topic Kafka pour qu'elle soit consommée par le
        // scoring-service.
        // Publie la transaction dans Kafka avec son ID comme clé et la transaction
        // comme message.
    }

    private Transaction buildNormalTransaction() {
        double amount = 100 + random.nextDouble() * 4900;
        return buildTransaction(amount, "MAD", "MA");
    }

    // Nouvelle méthode : génère une transaction avec un montant >= 100000
    // afin de déclencher la règle HIGH_AMOUNT.
    private Transaction buildHighAmountTransaction() {
        double amount = 100000 + random.nextDouble() * 50000;
        return buildTransaction(amount, "MAD", "MA");
    }

    // Nouvelle méthode : génère exactement 9900 MAD
    // afin de déclencher la règle STRUCTURING_PATTERN.
    private Transaction buildStructuringTransaction() {
        return buildTransaction(9900, "MAD", "MA");
    }

    // Nouvelle méthode : génère une transaction provenant d'un pays
    // présent dans la liste des pays considérés à risque pour la simulation.
    private Transaction buildRiskCountryTransaction() {
        String country = RISK_COUNTRIES.get(
                random.nextInt(RISK_COUNTRIES.size()));

        double amount = 1000 + random.nextDouble() * 5000;

        return buildTransaction(amount, "MAD", country);
    }

    // Nouvelle méthode : génère un montant rond (multiple de 5000)
    // afin de pouvoir déclencher la règle ROUND_AMOUNT.
    private Transaction buildRoundAmountTransaction() {
        int amount = 10000 + random.nextInt(10) * 5000;

        return buildTransaction(amount, "MAD", "MA");
    }

    // Nouvelle méthode : génère une transaction dans une devise étrangère
    // afin de pouvoir déclencher la règle FOREIGN_CURRENCY.
    private Transaction buildForeignCurrencyTransaction() {

        String currency = FOREIGN_CURRENCIES.get(
                random.nextInt(FOREIGN_CURRENCIES.size()));

        double amount = 5000 + random.nextDouble() * 15000;

        return buildTransaction(amount, currency, "MA");
    }

    private Transaction buildTransaction(
            double amount,
            String currency,
            String country) {

        return new Transaction(
                UUID.randomUUID().toString(),
                "compte_" + (1000 + random.nextInt(9000)),
                "compte_" + (1000 + random.nextInt(9000)),
                Math.round(amount * 100.0) / 100.0,
                currency,
                country,
                LocalDateTime.now());
    }
}