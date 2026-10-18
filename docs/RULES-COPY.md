# AML Rules copy review

The Rules page now uses consistent English, matching the rest of the interface.

- Short labels: AML Rules, How scoring works, Rule catalog, Test a transaction, Test result, Results by rule.
- The test description explicitly states that no transaction or alert is created.
- Rule names and descriptions remain supplied by the backend catalog.
- Descriptions now reflect the actual predicates: one transaction for the structuring indicator, a configured demonstration country list, amount-only checks and currency-only checks.
- Removed unsupported references to a regulatory reporting threshold, payment purpose, and cross-border detection.
- Country and currency selectors use plain names. Preset buttons show example amounts without predicting rule outcomes.
- Failure messages describe what the user can do rather than exposing raw API errors.

Only text and test selectors were changed. The scoring thresholds, weights, predicates, API contracts and layout remain the same. Original RulesPage CSS classes were checked and preserved. Frontend build passed.
