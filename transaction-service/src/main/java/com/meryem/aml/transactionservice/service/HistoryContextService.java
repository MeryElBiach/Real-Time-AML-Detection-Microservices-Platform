package com.meryem.aml.transactionservice.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class HistoryContextService {

    private static final int SAMPLE_LIMIT = 5;

    private static final String COLUMNS = """
            transaction_id, from_account, to_account, amount,
            currency, country, transaction_timestamp,
            source_timezone, ingested_at
            """;

    private final JdbcTemplate jdbc;

    public HistoryContextService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Les lectures successives utilisent une photographie cohérente.
    // Cette méthode exécute uniquement des SELECT.
    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ
    )
    public Optional<HistoryContext> read(String transactionId) {

        // Lire la transaction correspondant à l'alerte.
        // L'identifiant est un paramètre SQL, pas du SQL généré.
        List<TransactionView> targets = jdbc.query(
                "SELECT " + COLUMNS
                        + " FROM history_schema.transaction_history"
                        + " WHERE transaction_id = ?",
                this::mapRow,
                transactionId);

        if (targets.isEmpty()) {
            return Optional.empty();
        }

        TransactionView target = targets.get(0);

        // Même compte émetteur et même devise.
        // Exclure les dates sources égales ou postérieures à la cible.
        // Une ligne supplémentaire permet de détecter la troncature.
        List<TransactionView> previous = jdbc.query(
                "SELECT " + COLUMNS + """
                 FROM history_schema.transaction_history
                 WHERE from_account = ?
                   AND currency = ?
                   AND transaction_timestamp < ?
                 ORDER BY transaction_timestamp DESC, transaction_id DESC
                 LIMIT ?
                 """,
                this::mapRow,
                target.fromAccount(),
                target.currency(),
                Timestamp.valueOf(
                        LocalDateTime.parse(target.transactionTimestamp())),
                SAMPLE_LIMIT + 1);

        boolean truncated = previous.size() > SAMPLE_LIMIT;

        List<TransactionView> sample = List.copyOf(
                previous.subList(
                        0,
                        Math.min(previous.size(), SAMPLE_LIMIT)));

        List<String> limitations = new ArrayList<>();

        limitations.add(
                "Aperçu des opérations antérieures enregistrées ; "
                        + "la couverture complète n'est pas établie.");

        limitations.add(
                "Aucune comparaison au comportement habituel "
                        + "n'est validée à partir de cet aperçu.");

        if (target.sourceTimezone() == null) {
            limitations.add(
                    "Fuseau source inconnu : les dates originales "
                            + "ne sont pas normalisées en UTC.");
        }

        String snapshotAt = jdbc.queryForObject(
                "SELECT CURRENT_TIMESTAMP",
                Timestamp.class
        ).toInstant().toString();

        return Optional.of(new HistoryContext(
                target,
                sample,
                truncated,
                "UNKNOWN",
                false,
                List.copyOf(limitations),
                snapshotAt));
    }

    // Transformer une ligne PostgreSQL en objet JSON sérialisable.
    private TransactionView mapRow(
            ResultSet row,
            int index) throws SQLException {

        return new TransactionView(
                row.getString("transaction_id"),
                row.getString("from_account"),
                row.getString("to_account"),
                row.getBigDecimal("amount"),
                row.getString("currency"),
                row.getString("country"),
                row.getTimestamp("transaction_timestamp")
                        .toLocalDateTime().toString(),
                row.getString("source_timezone"),
                row.getTimestamp("ingested_at")
                        .toInstant().toString());
    }

    public record TransactionView(
            String transactionId,
            String fromAccount,
            String toAccount,
            BigDecimal amount,
            String currency,
            String country,
            String transactionTimestamp,
            String sourceTimezone,
            String ingestedAt) {
    }

    public record HistoryContext(
            TransactionView target,
            List<TransactionView> previousTransactions,
            boolean truncated,
            String coverageStatus,
            boolean comparisonAvailable,
            List<String> limitations,
            String snapshotAt) {
    }
}