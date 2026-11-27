"""Regroupe les paragraphes 20 et 21 du GAFI, édition juin 2026."""

import re

from langchain_core.documents import Document


def prepare_pdf_sections(
    documents: list[Document],
) -> list[Document]:
    target_id = "GAFI-REC-FR-2026-06"

    # Retrouver les pages du document GAFI.
    pages = {
        doc.metadata["pdf_page"]: doc
        for doc in documents
        if doc.metadata.get("format") == "pdf"
        and doc.metadata["doc_id"] == target_id
    }

    if not {81, 82, 83}.issubset(pages):
        raise ValueError(
            "Ajouter la page 83 dans corpus.yaml."
        )

    def clean_page(text: str) -> str:
        # Retirer les en-têtes et pieds de page connus.
        lines = []

        for line in text.splitlines():
            stripped = line.strip()

            if (
                stripped.startswith("RECOMMANDATIONS DU GAFI")
                or stripped.startswith("Normes internationales sur")
                or "\uf8e9" in stripped
                or "\u00a9" in stripped
                or stripped.isdigit()
            ):
                continue

            lines.append(line)

        return "\n".join(lines)

    # Bornes vérifiées pour cette édition du PDF.
    definitions = [
        (
            "NI10-20", 81, 82,
            r"\b20\.\s*Les institutions",
            r"Mesures\s+de\s+vigilance\s+simplifi\u00e9es",
            "unusual_transactions",
        ),
        (
            "NI10-21", 82, 83,
            r"\b21\.\s*Lorsque",
            r"\bSeuils\b",
            "simplified_due_diligence",
        ),
    ]

    # Conserver les autres documents.
    # Remplacer les pages 81–83 par les paragraphes complets.
    prepared = [
        doc
        for doc in documents
        if not (
            doc.metadata.get("format") == "pdf"
            and doc.metadata["doc_id"] == target_id
            and doc.metadata["pdf_page"] in {81, 82, 83}
        )
    ]

    for section_id, first, last, start_pattern, end_pattern, topic in definitions:
        text = "\n".join(
            clean_page(pages[number].page_content)
            for number in range(first, last + 1)
        )

        start = re.search(start_pattern, text)

        end = (
            re.search(end_pattern, text[start.end():])
            if start
            else None
        )

        if start is None or end is None:
            raise ValueError(
                f"Bornes introuvables pour {section_id}."
            )

        end_position = start.end() + end.start()
        section_text = text[
            start.start():end_position
        ].strip()

        prepared.append(
            Document(
                page_content=section_text,
                metadata={
                    **pages[first].metadata,
                    "section_id": section_id,
                    "pdf_page_start": first,
                    "pdf_page_end": last,

                    # Sujet du texte, pas niveau de risque du client.
                    "guidance_type": topic,
                },
            )
        )

    return prepared