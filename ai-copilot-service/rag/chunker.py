"""Découpage des documents, avec héritage de leur provenance."""

from uuid import NAMESPACE_URL, uuid5

from langchain_core.documents import Document
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from rag.pdf_sections import prepare_pdf_sections


# Les tailles sont exprimées en caractères, pas en tokens.
CHUNK_SIZE = 1400
CHUNK_OVERLAP = 200

# Versionner le découpage permet de savoir comment les chunks
# ont été produits lorsque nous modifierons les paramètres.
CHUNKING_VERSION = "sections-1400-200-v2"


def chunk_documents(
    documents: list[Document],
) -> list[Document]:
    documents = prepare_pdf_sections(documents)
    headers = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "document_heading"),
            ("##", "section"),
        ],
        strip_headers=False,
    )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,

        # Essayer de séparer d'abord les paragraphes,
        # puis les lignes, puis les mots.
        # Le dernier séparateur permet de traiter les textes
        # sans espaces ou retours à la ligne.
        separators=["\n\n", "\n", " ", ""],
    )

    chunks = []

    for document in documents:
        if document.metadata["format"] == "markdown":
            # Première séparation selon les sections METH-xx / INV-xx.
            parents = headers.split_text(document.page_content)

            for parent in parents:
                # Chaque section conserve la provenance du document.
                parent.metadata = {
                    **document.metadata,
                    **parent.metadata,
                }

                heading = parent.metadata.get("section", "")

                parent.metadata["section_id"] = (
                    heading.split(" ", 1)[0]
                    if heading
                    else "INTRO"
                )

        else:
            # Pour le PDF, le parent est une page ou un paragraphe regroupé.
            parents = [document]

        for parent in parents:
            meta = parent.metadata

            # INV-08 contient un rapport entièrement fictif.
            # Nous l'excluons du corpus destiné aux investigations.
            if (
                meta["doc_id"] == "AML-PISTES-001"
                and meta.get("section_id") == "INV-08"
            ):
                continue

            locator = (
                meta.get("section_id")
                or f"pdf-page-{meta['pdf_page']}"
            )

            parent_id = f"{meta['doc_id']}/{locator}"

            # On découpe chaque parent séparément :
            # aucun chunk ne mélange deux unités documentaires parentes.
            pieces = splitter.split_documents([parent])

            for index, chunk in enumerate(pieces):
                # Une identité reproductible :
                # même source, même révision et même découpage
                # donnent le même identifiant.
                identity = (
                    f"{parent_id}|{meta['file_sha256']}|"
                    f"{CHUNKING_VERSION}|{index}"
                )

                chunk_id = str(
                    uuid5(NAMESPACE_URL, identity)
                )

                chunk.id = chunk_id

                chunk.metadata.update({
                    "chunk_id": chunk_id,
                    "parent_id": parent_id,
                    "chunk_index": index,
                    "chunking_version": CHUNKING_VERSION,

                    # Le petit passage servira à la recherche.
                    #
                    # Nous conservons également sa section/page
                    # complète pour pouvoir retrouver les conditions
                    # et limites lors de la restitution.
                    "parent_text": parent.page_content,
                })

                chunks.append(chunk)

    return chunks
