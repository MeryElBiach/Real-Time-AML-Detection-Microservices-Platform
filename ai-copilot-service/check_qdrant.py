"""
Vérifie que notre programme Python peut communiquer avec Qdrant.
Ce script demande la liste des collections existantes.
Il ne crée aucune collection et ne modifie aucune donnée.
Une collection regroupera plus tard nos passages documentaires,
leurs vecteurs et leurs métadonnées.
"""

import os
import sys

from qdrant_client import QdrantClient


def main() -> int:
    """
    Exécute la vérification.

    La valeur retournée devient le code de sortie du programme :
    - 0 : vérification réussie ;
    - 1 : échec de la connexion ou de la requête.
    """

    # Lit une variable d'environnement si elle existe.
    # Sinon, utilise l'adresse de Qdrant accessible depuis ton PC.
    #
    # Attention : os.getenv lit l'environnement du processus.
    # Il ne charge pas automatiquement un fichier .env.
    qdrant_url = os.getenv(
        "QDRANT_URL",
        "http://localhost:6333",
    )

    # Initialisation à None pour pouvoir fermer proprement le client
    # uniquement si sa création a effectivement réussi.
    client = None

    try:
        # Le client communique ici avec notre serveur Docker par HTTP.
        #
        # timeout limite l'attente des requêtes réseau,
        # afin de ne pas attendre indéfiniment une réponse.
        client = QdrantClient(
            url=qdrant_url,
            timeout=10,
        )

        # Cette requête contacte réellement le serveur.
        # Créer seulement l'objet QdrantClient ne suffirait pas
        # à démontrer que notre requête aboutit.
        response = client.get_collections()

        # La réponse contient des objets décrivant les collections.
        # Nous extrayons simplement leurs noms pour les afficher.
        collection_names = [
            collection.name
            for collection in response.collections
        ]

        print(f"Connexion Qdrant réussie : {qdrant_url}")
        print(f"Nombre de collections : {len(collection_names)}")
        print(f"Collections : {collection_names}")

        return 0

    except Exception as error:
        # Pour ce script de diagnostic, nous affichons l'erreur
        # puis signalons l'échec avec un code de sortie non nul.
        print(
            f"Échec de la vérification Qdrant : "
            f"{type(error).__name__}: {error}",
            file=sys.stderr,
        )

        print(
            "Vérifie que Docker Desktop fonctionne et que "
            "le service qdrant est démarré.",
            file=sys.stderr,
        )
        return 1

    finally:
        # Ce bloc s'exécute après une réussite ou une erreur.
        # Il libère les connexions réseau ouvertes par le client.
        if client is not None:
            client.close()


# Ce bloc lance main() lorsque tu exécutes directement ce fichier.
# Il ne s'exécuterait pas si le fichier était importé ailleurs.
if __name__ == "__main__":
    raise SystemExit(main())