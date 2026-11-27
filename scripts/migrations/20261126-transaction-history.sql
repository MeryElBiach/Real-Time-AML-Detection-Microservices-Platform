-- Préparer le stockage de toutes les transactions.
-- Les alertes restent gérées séparément par alerts-service.

BEGIN;

CREATE SCHEMA IF NOT EXISTS history_schema;

CREATE TABLE IF NOT EXISTS history_schema.transaction_history (

    -- Identifiant provenant du message Kafka.
    -- La clé primaire empêche deux lignes avec le même ID.
    transaction_id VARCHAR(100) PRIMARY KEY,

    from_account VARCHAR(100) NOT NULL,
    to_account VARCHAR(100) NOT NULL,

    -- Type décimal pour conserver les montants au centime.
    amount NUMERIC(19, 2) NOT NULL,

    currency VARCHAR(3) NOT NULL,
    country VARCHAR(3),

    -- Date originale de la transaction.
    -- Le modèle Java actuel utilise LocalDateTime :
    -- cette valeur ne contient donc pas de fuseau.
    transaction_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,

    -- Rester NULL tant que le fuseau source n'est pas établi.
    -- Ne pas supposer automatiquement que la date est en UTC.
    source_timezone VARCHAR(64),

    -- Moment où notre historique a enregistré la transaction.
    -- Cette date est distincte de la date de l'opération.
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Provenance du message, utile pour la traçabilité.
    source_topic VARCHAR(255),
    source_partition INTEGER,
    source_offset BIGINT
);

-- Accélérer les recherches par compte, devise et période.
-- Ce sera le périmètre principal des comparaisons historiques.
CREATE INDEX IF NOT EXISTS idx_history_account_currency_time
    ON history_schema.transaction_history (
        from_account,
        currency,
        transaction_timestamp
    );

COMMIT;