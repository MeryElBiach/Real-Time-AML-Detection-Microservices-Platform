"""Embeddings locaux E5, compatibles avec l'interface LangChain."""

from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer


MODEL_NAME = "intfloat/multilingual-e5-small"
EMBEDDING_DIMENSION = 384


class LocalE5Embeddings(Embeddings):
    """
    Adapte Sentence Transformers à LangChain.

    LangChain attend principalement deux méthodes :
    - embed_documents() pour les passages du corpus ;
    - embed_query() pour la question de l'utilisateur.

    Cette distinction permet d'appliquer correctement
    les préfixes attendus par E5.
    """

    def __init__(self) -> None:
        # Le premier chargement télécharge le modèle.
        # Les chargements suivants réutilisent normalement son cache.
        #
        # device="cpu" permet de fonctionner sans carte graphique.
        self.model = SentenceTransformer(
            MODEL_NAME,
            device="cpu",
        )

        self.max_tokens = self.model.max_seq_length

    def _encode(
        self,
        texts: list[str],
        prefix: str,
    ) -> list[list[float]]:
        """Méthode commune aux passages et aux questions."""

        if not texts:
            return []

        for index, text in enumerate(texts):
            if not isinstance(text, str) or not text.strip():
                raise ValueError(
                    f"Le texte à la position {index} est vide ou invalide."
                )

        # Les préfixes restent en anglais, même pour un texte français.
        # Ils indiquent au modèle le rôle de chaque entrée.
        prepared_texts = [
            prefix + text
            for text in texts
        ]

        # Notre découpage précédent comptait des caractères.
        # Le modèle, lui, compte des tokens.
        #
        # Nous vérifions la longueur avant le calcul pour éviter
        # qu'un passage trop long soit tronqué silencieusement.
        tokenized = self.model.tokenizer(
            prepared_texts,
            add_special_tokens=True,
            truncation=False,
        )

        for index, token_ids in enumerate(tokenized["input_ids"]):
            if len(token_ids) > self.max_tokens:
                raise ValueError(
                    f"Texte {index} : {len(token_ids)} tokens, "
                    f"limite du modèle : {self.max_tokens}. "
                    "Il faut adapter le découpage avant indexation."
                )

        vectors = self.model.encode(
            prepared_texts,

            # Petit lot pour limiter la mémoire utilisée.
            batch_size=8,

            # Chaque vecteur aura une norme proche de 1.
            # Cela facilite les comparaisons par similarité cosinus.
            normalize_embeddings=True,

            convert_to_numpy=True,
            show_progress_bar=False,
        )

        if vectors.shape[1] != EMBEDDING_DIMENSION:
            raise RuntimeError(
                "La dimension produite ne correspond pas "
                "au modèle configuré."
            )

        # LangChain attend des listes Python.
        return vectors.tolist()

    def embed_documents(
        self,
        texts: list[str],
    ) -> list[list[float]]:
        """Calcule un vecteur pour chaque passage documentaire."""

        return self._encode(
            texts,
            prefix="passage: ",
        )

    def embed_query(
        self,
        text: str,
    ) -> list[float]:
        """Calcule le vecteur d'une question."""

        return self._encode(
            [text],
            prefix="query: ",
        )[0]