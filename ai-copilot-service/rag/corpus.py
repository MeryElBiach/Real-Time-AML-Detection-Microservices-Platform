"""Préparation du corpus et vérification de la fraîcheur de l'index."""

from hashlib import sha256
import json
from pathlib import Path

import yaml


def input_fingerprint(service_dir: Path) -> str:
    """Identifier les fichiers qui déterminent le contenu et ses vecteurs.

    Les fichiers JSON générés ne sont pas des entrées : une indexation les
    reconstruit à partir des documents et de la configuration actuels.
    """
    service_dir = service_dir.resolve()
    project_root = service_dir.parent
    catalog_path = service_dir / "corpus.yaml"
    catalog = yaml.safe_load(catalog_path.read_text(encoding="utf-8-sig"))

    if (
        not isinstance(catalog, dict)
        or not isinstance(catalog.get("markdown"), list)
        or not isinstance(catalog.get("pdf"), list)
    ):
        raise ValueError("corpus.yaml doit contenir les listes markdown et pdf.")

    source_paths = list(catalog["markdown"])
    for entry in catalog["pdf"]:
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            raise ValueError("Chaque source PDF doit déclarer un champ path.")
        source_paths.append(entry["path"])

    # Une modification du traitement invalide aussi les anciens résultats.
    paths = {catalog_path, service_dir / "index_documents.py"}
    pipeline_files = (
        "corpus.py", "document_loader.py", "pdf_sections.py",
        "chunker.py", "embeddings.py",
    )
    paths.update(service_dir / "rag" / name for name in pipeline_files)
    for relative_path in source_paths:
        if not isinstance(relative_path, str) or not relative_path.strip():
            raise ValueError("Chaque chemin documentaire doit être une chaîne.")
        paths.add(project_root / relative_path)

    digest = sha256()
    for path in sorted((path.resolve() for path in paths), key=str):
        relative_path = path.relative_to(project_root).as_posix()
        if not path.is_file():
            raise FileNotFoundError(f"Fichier requis absent : {relative_path}")
        digest.update(relative_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(sha256(path.read_bytes()).digest())

    return digest.hexdigest()


def prepare_corpus(service_dir: Path) -> tuple[list[dict], str, list[str], int]:
    """Reconstruire les chunks depuis les sources, puis enregistrer l'aperçu."""
    # Imports locaux : la recherche peut contrôler la fraîcheur de l'index
    # sans exécuter le chargeur documentaire ou le découpage.
    from rag.chunker import chunk_documents
    from rag.document_loader import load_corpus

    service_dir = service_dir.resolve()
    before = input_fingerprint(service_dir)
    documents, warnings = load_corpus(
        project_root=service_dir.parent,
        catalog_path=service_dir / "corpus.yaml",
    )
    chunks = chunk_documents(documents)
    if not chunks:
        raise RuntimeError("Aucun chunk produit : vérifier les sources.")

    # Ne pas valider un résultat pendant que les fichiers sont modifiés.
    if input_fingerprint(service_dir) != before:
        raise RuntimeError(
            "Le corpus ou son code a changé pendant la préparation. Relancez."
        )

    rows = [
        {
            "id": chunk.id,
            "page_content": chunk.page_content,
            "metadata": chunk.metadata,
        }
        for chunk in chunks
    ]
    output_dir = service_dir / "artifacts"
    output_dir.mkdir(exist_ok=True)
    (output_dir / "chunks-preview.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return rows, before, warnings, len(documents)


def assert_index_current(manifest: dict, service_dir: Path) -> None:
    """Refuser un ancien index tant qu'il n'a pas été reconstruit."""
    if manifest.get("input_fingerprint") != input_fingerprint(service_dir):
        raise RuntimeError(
            "L'index est obsolète ou provient de l'ancienne préparation. "
            "Exécutez : .\\.venv\\Scripts\\python.exe index_documents.py"
        )
