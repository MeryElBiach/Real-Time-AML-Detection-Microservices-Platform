"""Récupération des sources documentaires pour le LLM."""

import json
import os
from pathlib import Path

from qdrant_client import QdrantClient

from rag.corpus import assert_index_current
from rag.embeddings import (
    EMBEDDING_DIMENSION,
    MODEL_NAME,
    LocalE5Embeddings,
)


def retrieve_sources(
    question: str,
    service_dir: Path,
) -> list[dict]:
    manifest = json.loads(
        (
            service_dir / "artifacts" / "index-manifest.json"
        ).read_text(encoding="utf-8")
    )

    # Empêcher l'utilisation d'un index devenu obsolète.
    assert_index_current(manifest, service_dir)

    if (
        manifest["embedding_model"] != MODEL_NAME
        or manifest["embedding_dimension"]
        != EMBEDDING_DIMENSION
    ):
        raise RuntimeError("Modèle incompatible avec l'index.")

    query_vector = LocalE5Embeddings().embed_query(question)

    client = QdrantClient(
        url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        timeout=30,
    )

    try:
        hits = client.query_points(
            collection_name=manifest["collection_name"],
            query=query_vector,
            limit=8,
            with_payload=True,
            with_vectors=False,
        ).points
    finally:
        client.close()

    sources = []
    seen = set()

    for hit in hits:
        metadata = hit.payload["metadata"]
        reference = metadata["parent_id"]

        if reference in seen:
            continue

        seen.add(reference)

        # Le LLM doit recevoir les conditions complètes.
        # Ne pas remplacer un parent absent par un fragment isolé.
        context = metadata.get("parent_text")

        if not isinstance(context, str) or not context.strip():
            raise RuntimeError(
                "Contexte documentaire incomplet : réindexer."
            )

        sources.append({
            # Identifiant court valable pour cette réponse.
            "id": f"S{len(sources) + 1}",
            "reference": reference,
            "source": metadata["source"],
            "version": metadata["version"],
            "nature": metadata["source_type"],
            "status": metadata.get(
                "implementation_status",
                metadata.get("regulatory_status", "non_precise"),
            ),
            "guidance_type": metadata.get(
                "guidance_type", "non_precise"
            ),
            "text": context,
        })

        # Deux sections pour cette première version.
        if len(sources) == 2:
            break

    # Refuser un contexte trop long plutôt que couper une condition.
    if sum(len(source["text"]) for source in sources) > 6000:
        raise ValueError(
            "Contexte trop long pour cette première version."
        )

    return sources