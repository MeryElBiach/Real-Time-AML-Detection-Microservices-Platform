package com.meryem.aml.transactionservice.service;

import com.meryem.aml.transactionservice.model.Transaction;
import com.meryem.aml.transactionservice.repository.TransactionHistoryRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class TransactionHistoryConsumer {

    private static final Logger log =
            LoggerFactory.getLogger(TransactionHistoryConsumer.class);

    private final TransactionHistoryRepository repository;

    public TransactionHistoryConsumer(
            TransactionHistoryRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(
            topics = "${app.kafka.topic.transactions:transactions}",
            groupId = "transaction-history-group",
            containerFactory = "historyKafkaListenerContainerFactory"
    )
    public void consume(ConsumerRecord<String, Transaction> record) {

        // Aucun filtre sur le score :
        // conserver toutes les transactions reçues.
        boolean inserted = repository.store(
                record.value(),
                record.topic(),
                record.partition(),
                record.offset());

        log.info(
                "Historique : transaction {} {}",
                record.value().getId(),
                inserted ? "enregistree" : "deja presente");
    }
}