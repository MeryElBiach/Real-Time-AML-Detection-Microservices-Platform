package com.meryem.aml.transactionservice.repository;

import com.meryem.aml.transactionservice.model.Transaction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;

@Repository
public class TransactionHistoryRepository {

    private final JdbcTemplate jdbc;

    public TransactionHistoryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean store(
            Transaction tx,
            String topic,
            int partition,
            long offset) {

        // Refuser un message incomplet plutôt que fabriquer des valeurs.
        if (tx == null
                || tx.getId() == null
                || tx.getId().isBlank()
                || tx.getFromAccount() == null
                || tx.getToAccount() == null
                || tx.getCurrency() == null
                || tx.getTimestamp() == null
                || !Double.isFinite(tx.getAmount())) {

            throw new IllegalArgumentException(
                    "Transaction incomplète ou montant invalide.");
        }

        // Le générateur actuel produit des montants au centime.
        // valueOf évite le constructeur BigDecimal(double).
        // UNNECESSARY interdit un arrondi silencieux.
        BigDecimal amount = BigDecimal.valueOf(tx.getAmount())
                .setScale(2, RoundingMode.UNNECESSARY);

        Timestamp timestamp = Timestamp.valueOf(tx.getTimestamp());

        // Les paramètres ? sont transmis séparément du SQL.
        // Un ID déjà présent ne provoque pas une seconde insertion.
        int inserted = jdbc.update("""
                INSERT INTO history_schema.transaction_history (
                    transaction_id,
                    from_account,
                    to_account,
                    amount,
                    currency,
                    country,
                    transaction_timestamp,
                    source_topic,
                    source_partition,
                    source_offset
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (transaction_id) DO NOTHING
                """,
                tx.getId(),
                tx.getFromAccount(),
                tx.getToAccount(),
                amount,
                tx.getCurrency(),
                tx.getCountry(),
                timestamp,
                topic,
                partition,
                offset);

        if (inserted == 1) {
            return true;
        }

        // Kafka peut relivrer un message après une interruption.
        // Accepter le doublon seulement si les faits sont identiques.
        // Une provenance Kafka différente ne change pas ces faits.
        Boolean identical = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM history_schema.transaction_history
                    WHERE transaction_id = ?
                      AND from_account = ?
                      AND to_account = ?
                      AND amount = ?
                      AND currency = ?
                      AND country IS NOT DISTINCT FROM ?
                      AND transaction_timestamp = ?
                )
                """,
                Boolean.class,
                tx.getId(),
                tx.getFromAccount(),
                tx.getToAccount(),
                amount,
                tx.getCurrency(),
                tx.getCountry(),
                timestamp);

        // Ne jamais écraser silencieusement une transaction
        // avec un contenu différent portant le même ID.
        if (!Boolean.TRUE.equals(identical)) {
            throw new IllegalStateException(
                    "Conflit de contenu pour la transaction "
                            + tx.getId());
        }

        // Doublon identique : la ligne existante suffit.
        return false;
    }
}