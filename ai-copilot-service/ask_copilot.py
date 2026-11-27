"""Questions documentaires et explication d'alertes avec les données enregistrées."""

import argparse
import json
import os
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from alert_client import AlertApiError, fetch_alert


def read_history(transaction_id: str, token: str) -> dict:
    """Lire le contexte historique via le Gateway, sans accès SQL."""

    base_url = os.getenv(
        "AML_API_URL",
        "http://localhost:8080/api",
    ).rstrip("/")

    request = Request(
        f"{base_url}/transactions/"
        f"{quote(transaction_id, safe='')}/context",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=20) as response:
            # Conserver les décimales des montants reçus.
            context = json.load(
                response,
                parse_float=Decimal,
            )

    except HTTPError as error:
        messages = {
            401: "JWT expiré ou invalide : reconnecte-toi.",
            403: "Lecture de l'historique non autorisée.",
            404: (
                "Transaction absente de l'historique : "
                "vérifie son ingestion et le déploiement de l'API."
            ),
            503: "transaction-service est indisponible.",
        }

        raise RuntimeError(
            messages.get(
                error.code,
                f"Erreur HTTP {error.code}.",
            )
        ) from error

    except (URLError, TimeoutError) as error:
        raise RuntimeError(
            "Impossible de joindre l'API historique."
        ) from error

    if not isinstance(context, dict):
        raise ValueError(
            "Format du contexte historique inattendu."
        )

    return context


