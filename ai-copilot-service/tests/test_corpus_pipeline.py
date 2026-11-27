"""Régressions : aperçu périmé, modification des sources et contexte GAFI."""

import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from langchain_core.documents import Document

from rag.corpus import assert_index_current, input_fingerprint, prepare_corpus


class CorpusFreshnessTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="aml-rag-tests-")
        self.root = Path(temporary.name).resolve()
        self.assertTrue(self.root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
        self.addCleanup(temporary.cleanup)
        self.service = self.root / "ai-copilot-service"
        (self.service / "rag").mkdir(parents=True)
        (self.root / "docs").mkdir()
        self.document_path = self.root / "docs" / "source.md"
        self.document_path.write_text("Document initial", encoding="utf-8")
        (self.service / "corpus.yaml").write_text(
            "markdown:\n  - docs/source.md\npdf: []\n", encoding="utf-8"
        )
        (self.service / "index_documents.py").write_text("# index\n", encoding="utf-8")
        for name in (
            "corpus.py", "document_loader.py", "pdf_sections.py",
            "chunker.py", "embeddings.py",
        ):
            (self.service / "rag" / name).write_text("# pipeline\n", encoding="utf-8")
        self.chunk = Document(
            id="c23e9f9b-387b-4908-b72d-1eb31c9959dd",
            page_content="Passage actuel",
            metadata={"doc_id": "TEST"},
        )

    def test_legacy_manifest_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "obsolète"):
            assert_index_current({"point_count": 43}, self.service)

    def test_source_configuration_and_code_changes_invalidate_index(self):
        paths = [
            self.document_path,
            self.service / "corpus.yaml",
            self.service / "rag" / "chunker.py",
        ]
        for path in paths:
            with self.subTest(path=path.name):
                manifest = {"input_fingerprint": input_fingerprint(self.service)}
                assert_index_current(manifest, self.service)
                path.write_text(
                    path.read_text(encoding="utf-8") + "\n# modification\n",
                    encoding="utf-8",
                )
                with self.assertRaisesRegex(RuntimeError, "obsolète"):
                    assert_index_current(manifest, self.service)

    def test_generated_preview_does_not_invalidate_index(self):
        manifest = {"input_fingerprint": input_fingerprint(self.service)}
        artifacts = self.service / "artifacts"
        artifacts.mkdir()
        (artifacts / "chunks-preview.json").write_text("[]", encoding="utf-8")
        assert_index_current(manifest, self.service)

    def test_preparation_replaces_stale_preview_from_sources(self):
        artifacts = self.service / "artifacts"
        artifacts.mkdir()
        preview = artifacts / "chunks-preview.json"
        preview.write_text('[{"old": true}]', encoding="utf-8")
        with (
            patch("rag.document_loader.load_corpus", return_value=([self.chunk], [])),
            patch("rag.chunker.chunk_documents", return_value=[self.chunk]),
        ):
            rows, fingerprint, _, _ = prepare_corpus(self.service)
        saved = json.loads(preview.read_text(encoding="utf-8"))
        self.assertEqual(saved, rows)
        self.assertEqual(saved[0]["page_content"], "Passage actuel")
        self.assertEqual(fingerprint, input_fingerprint(self.service))

    def test_change_during_preparation_preserves_previous_preview(self):
        artifacts = self.service / "artifacts"
        artifacts.mkdir()
        preview = artifacts / "chunks-preview.json"
        previous = '[{"previous": true}]'
        preview.write_text(previous, encoding="utf-8")

        def changed_source(*args, **kwargs):
            self.document_path.write_text("Source modifiée", encoding="utf-8")
            return [self.chunk], []

        with (
            patch("rag.document_loader.load_corpus", side_effect=changed_source),
            patch("rag.chunker.chunk_documents", return_value=[self.chunk]),
        ):
            with self.assertRaisesRegex(RuntimeError, "changé"):
                prepare_corpus(self.service)
        self.assertEqual(preview.read_text(encoding="utf-8"), previous)


class GafiContextTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from rag.chunker import chunk_documents
        from rag.document_loader import load_corpus

        service = Path(__file__).resolve().parents[1]
        documents, _ = load_corpus(service.parent, service / "corpus.yaml")
        cls.chunks = chunk_documents(documents)

    def test_paragraph_21_keeps_its_restriction_from_next_page(self):
        matches = [
            chunk for chunk in self.chunks
            if chunk.metadata.get("parent_id") == "GAFI-REC-FR-2026-06/NI10-21"
        ]
        self.assertTrue(matches)
        for chunk in matches:
            normalized = " ".join(chunk.metadata["parent_text"].split())
            self.assertIn("ne sont pas acceptables", normalized)
            self.assertEqual(chunk.metadata["pdf_page_start"], 82)
            self.assertEqual(chunk.metadata["pdf_page_end"], 83)

    def test_chunk_provenance_is_unique_and_fictional_report_is_excluded(self):
        ids = [chunk.id for chunk in self.chunks]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertFalse(any(
            chunk.metadata.get("parent_id") == "AML-PISTES-001/INV-08"
            for chunk in self.chunks
        ))
        for chunk in self.chunks:
            self.assertTrue(chunk.metadata["parent_text"])
            self.assertLessEqual(len(chunk.page_content), 1400)


if __name__ == "__main__":
    unittest.main()
