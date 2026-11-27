package com.meryem.aml.alertsservice.entity;

import com.meryem.aml.contracts.scoring.RuleHit;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AlertEvidencePersistenceTest {
    @Test void jsonFactsSurviveReloadAndStatusChangesWhileLegacyFieldsStayUnknown() {
        var configuration = new Configuration().addAnnotatedClass(Alert.class)
                .setProperty("hibernate.connection.driver_class", "org.h2.Driver")
                .setProperty("hibernate.connection.url", "jdbc:h2:mem:alert_evidence;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
                .setProperty("hibernate.connection.username", "sa")
                .setProperty("hibernate.connection.password", "")
                .setProperty("hibernate.hbm2ddl.auto", "create-drop");
        try (var factory = configuration.buildSessionFactory()) {
            Alert legacy = new Alert();
            legacy.setStatus(AlertStatus.PENDING);
            Alert alert = new Alert();
            alert.setStatus(AlertStatus.PENDING);
            alert.setCurrency("EUR");
            alert.setTransactionTimestamp(LocalDateTime.of(2026, 11, 24, 8, 30));
            alert.setScoringVersion("demo-v1");
            List<RuleHit> hits = List.of(new RuleHit("FOREIGN_CURRENCY", 20, "demo-v1",
                    Map.of("currency", "EUR", "configuredCurrencies", List.of("EUR", "GBP", "USD"),
                            "crossBorderTransferVerified", false)));
            alert.setRuleHits(hits);
            try (var session = factory.openSession()) {
                var transaction = session.beginTransaction();
                session.persist(legacy);
                session.persist(alert);
                transaction.commit();
            }
            try (var session = factory.openSession()) {
                var transaction = session.beginTransaction();
                Alert reloaded = session.find(Alert.class, alert.getId());
                assertEquals(hits, reloaded.getRuleHits());
                assertEquals("EUR", reloaded.getCurrency());
                assertEquals(alert.getTransactionTimestamp(), reloaded.getTransactionTimestamp());
                reloaded.setStatus(AlertStatus.CONFIRMED);
                transaction.commit();
            }
            try (var session = factory.openSession()) {
                Alert reloaded = session.find(Alert.class, alert.getId());
                assertEquals(AlertStatus.CONFIRMED, reloaded.getStatus());
                assertEquals(hits, reloaded.getRuleHits());
                assertEquals("demo-v1", reloaded.getScoringVersion());
                assertTrue(reloaded.getStatusVersion() > 0);
                Alert old = session.find(Alert.class, legacy.getId());
                assertTrue(old.getRuleHits().isEmpty());
                assertNull(old.getCurrency());
                assertNull(old.getTransactionTimestamp());
                assertNull(old.getScoringVersion());
            }
        }
    }
}
