"""Replay actual Alerts API snapshots through Kafka; never reads the Alerts database.
Run after deployment: python scripts/replay-alerts.py
Requires Docker access and an authenticated account (password is prompted).
Source statusVersion prevents a delayed snapshot from reverting newer decisions.
"""
import getpass
import os
import json
import subprocess
import urllib.request

email = os.environ.get("AML_TEST_EMAIL") or input("AML account email: ")
password = os.environ.get("AML_TEST_PASSWORD") or getpass.getpass("Password: ")
request = urllib.request.Request("http://localhost:8080/api/auth/login",
    data=json.dumps({"email": email, "password": password}).encode(),
    headers={"Content-Type": "application/json"})
with urllib.request.urlopen(request) as response:
    token = json.load(response)["token"]
request = urllib.request.Request("http://localhost:8080/api/alerts",
    headers={"Authorization": "Bearer " + token})
with urllib.request.urlopen(request) as response:
    alerts = json.load(response)
# Preserve source IDs, timestamps, statuses and versions; the consumer performs an upsert.
messages = "".join(str(alert["transactionId"]) + "|" + json.dumps(alert) + "\n"
                   for alert in sorted(alerts, key=lambda alert: alert["id"]))
subprocess.run(["docker", "compose", "exec", "-T", "kafka",
    "/opt/kafka/bin/kafka-console-producer.sh", "--bootstrap-server", "localhost:9092",
    "--topic", "alerts", "--property", "parse.key=true", "--property", "key.separator=|"],
    input=messages, text=True, check=True)
print(f"Replayed {len(alerts)} real alert snapshots. Wait for Reporting consumer lag to reach zero.")
