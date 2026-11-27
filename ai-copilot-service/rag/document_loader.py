"""Lecture des sources : un Document LangChain par Markdown ou page PDF."""

from hashlib import sha256
from pathlib import Path

import yaml
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader


def load_corpus(
    project_root: Path,
    catalog_path: Path,
) -> tuple[list[Document], list[str]]:
    # Le catalogue désigne explicitement les fichiers du corpus.
    # safe_load lit les données YAML sans construire d'objets
    # Python arbitraires.
    catalog = yaml.safe_load(
        catalog_path.read_text(encoding="utf-8-sig")
    )

    documents = []
    warnings = []
    seen_ids = set()

    def register(metadata: dict, path: Path) -> dict:
        # Ces champs serviront à identifier et filtrer les sources.
        for key in ("doc_id", "title", "version", "source_type"):
            if (
                not isinstance(metadata.get(key), str)
                or not metadata[key].strip()
            ):
                raise ValueError(
                    f"{path.name} : métadonnée invalide : {key}"
                )

        # Deux sources différentes ne doivent pas partager le même ID.
        if metadata["doc_id"] in seen_ids:
            raise ValueError(
                f"doc_id dupliqué : {metadata['doc_id']}"
            )
        seen_ids.add(metadata["doc_id"])

        return {
            **metadata,

            # Chemin relatif pour garder une provenance portable.
            "source": path.relative_to(project_root).as_posix(),

            # Empreinte du fichier original.
            # Si son contenu change, son empreinte change aussi.
            "file_sha256": sha256(path.read_bytes()).hexdigest(),
        }

    # -------- Lecture des documents Markdown --------

    for relative_path in catalog["markdown"]:
        path = project_root / relative_path
        lines = path.read_text(
            encoding="utf-8-sig"
        ).splitlines()

        # L'en-tête YAML commence et se termine par une ligne "---".
        if not lines or lines[0].strip() != "---":
            raise ValueError(
                f"{path.name} : en-tête YAML absent"
            )

        end = next(
            (
                i
                for i in range(1, len(lines))
                if lines[i].strip() == "---"
            ),
            None,
        )

        if end is None:
            raise ValueError(
                f"{path.name} : en-tête YAML non fermé"
            )

        metadata = yaml.safe_load("\n".join(lines[1:end]))

        if not isinstance(metadata, dict):
            raise ValueError(
                f"{path.name} : métadonnées YAML invalides"
            )

        # On sépare les métadonnées du texte à rechercher.
        text = "\n".join(lines[end + 1:]).strip()

        if not text:
            raise ValueError(f"{path.name} : corps vide")

        documents.append(
            Document(
                page_content=text,
                metadata={
                    **register(metadata, path),
                    "format": "markdown",
                },
            )
        )

    # -------- Lecture des documents PDF --------

    for entry in catalog["pdf"]:
        path = project_root / entry["path"]
        common = register(entry["metadata"], path)

        # Une unité par page pour conserver des citations précises.
        pages = PyPDFLoader(
            str(path),
            mode="page",
        ).load()

        selected = entry.get("pdf_pages")

        if selected is not None and (
            not selected
            or any(
                type(n) is not int or not 1 <= n <= len(pages)
                for n in selected
            )
        ):
            raise ValueError(
                f"{path.name} : sélection de pages invalide"
            )

        empty_pages = []
        kept = 0

        for page in pages:
            # LangChain compte à partir de 0.
            # Notre champ pdf_page compte à partir de 1.
            page_number = page.metadata["page"] + 1

            if (
                selected is not None
                and page_number not in selected
            ):
                continue

            # Une page sans texte n'est pas un passage exploitable.
            # Le loader ne réalise pas lui-même d'OCR.
            if not page.page_content.strip():
                empty_pages.append(page_number)
                continue

            documents.append(
                Document(
                    page_content=page.page_content,
                    metadata={
                        **page.metadata,
                        **common,
                        "format": "pdf",
                        "pdf_page": page_number,
                    },
                )
            )

            kept += 1

        if empty_pages:
            warnings.append(
                f"{path.name} : {len(empty_pages)} page(s) "
                "sélectionnée(s) sans texte extractible ; "
                "contrôle visuel/OCR nécessaire."
            )

        if kept == 0:
            warnings.append(
                f"{path.name} : aucune page retenue ; PDF exclu."
            )

    return documents, warnings