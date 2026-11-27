"""Vérification locale du modèle d'embeddings."""

from math import sqrt

from rag.embeddings import (
    EMBEDDING_DIMENSION,
    LocalE5Embeddings,
)


def main() -> None:
    print("Chargement du modèle d'embeddings…")
    embeddings = LocalE5Embeddings()

    # Exemples pédagogiques : ils ne sont pas des preuves d'une alerte.
    passages = [
        (
            "Un montant inhabituel peut être comparé "
            "au comportement transactionnel observé du compte."
        ),
        (
            "Les documents de connaissance client permettent "
            "de vérifier l'identité du titulaire."
        ),
    ]

    question = (
        "Comment examiner un virement dont le montant "
        "dépasse fortement les habitudes du compte ?"
    )

    document_vectors = embeddings.embed_documents(passages)
    question_vector = embeddings.embed_query(question)

    print(f"Nombre de passages : {len(document_vectors)}")
    print(f"Dimension : {len(question_vector)}")

    if len(question_vector) != EMBEDDING_DIMENSION:
        raise RuntimeError("Dimension inattendue.")

    # Une norme proche de 1 confirme ici la normalisation.
    norm = sqrt(sum(value * value for value in question_vector))
    print(f"Norme du vecteur question : {norm:.4f}")

    # Pour des vecteurs normalisés, le produit scalaire
    # correspond à leur similarité cosinus.
    for index, vector in enumerate(document_vectors, start=1):
        similarity = sum(
            query_value * document_value
            for query_value, document_value
            in zip(question_vector, vector)
        )

        print(
            f"Passage {index} — similarité : {similarity:.4f}"
        )


if __name__ == "__main__":
    main()