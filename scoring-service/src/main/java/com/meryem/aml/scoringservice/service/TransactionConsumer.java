package com.meryem.aml.scoringservice.service;

import com.meryem.aml.scoringservice.model.ScoredTransaction;
import com.meryem.aml.scoringservice.model.Transaction;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class TransactionConsumer {

    private final ScoringEngine scoringEngine;
    private final KafkaTemplate<String, ScoredTransaction> kafkaTemplate;

    public TransactionConsumer(ScoringEngine scoringEngine,
                               KafkaTemplate<String, ScoredTransaction> kafkaTemplate) {
        this.scoringEngine = scoringEngine;
        this.kafkaTemplate = kafkaTemplate;
    }
//st la vraie nouveauté ici : c'est l'annotation qui dit à Spring "surveille ce topic, et exécute cette méthode automatiquement à chaque nouveau message"
    @KafkaListener(topics = "transactions", groupId = "scoring-service-group")
    public void consume(Transaction transaction) {
        ScoredTransaction scored = scoringEngine.score(transaction);
        kafkaTemplate.send("scored-transactions", scored.getTransaction().getId(), scored);
    }
}