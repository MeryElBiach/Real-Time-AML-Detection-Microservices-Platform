package com.meryem.aml.transactionservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class HistoryKafkaConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<Object, Object>
            historyKafkaListenerContainerFactory(
                    ConsumerFactory<Object, Object> consumerFactory) {

        var factory =
                new ConcurrentKafkaListenerContainerFactory<Object, Object>();

        factory.setConsumerFactory(consumerFactory);

        // Valider l'offset après le traitement réussi du message.
        factory.getContainerProperties()
                .setAckMode(ContainerProperties.AckMode.RECORD);

        // Réessayer toutes les 5 secondes en cas d'échec.
        var errors = new DefaultErrorHandler(
                new FixedBackOff(
                        5000L,
                        FixedBackOff.UNLIMITED_ATTEMPTS));

        // Une erreur persistante bloque la partition
        // jusqu'à correction de sa cause.
        errors.setClassifications(
                java.util.Map.of(Exception.class, true),
                true);

        errors.setAckAfterHandle(false);
        factory.setCommonErrorHandler(errors);

        return factory;
    }
}