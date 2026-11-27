"""Recherche des passages avec leur contexte et leur provenance."""

import argparse
import json
import os
from pathlib import Path

from qdrant_client import QdrantClient, models

from rag.corpus import assert_index_current
from rag.embeddings import (
    EMBEDDING_DIMENSION,
    MODEL_NAME,
    LocalE5Embeddings,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recherche documentaire dans notre corpus AML."
    )

    # Question fournie dans la commande.
    parser.add_argument("question")

    # Filtre facultatif sur la nature des sources.
    parser.add_argument(
        "--source-type",
        choices=[
            "internal_project",
            "official_reference",
        ],
    )

    args = parser.parse_args()

    # Ce script doit rester à la racine de ai-copilot-service.
    service_dir = Path(__file__).resolve().parent

    manifest_path = (
        service_dir
        / "artifacts"
        / "index-manifest.json"
    )

    manifest = json.loads(
        manifest_path.read_text(encoding="utf-8")
    )

    # Un changement des sources ou du traitement exige une réindexation.
    assert_index_current(manifest, service_dir)

    # Les passages et les questions doivent utiliser
    # le même modèle d'embeddings.
    if (
        manifest["embedding_model"] != MODEL_NAME
        or manifest["embedding_dimension"]
        != EMBEDDING_DIMENSION
    ):
        raise RuntimeError(
            "Le modèle ne correspond pas à celui de l'index."
        )

    query_filter = None

    if args.source_type:
        # Les métadonnées sont imbriquées dans le payload :
        # metadata → source_type.
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_type",
                    match=models.MatchValue(
                        value=args.source_type,
                    ),
                )
            ]
        )

    embeddings = LocalE5Embeddings()

    # Cette méthode ajoute le préfixe "query: "
    # avant de calculer le vecteur de la question.
    query_vector = embeddings.embed_query(args.question)

    client = QdrantClient(
        url=os.getenv(
            "QDRANT_URL",
            "http://localhost:6333",
        ),
        timeout=30,
    )

    try:
        # Chercher les chunks proches de la question.
        # with_payload=True permet de récupérer leur texte
        # et leurs métadonnées.
        results = client.query_points(
            collection_name=manifest["collection_name"],
            query=query_vector,
            query_filter=query_filter,
            limit=8,
            with_payload=True,
        ).points

        # Plusieurs chunks peuvent appartenir au même paragraphe.
        # Nous afficherons jusqu'à trois parents distincts.
        seen = set()

        for hit in results:
            payload = hit.payload
            metadata = payload["metadata"]
            parent_id = metadata["parent_id"]

            if parent_id in seen:
                continue

            seen.add(parent_id)

            print("\n" + "=" * 70)
            print(f"Référence : {parent_id}")
            print(f"Source : {metadata['source']}")
            print(f"Version : {metadata['version']}")
            print(f"Nature : {metadata['source_type']}")

            # Ce score concerne le chunk retrouvé.
            # Ce n'est pas une probabilité de blanchiment.
            print(
                f"Similarité du chunk : {hit.score:.4f}"
            )

            # Les paragraphes GAFI regroupés peuvent couvrir
            # plusieurs pages physiques du PDF.
            if "pdf_page_start" in metadata:
                print(
                    f"Pages PDF : {metadata['pdf_page_start']}"
                    f" à {metadata['pdf_page_end']}"
                )

            elif "pdf_page" in metadata:
                print(
                    f"Page PDF : {metadata['pdf_page']}"
                )

            # Ce champ décrit le sujet documentaire,
            # pas le risque du client.
            if "guidance_type" in metadata:
                print(
                    f"Thème : {metadata['guidance_type']}"
                )

            # Le petit chunk sert à retrouver l'information.
            # Pour l'interpréter, afficher le parent complet :
            # fiche interne, page ou paragraphe GAFI regroupé.
            #
            # Le fallback permet de lire un point qui ne possède
            # pas encore de champ parent_text.
            context = (
                metadata.get("parent_text")
                or payload["page_content"]
            )

            print("\nContexte complet :\n")
            print(context)

            if len(seen) == 3:
                break

        if not seen:
            print(
                "Aucun passage trouvé avec ces filtres."
            )

    finally:
        # Fermer les connexions réseau, même en cas d'erreur.
        client.close()


if __name__ == "__main__":
    main()