def build_fact_sources(
    alert: dict,
    context: dict,
) -> list[dict]:
    """Vérifier les données et préparer les sources F1 et H1."""

    target = context["target"]

    # Les deux APIs doivent parler de la même transaction.
    for key in (
        "transactionId",
        "fromAccount",
        "toAccount",
    ):
        if target[key] != alert[key]:
            raise ValueError(
                f"Conflit entre alerte et historique : {key}."
            )

    if (
        Decimal(str(target["amount"]))
        != Decimal(str(alert["amount"]))
    ):
        raise ValueError(
            "Montants contradictoires entre les deux services."
        )

    if (
        alert.get("currency")
        and target["currency"] != alert["currency"]
    ):
        raise ValueError(
            "Devises contradictoires entre les deux services."
        )

    if alert.get("transactionTimestamp"):
        alert_time = datetime.fromisoformat(
            alert["transactionTimestamp"]
        )
        history_time = datetime.fromisoformat(
            target["transactionTimestamp"]
        )

        if alert_time != history_time:
            raise ValueError(
                "Dates contradictoires entre les deux services."
            )

    previous = context["previousTransactions"]

    # L'API doit renvoyer un aperçu limité à cinq lignes.
    if not isinstance(previous, list) or len(previous) > 5:
        raise ValueError(
            "Aperçu historique invalide ou trop volumineux."
        )

    target_time = datetime.fromisoformat(
        target["transactionTimestamp"]
    )

    # Vérifier le compte, la devise et la borne temporelle.
    for row in previous:
        if (
            row["fromAccount"] != target["fromAccount"]
            or row["currency"] != target["currency"]
            or datetime.fromisoformat(
                row["transactionTimestamp"]
            ) >= target_time
        ):
            raise ValueError(
                "Une transaction sort du périmètre historique."
            )

    alert_facts = {
        key: alert.get(key)
        for key in (
            "id",
            "transactionId",
            "fromAccount",
            "toAccount",
            "amount",
            "currency",
            "transactionTimestamp",
            "country",
            "riskScore",
            "scoringVersion",
            "ruleHits",
        )
    }

    # Contexte compact envoyé au modèle.
    # Les réponses complètes des APIs restent dans la trace locale.
    history_facts = {
        "fromAccount": target["fromAccount"],
        "currency": target["currency"],
        "targetTimestamp": target["transactionTimestamp"],
        "sourceTimezone": target["sourceTimezone"],
        "previousTransactions": [
            {
                key: row[key]
                for key in (
                    "transactionId",
                    "amount",
                    "transactionTimestamp",
                )
            }
            for row in previous
        ],
        "truncated": context["truncated"],
        "coverageStatus": context["coverageStatus"],
        "comparisonAvailable": context["comparisonAvailable"],
        "limitations": context["limitations"],
        "snapshotAt": context["snapshotAt"],
    }

    return [
        {
            "id": "F1",
            "reference": f"alert/{alert['id']}",
            "source": f"API GET /api/alerts/{alert['id']}",
            "version": (
                alert.get("scoringVersion") or "non_precisee"
            ),
            "nature": "recorded_alert",
            "status": "simulated_data",
            "guidance_type": "alert_facts",
            "text": json.dumps(
                alert_facts,
                ensure_ascii=False,
                default=str,
            ),
        },
        {
            "id": "H1",
            "reference": f"history/{target['transactionId']}",
            "source": (
                "API GET /api/transactions/"
                "{transactionId}/context"
            ),
            "version": "history-context-v1",
            "nature": "recorded_history",
            "status": context["coverageStatus"],
            "guidance_type": "observed_history_sample",
            "text": json.dumps(
                history_facts,
                ensure_ascii=False,
                default=str,
            ),
        },
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Copilote documentaire ou contextualisé sur une alerte."
        )
    )

    parser.add_argument(
        "question",
        nargs="?",
    )

    parser.add_argument(
        "--alert-id",
        type=int,
        help="ID numérique d'une alerte existante.",
    )

    parser.add_argument(
        "--context-only",
        action="store_true",
        help=(
            "Afficher les données de l'alerte "
            "sans appeler le RAG ni Ollama."
        ),
    )

    args = parser.parse_args()

    if args.alert_id is not None and args.alert_id <= 0:
        parser.error(
            "--alert-id doit être un entier positif."
        )

    if args.context_only and args.alert_id is None:
        parser.error(
            "--context-only nécessite --alert-id."
        )

    question = args.question

    if question is None:
        if args.alert_id is None:
            parser.error(
                "Fournis une question ou un --alert-id."
            )

        question = (
            "Explique cette alerte et propose "
            "des vérifications adaptées."
        )

    if not question.strip() or len(question) > 1000:
        parser.error(
            "La question doit contenir entre 1 et 1000 caractères."
        )

    service_dir = Path(__file__).resolve().parent

    try:
        alert = None
        context = None
        fact_sources = []

        # Le mode documentaire fonctionne sans JWT.
        # Le mode alerte utilise le JWT de la session PowerShell.
        if args.alert_id is not None:
            token = os.getenv("AML_API_TOKEN", "")

            print(
                "Lecture de l'alerte et de l'historique...",
                flush=True,
            )

            alert = fetch_alert(
                args.alert_id,
                token,
            )

            context = read_history(
                alert["transactionId"],
                token,
            )

            fact_sources = build_fact_sources(
                alert,
                context,
            )

            # Premier test : consulter les données uniquement.
            if args.context_only:
                print(json.dumps(
                    {
                        "alert": alert,
                        "history": context,
                    },
                    ensure_ascii=False,
                    indent=2,
                    default=str,
                ))
                return 0

        # Imports différés :
        # context-only ne charge pas le modèle d'embeddings.
        from rag.retriever import retrieve_sources
        from rag.llm import generate_answer

        print(
            "Recherche des documents...",
            flush=True,
        )

        documents = retrieve_sources(
            question,
            service_dir,
        )

        # F1/H1 proviennent des APIs.
        # S1/S2 proviennent de la recherche documentaire.
        sources = fact_sources + documents

        print(
            "Génération avec Ollama...",
            flush=True,
        )

        answer = generate_answer(
            question,
            sources,
        )

        print("\nRéponse :")

        if answer.status == "insufficient_sources":
            print(
                "Les éléments fournis "
                "ne permettent pas de répondre."
            )

        for point in answer.points:
            print(
                f"- {point.text} [{point.source_id}]"
            )

        # Garder les limites visibles même si le modèle les omet.
        if context is not None:
            print("\nLimites du contexte historique :")

            for limitation in context["limitations"]:
                print(f"- {limitation}")

        if answer.missing_information:
            print("\nInformations manquantes :")

            for information in answer.missing_information:
                print(f"- {information}")

        print("\nSources fournies au modèle :")

        for source in sources:
            print(
                f"[{source['id']}] {source['reference']} "
                f"— version {source['version']}"
            )

        # Trace locale de développement, sans JWT.
        trace = {
            "question": question,
            "model": os.getenv(
                "OLLAMA_MODEL",
                "llama3.2:latest",
            ),
            "answer": answer.model_dump(),
            "sources": sources,
        }

        if alert is not None:
            trace["alert"] = alert
            trace["history"] = context

        output_name = (
            "last-alert-answer.json"
            if alert is not None
            else "last-answer.json"
        )

        output = (
            service_dir
            / "artifacts"
            / output_name
        )

        output.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        output.write_text(
            json.dumps(
                trace,
                ensure_ascii=False,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        print(f"\nTrace locale : {output}")
        return 0

    except (
        AlertApiError,
        RuntimeError,
        ValueError,
        KeyError,
        TypeError,
    ) as error:
        print(
            f"Erreur : {error}",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())