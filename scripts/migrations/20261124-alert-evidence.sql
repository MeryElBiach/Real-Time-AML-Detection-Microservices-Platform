-- Additive migration only. Do not infer missing facts for historical alerts.
-- The existing ddl-auto=update configuration also adds these columns at startup.
ALTER TABLE alert_schema.alert ADD COLUMN IF NOT EXISTS currency varchar(255);
ALTER TABLE alert_schema.alert ADD COLUMN IF NOT EXISTS transaction_timestamp timestamp(6);
ALTER TABLE alert_schema.alert ADD COLUMN IF NOT EXISTS scoring_version varchar(255);
ALTER TABLE alert_schema.alert ADD COLUMN IF NOT EXISTS rule_hits jsonb;
