"""Lecture d'une alerte AML via le Gateway, avec authentification JWT."""

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class AlertApiError(RuntimeError):
    """Erreur compréhensible lors de la lecture d'une alerte."""


def fetch_alert(alert_id: int, token: str) -> dict:
    """Récupérer une alerte existante sans modifier son contenu."""

    # L'identifiant est celui de l'alerte, pas transactionId.
    if alert_id <= 0:
        raise AlertApiError(
            "L'identifiant doit être un entier positif."
        )

    token = token.strip()

    if not token:
        raise AlertApiError(
            "AML_API_TOKEN est absent : "
            "connecte-toi avant le test."
        )

    # Même point d'entrée que le frontend.
    # La variable permettra de changer d'environnement plus tard.
    base_url = os.getenv(
        "AML_API_URL",
        "http://localhost:8080/api",
    ).rstrip("/")

    # Cette fonction envoie uniquement une requête de lecture.
    # Le JWT est transmis au Gateway et n'est jamais affiché.
    request = Request(
        url=f"{base_url}/alerts/{alert_id}",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="GET",
    )

    try:
        # Éviter de rester bloqué si un service est arrêté.
        with urlopen(request, timeout=15) as response:
            alert = json.load(response)

    except HTTPError as error:
        # Traduire les erreurs HTTP en messages compréhensibles.
        messages = {
            401: (
                "JWT absent, expiré ou invalide : "
                "reconnecte-toi."
            ),
            403: (
                "Ton compte n'a pas l'autorisation "
                "de lire cette ressource."
            ),
            404: (
                f"Alerte {alert_id} introuvable : "
                "vérifie son identifiant."
            ),
            503: (
                "Le Gateway ne peut pas joindre "
                "alerts-service."
            ),
        }

        message = messages.get(
            error.code,
            f"L'API a renvoyé une erreur HTTP {error.code}.",
        )

        raise AlertApiError(message) from error

    except (URLError, TimeoutError) as error:
        raise AlertApiError(
            "API inaccessible : vérifie le Gateway, "
            "les services et AML_API_URL."
        ) from error

    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise AlertApiError(
            "La réponse de l'API n'est pas un JSON valide."
        ) from error

    # Ne pas accepter silencieusement une autre ressource.
    if not isinstance(alert, dict) or alert.get("id") != alert_id:
        raise AlertApiError(
            "La réponse ne correspond pas "
            "à l'alerte demandée."
        )

    # Retourner les données enregistrées.
    # Les éventuels champs absents ne sont pas inventés.
    return alert


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Lire une alerte AML via le Gateway."
    )

    parser.add_argument(
        "alert_id",
        type=int,
        help="Identifiant numérique d'une alerte existante.",
    )

    args = parser.parse_args()

    # Le JWT sera fourni par la session PowerShell courante.
    token = os.getenv("AML_API_TOKEN", "")

    try:
        alert = fetch_alert(args.alert_id, token)

    except AlertApiError as error:
        print(f"Erreur : {error}", file=sys.stderr)
        return 1

    print("Alerte récupérée :")
    print(json.dumps(alert, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())