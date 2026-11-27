"""Calcule les embeddings des chunks et les enregistre dans Qdrant."""

from hashlib import sha256
import json
import os
from pathlib import Path
from uuid import UUID

from qdrant_client import QdrantClient, models

from rag.chunker import CHUNKING_VERSION
from rag.corpus import input_fingerprint, prepare_corpus
from rag.embeddings import (
    EMBEDDING_DIMENSION,
    MODEL_NAME,
    LocalE5Embeddings,
)


def index_chunks(
    client: QdrantClient,
    rows: list[dict],
    embeddings: LocalE5Embeddings,
) -> dict:
    """Indexe les chunks et retourne les informations de la collection."""

    if not rows:
        raise ValueError("L'aperçu ne contient aucun chunk.")

    if any(
        row["metadata"].get("chunking_version") != CHUNKING_VERSION
        for row in rows
    ):
        raise ValueError("Chunks obsolètes : reconstruire le corpus avant indexation.")

    # Notre chunker attribue un UUID à chaque chunk.
    # Cette conversion vérifie que les identifiants sont valides.
    ids = [str(UUID(row["id"])) for row in rows]

    if len(ids) != len(set(ids)):
        raise ValueError(
            "L'aperçu contient des identifiants dupliqués."
        )

    # Nous identifions le corpus avec une empreinte.
    # Si les documents ou cette configuration changent,
    # le nom de la collection changera aussi.
    signature = json.dumps(
        {
            "model": MODEL_NAME,
            "dimension": EMBEDDING_DIMENSION,
            "profile": "query-passage-normalized-v1",
            "rows": rows,
        },
        ensure_ascii=False,
        sort_keys=True,
    )

    fingerprint = sha256(
        signature.encode("utf-8")
    ).hexdigest()

    collection_name = (
        f"aml_docs_e5small_{fingerprint[:16]}"
    )

    # Calculer un vecteur pour chaque passage.
    # LocalE5Embeddings applique le préfixe "passage: ",
    # contrôle la longueur et normalise les vecteurs.
    vectors = embeddings.embed_documents(
        [row["page_content"] for row in rows]
    )

    # Une collection regroupe nos points vectoriels.
    # Elle doit accepter des vecteurs de 384 dimensions,
    # comparés avec la similarité cosinus.
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=models.Distance.COSINE,
            ),
        )

    # Vérifier la configuration avant l'enregistrement.
    params = (
        client.get_collection(collection_name)
        .config.params.vectors
    )

    if (
        not isinstance(params, models.VectorParams)
        or params.size != EMBEDDING_DIMENSION
        or params.distance != models.Distance.COSINE
    ):
        raise RuntimeError(
            "Configuration vectorielle incompatible."
        )

    # Chaque point contient :
    # - id : identifiant du chunk ;
    # - vector : représentation numérique du texte ;
    # - payload : texte original et métadonnées de provenance.
    points = [
        models.PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "page_content": row["page_content"],
                "metadata": {
                    **row["metadata"],
                    "embedding_model": MODEL_NAME,
                },
            },
        )
        for point_id, row, vector in zip(ids, rows, vectors)
    ]

    # upsert insère les nouveaux identifiants et remplace ceux
    # qui existent déjà. Relancer le même corpus ne crée donc
    # pas de points supplémentaires avec les mêmes IDs.
    #
    # wait=True attend la fin de l'opération.
    client.upsert(
        collection_name=collection_name,
        points=points,
        wait=True,
    )

    # Vérifier le nombre de points effectivement enregistrés.
    count = client.count(
        collection_name,
        exact=True,
    ).count

    # Vérifier également que tous les identifiants attendus
    # sont présents dans la collection.
    saved = client.retrieve(
        collection_name=collection_name,
        ids=ids,
        with_payload=False,
        with_vectors=False,
    )

    if (
        count != len(rows)
        or {str(point.id) for point in saved} != set(ids)
    ):
        raise RuntimeError(
            "L'indexation n'a pas été entièrement vérifiée."
        )

    # Ces informations seront utilisées par le script de recherche
    # pour sélectionner la bonne collection.
    return {
        "collection_name": collection_name,
        "embedding_model": MODEL_NAME,
        "embedding_dimension": EMBEDDING_DIMENSION,
        "corpus_sha256": fingerprint,
        "point_count": count,
        "chunking_version": CHUNKING_VERSION,
    }


def main() -> None:
    # Le chemin est calculé depuis ce fichier.
    # Le script doit donc rester à la racine du service.
    service_dir = Path(__file__).resolve().parent

    client = QdrantClient(
        url=os.getenv(
            "QDRANT_URL",
            "http://localhost:6333",
        ),
        timeout=30,
    )

    try:
        # Vérifier que Qdrant répond avant de charger le modèle.
        client.get_collections()

        # Reconstruire systématiquement depuis les sources actuelles.
        # Un ancien aperçu JSON ne peut plus être réindexé par erreur.
        rows, fingerprint, warnings, _ = prepare_corpus(service_dir)
        for warning in warnings:
            print(f"ATTENTION : {warning}")
        print(
            f"Calcul des embeddings pour {len(rows)} chunks..."
        )

        embeddings = LocalE5Embeddings()

        manifest = index_chunks(
            client=client,
            rows=rows,
            embeddings=embeddings,
        )

        if input_fingerprint(service_dir) != fingerprint:
            raise RuntimeError(
                "Le corpus ou son code a changé pendant l'indexation. "
                "Relancez index_documents.py avant de rechercher."
            )
        manifest["input_fingerprint"] = fingerprint

        # Ce fichier mémorise la collection à interroger
        # lors des prochaines recherches.
        manifest_path = (
            service_dir
            / "artifacts"
            / "index-manifest.json"
        )

        manifest_path.write_text(
            json.dumps(
                manifest,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        print(
            f"Collection : {manifest['collection_name']}"
        )
        print(
            f"Points vérifiés : {manifest['point_count']}"
        )
        print(f"Manifeste : {manifest_path}")

    finally:
        # Libérer les connexions réseau, même en cas d'erreur.
        client.close()


if __name__ == "__main__":
    main()
