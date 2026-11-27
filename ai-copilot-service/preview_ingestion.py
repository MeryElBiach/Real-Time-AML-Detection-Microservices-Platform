"""Prépare un aperçu local des chunks, sans écrire dans Qdrant."""

from collections import Counter
from pathlib import Path

from rag.corpus import prepare_corpus


def main() -> None:
    # Les chemins dépendent de ce fichier,
    # et non du dossier depuis lequel le terminal est ouvert.
    service_dir = Path(__file__).resolve().parent
    rows, _, warnings, document_count = prepare_corpus(service_dir)
    output_path = service_dir / "artifacts" / "chunks-preview.json"

    for warning in warnings:
        print(f"ATTENTION : {warning}")

    print(f"Unités chargées : {document_count}")
    print(f"Chunks produits : {len(rows)}")

    counts = Counter(
        row["metadata"]["doc_id"]
        for row in rows
    )

    for doc_id, count in sorted(counts.items()):
        print(f"  {doc_id} : {count} chunks")

    print(f"Aperçu écrit dans : {output_path}")


if __name__ == "__main__":
    main()
