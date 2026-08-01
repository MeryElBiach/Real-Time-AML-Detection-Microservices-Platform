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
//toutes les 2 secondes, il génère soit une transaction normale (80% des cas), soit une transaction suspecte (20% des cas, selon 3 patterns : gros montant, fractionnement, pays à risque), et la dépose dans le topic Kafka transactions.
@Service
public class TransactionGenerator {

    private static final List<String> RISK_COUNTRIES = List.of("KP", "IR", "SY");

    private final KafkaTemplate<String, Transaction> kafkaTemplate;
    private final Random random = new Random();

    @Value("${app.kafka.topic.transactions:transactions}")
    private String topic;

    public TransactionGenerator(KafkaTemplate<String, Transaction> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedRate = 2000)
    public void generateTransaction() {
        Transaction transaction = random.nextInt(100) < 80
                ? buildNormalTransaction()
                : buildSuspiciousTransaction();

        kafkaTemplate.send(topic, transaction.getId(), transaction);
    }

    private Transaction buildNormalTransaction() {
        double amount = 100 + random.nextDouble() * 4900;
        return buildTransaction(amount, "MA");
    }

    private Transaction buildSuspiciousTransaction() {
        int pattern = random.nextInt(3);
        return switch (pattern) {
            case 0 -> buildTransaction(100000 + random.nextDouble() * 50000, "MA");
            case 1 -> buildTransaction(9900, "MA");
            default -> buildTransaction(1000 + random.nextDouble() * 5000,
                    RISK_COUNTRIES.get(random.nextInt(RISK_COUNTRIES.size())));
        };
    }

    private Transaction buildTransaction(double amount, String country) {
        return new Transaction(
                UUID.randomUUID().toString(),
                "compte_" + (1000 + random.nextInt(9000)),
                "compte_" + (1000 + random.nextInt(9000)),
                Math.round(amount * 100.0) / 100.0,
                "MAD",
                country,
                LocalDateTime.now()
        );
    }
}