# Real-Time AML Detection Microservices Platform

## 🎬 Demo

**Watch the application demo:** [View the AML Platform Demo](https://github.com/MeryElBiach/Real-Time-AML-Detection-Microservices-Platform/issues/3#issue-5908715241)

This video demonstrates the main features of the platform, including transaction monitoring, risk scoring, automated alert generation, and reporting.

---

## 📌 Project Overview

The **Real-Time AML Detection Microservices Platform** is a web application designed to simulate the detection of potentially suspicious banking transactions.

The platform evaluates transactions using predefined AML rules, calculates a risk score, and generates alerts when a configured risk threshold is reached. These alerts can then be reviewed by analysts for further investigation.

The project demonstrates how a microservices architecture and event-driven communication can be used to build a modular transaction monitoring system.

**Note:** This is an educational project that uses simulated transaction data. It is not a production-grade AML compliance solution.

##  Key Features

- **Transaction Monitoring:** Process and monitor simulated banking transactions.
- **Risk Scoring:** Evaluate transactions using predefined AML rules.
- **Automated Alert Generation:** Generate alerts for transactions that meet the configured risk criteria.
- **Alert Management:** Review and track potentially suspicious transactions.
- **Dashboard and Reporting:** Display transaction statistics, risk indicators, and alert information.
- **Microservices Architecture:** Separate application responsibilities into independent services.
- **Event-Driven Communication:** Use Apache Kafka to exchange transaction and scoring events asynchronously.
- **Authentication:** Secure access through the application's authentication mechanism.

## 🏗️ Architecture

The application is organized into eight services:

| Service | Responsibility |
|---|---|
| Auth Service | Authentication and access management |
| Transaction Service | Transaction management and event publishing |
| Scoring Service | AML rule evaluation and risk scoring |
| Alerts Service | Alert creation and management |
| Reporting Service | Statistics and reporting |
| API Gateway | Entry point for frontend requests |
| Eureka Server | Service discovery |
| Config Server | Centralized configuration |

### Event-Driven Workflow

1. The Transaction Service publishes transaction events to Kafka.
2. The Scoring Service consumes the events and evaluates the transactions against AML rules.
3. The scoring results are published to the `scored-transactions` topic.
4. The Alerts Service processes relevant results and generates alerts.
5. The frontend retrieves and displays available transactions, alerts, and reporting information through the backend APIs.

Kafka topics used in the project include:

- `transactions`
- `scored-transactions`
- `alerts`

## 🛠️ Technology Stack

**Backend**
- Java
- Spring Boot
- Spring Cloud

**Messaging**
- Apache Kafka (KRaft)

**Database**
- PostgreSQL

**Frontend**
- React
- TypeScript
- Vite

**Infrastructure and Tools**
- Docker
- Docker Compose
- Eureka
- Spring Cloud Config Server
- Git and GitHub

##  Getting Started

### Prerequisites

Make sure the following tools are installed:

- Git
- Docker Desktop
- Node.js and npm

Java and Maven are also needed if you want to run the backend services outside Docker.

### 1. Clone the Repository

```bash
git clone https://github.com/MeryElBiach/Real-Time-AML-Detection-Microservices-Platform.git
cd Real-Time-AML-Detection-Microservices-Platform
```

### 2. Start the Backend Infrastructure

From the project root, run:

```bash
docker compose up -d --build
```

Check the status of the containers:

```bash
docker compose ps
```

If your Compose file uses a different name or location, adapt the command accordingly.

### 3. Start the Frontend

If the frontend is not already started by Docker Compose, open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

`http://localhost:5173`

### 4. Access the Services

If the default ports are used:

- **Frontend:** `http://localhost:5173`
- **API Gateway:** `http://localhost:8080`
- **Eureka Dashboard:** `http://localhost:8761`

Actual ports depend on the project configuration.

##  Testing

### Recorded scoring evidence for the investigation copilot

The current preparation keeps all five scoring predicates and their weights unchanged
(50, 50, 60, 15, 20), with a final score capped at 100. No LLM service or historical
transaction rule is introduced in this change.

`ScoredTransaction` now carries `scoringVersion` (`demo-v1`) and `ruleHits` alongside
the existing `triggeredRules`. Each hit contains `code`, `points`, `ruleVersion` and
a structured `evidence` object calculated by the scoring engine. Amounts inside the
evidence are decimal strings, retaining input precision and showing at least two
decimal places. Transaction models continue to use `double` in this version.

Evidence records the nominal amount, currency, applied threshold or multiple,
configured lists and the checks that were not performed. In particular:

- `STRUCTURING_PATTERN` still matches exactly 9,900 on one transaction; it does not
  inspect account history or establish repeated transfers.
- Amount thresholds do not convert currencies.
- The country list is a demonstration list, not an official sanctions check.
- A foreign currency does not establish that a transfer crossed a border.
- The score is a demonstration priority index, not a probability of money laundering.

Alerts stores the original `ruleHits` as a JSONB array, together with `currency`,
`transactionTimestamp` and `scoringVersion`. The transaction timestamp is copied
from the incoming transaction; `createdAt` remains the alert creation time.
Investigation status changes preserve these facts. Reporting continues consuming
the existing fields and tolerates the added evidence fields.

`GET /api/alerts/{id}` through the gateway returns the persisted alert and its
evidence with the usual Bearer token; an unknown ID returns 404.
`POST /api/scoring/evaluate` also returns `ruleHits` and `scoringVersion`, without
publishing transactions or creating alerts. The frontend shows recorded evidence
in the investigation drawer and current evidence in the rule tester. Currency is
shown as unavailable when absent, including in historical alerts; it is not inferred
as MAD. CSV exports also retain the transaction timestamp and scoring version.

For legacy alerts, `ruleHits` is an empty array and missing provenance fields remain
null. No historical facts are reconstructed from today's rules. A future copilot
should read the detail endpoint, cite these stored facts, and explicitly identify
missing evidence. A later rule change should use a new scoring version.

The existing Hibernate `ddl-auto: update` setting adds the nullable columns on
startup. An explicit, additive PostgreSQL migration is also available at
`scripts/migrations/20261124-alert-evidence.sql`. It does not backfill or overwrite
historical data. Rebuild Scoring, Alerts and Reporting together; Scoring now uses
the repository root as its Docker build context to include `aml-contracts`.

The root Maven reactor builds the shared contract before its consumers. Run the
focused checks without requiring Kafka, Eureka, Config Server or PostgreSQL:

```powershell
mvn -B -pl scoring-service,alerts-service,reporting-service -am '-Dtest=ScoringRulesTest,ScoringEvidenceTest,AlertStatusTest,AlertEvidenceTest,AlertEvidencePersistenceTest,StatusReportingTest,ReportingEventCompatibilityTest' '-Dsurefire.failIfNoSpecifiedTests=false' test
npm --prefix Frontend run build
npm --prefix Frontend run lint
node scripts/test-evidence-browser.cjs
```

The persistence test uses H2 in PostgreSQL compatibility mode, including JSON
round-trips and status updates; it does not replace a deployment check against
PostgreSQL. The browser test uses explicit API fixtures, starts its own Vite preview
on port 5181 and checks new/legacy alerts, detail-load failures, retry, stale requests,
the rule tester and mobile layout. It uses the same local Playwright installation
as the existing browser scripts (`artifacts/browser-tools`) and Edge by default;
`AML_BROWSER_PATH` can select another installed Chromium executable. Build the
frontend before running it. Existing Spring `contextLoads` tests need their service
infrastructure and are not included in the focused command above.

The repository includes scripts for testing browser behavior and replaying alerts. Run them according to the instructions and dependencies defined in the project.

For example, the repository contains:

- `scripts/replay-alerts.py`
- `scripts/test-rules-browser.cjs`
- `scripts/test-status-browser.cjs`

Refer to the project configuration for the exact commands and required environment variables.

##  Configuration

Configure the necessary environment variables and service settings before running the application.

Do not commit passwords, API keys, JWT secrets, or other sensitive credentials. Use local environment files and ensure they are excluded from version control.

##  Project Objectives

This project explores:

- Real-time transaction risk evaluation
- Rule-based AML detection
- Asynchronous communication with Kafka
- Microservices design and service discovery
- Automated alert generation and reporting
- Integration between a React frontend and a Spring Boot backend

## ⚠️ Limitations

- Transactions are simulated and do not represent real banking data.
- Rule-based detection can generate false positives and may miss complex suspicious behavior.
- A risk score is an indicator for further review, not proof of money laundering.
- Production use would require stronger security, auditability, monitoring, regulatory alignment, and more advanced detection methods.

## 👩 Author

**Meryem El Biach**

Software Engineering Student — ENSIAS

[GitHub Repository](https://github.com/MeryElBiach/Real-Time-AML-Detection-Microservices-Platform)
