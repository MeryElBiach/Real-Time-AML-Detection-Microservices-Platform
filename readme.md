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

## ✨ Key Features

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

## 🚀 Getting Started

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

## 🧪 Testing

The repository includes scripts for testing browser behavior and replaying alerts. Run them according to the instructions and dependencies defined in the project.

For example, the repository contains:

- `scripts/replay-alerts.py`
- `scripts/test-rules-browser.cjs`
- `scripts/test-status-browser.cjs`

Refer to the project configuration for the exact commands and required environment variables.

## 🔐 Configuration

Configure the necessary environment variables and service settings before running the application.

Do not commit passwords, API keys, JWT secrets, or other sensitive credentials. Use local environment files and ensure they are excluded from version control.

## 🎯 Project Objectives

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

## 👩‍💻 Author

**Meryem El Biach**

Software Engineering Student — ENSIAS

[GitHub Repository](https://github.com/MeryElBiach/Real-Time-AML-Detection-Microservices-Platform)