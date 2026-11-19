"""Phase 1 unit tests: PDF extraction, schema validation, citation checking, and CLI pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from extract_requirements import extract_pdf_pages, extract_tender_requirements, main
from schema import (
    ExtractionOutput,
    StructuredCondition,
    parse_llm_requirements_json,
    validate_and_enrich_requirements,
)
from scripts.generate_sample_tenders import main as generate_samples

ROOT_DIR = Path(__file__).resolve().parent.parent
SAMPLE_1 = ROOT_DIR / "samples" / "sample_1_bilingual_jkr_maintenance.pdf"
SAMPLE_3 = ROOT_DIR / "samples" / "sample_3_bm_construction_edge_cases.pdf"


@pytest.fixture(scope="session", autouse=True)
def ensure_sample_pdfs() -> None:
    if not SAMPLE_1.exists() or not SAMPLE_3.exists():
        generate_samples()


def test_pdf_text_and_scanned_page_detection() -> None:
    pages_info, pages_text_map, low_quality_pages = extract_pdf_pages(
        SAMPLE_1,
        client=None,
        allow_llm_ocr=False,
    )
    assert len(pages_info) == 4
    assert pages_info[0].extraction_method == "text"
    assert pages_info[0].low_quality is False
    assert "CIDB Gred G4" in pages_text_map[1]

    # Page 4 is embedded raster image with 0 selectable chars; without tesseract/LLM OCR, flagged low_quality
    assert 4 in low_quality_pages
    assert pages_info[3].low_quality is True
    assert pages_info[3].image_count == 1


def test_non_pdf_rejected(tmp_path: Path) -> None:
    bad_file = tmp_path / "tender.docx"
    bad_file.write_text("not a pdf", encoding="utf-8")
    with pytest.raises(ValueError, match="Only PDF files are supported"):
        extract_pdf_pages(bad_file)


def test_malformed_json_rejected() -> None:
    with pytest.raises(ValueError, match="Malformed JSON"):
        parse_llm_requirements_json("{bad json: [}")

    with pytest.raises(ValueError, match="Expected JSON array or object"):
        parse_llm_requirements_json('"just a string"')


def test_schema_validation_enforces_required_fields() -> None:
    pages_map = {1: "Kontraktor hendaklah berdaftar dengan CIDB Gred G4."}
    with pytest.raises(ValidationError):
        validate_and_enrich_requirements(
            raw_requirements=[
                {
                    "original_text": "   ",  # Blank original_text must fail
                    "language": "ms",
                    "mandatory_status": "mandatory",
                    "category": "cidb_registration",
                    "is_disqualifying": True,
                    "explanation": "CIDB G4 required.",
                    "source_page": 1,
                    "source_excerpt": "CIDB Gred G4",
                    "confidence": "high",
                    "review_required": False,
                }
            ],
            pages_text_map=pages_map,
            low_quality_pages=[],
        )


def test_citation_verifier_flags_uncited_and_hallucinated_excerpts() -> None:
    pages_map = {
        1: "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas.",
        2: "Taklimat Tender DIWAJIBKAN pada 25 November 2026.",
    }
    raw = [
        {
            "original_text": "Must submit audited financial statements.",
            "language": "en",
            "mandatory_status": "mandatory",
            "category": "mandatory_documents",
            "is_disqualifying": True,
            "structured_condition": None,
            "explanation": "Missing page citation.",
            "source_page": None,
            "source_excerpt": "",
            "confidence": "high",
            "review_required": False,
        },
        {
            "original_text": "Must hold ISO 9001 certificate.",
            "language": "en",
            "mandatory_status": "mandatory",
            "category": "other",
            "is_disqualifying": False,
            "structured_condition": StructuredCondition(rule_type="status_flag", field="iso", operator="==", value=True).model_dump(),
            "explanation": "Hallucinated excerpt not present on page 1.",
            "source_page": 1,
            "source_excerpt": "Completely fabricated ISO 9001 clause absent from document",
            "confidence": "high",
            "review_required": False,
        },
    ]

    results = validate_and_enrich_requirements(raw, pages_map, low_quality_pages=[])
    assert len(results) == 2

    assert "UNCITED_ITEM" in results[0].validation_flags
    assert results[0].review_required is True

    assert "EXCERPT_NOT_VERIFIED_ON_PAGE" in results[1].validation_flags
    assert results[1].review_required is True


def test_unreadable_page_safeguard_always_added() -> None:
    pages_map = {1: "Valid readable page text with plenty of characters for analysis.", 2: ""}
    results = validate_and_enrich_requirements(
        raw_requirements=[],
        pages_text_map=pages_map,
        low_quality_pages=[2],
    )
    assert len(results) == 1
    assert results[0].extraction_pass == "system_safeguard"
    assert results[0].source_page == 2
    assert results[0].review_required is True
    assert "UNREADABLE_PAGE_SAFEGUARD" in results[0].validation_flags


def test_deduplication_between_initial_and_coverage_passes() -> None:
    pages_map = {1: "Berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B04."}
    item = {
        "original_text": "Berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B04.",
        "language": "ms",
        "mandatory_status": "mandatory",
        "category": "cidb_registration",
        "is_disqualifying": True,
        "structured_condition": {
            "rule_type": "cidb_grade",
            "field": "cidb_grade",
            "operator": ">=",
            "value": "G4",
        },
        "explanation": "CIDB G4 required.",
        "source_page": 1,
        "source_excerpt": "Berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B04.",
        "confidence": "high",
        "review_required": False,
    }
    dup_coverage = dict(item, extraction_pass="coverage")
    results = validate_and_enrich_requirements([item, dup_coverage], pages_map, low_quality_pages=[])
    assert len(results) == 1
    assert results[0].id == "REQ-001"
    assert results[0].extraction_pass == "initial"


def test_end_to_end_cli_mock_llm_outputs_valid_json(tmp_path: Path) -> None:
    out_file = tmp_path / "requirements.json"
    exit_code = main([str(SAMPLE_1), "--mock-llm", "-o", str(out_file)])
    assert exit_code == 0
    assert out_file.exists()

    payload = json.loads(out_file.read_text(encoding="utf-8"))
    parsed = ExtractionOutput.model_validate(payload)
    assert parsed.page_count == 4
    assert 4 in parsed.low_quality_pages
    assert parsed.summary.coverage_pass_added_count >= 1
    assert parsed.summary.tier_b_disqualifying_count >= 10

    # Verify atomic splitting of compound CIDB clause on page 1
    cidb_types = {
        r.structured_condition.rule_type
        for r in parsed.requirements
        if r.category == "cidb_registration" and r.structured_condition
    }
    assert {"cidb_grade", "cidb_category", "cidb_validity"}.issubset(cidb_types)

    # Verify BM wording is preserved verbatim without translation
    cidb_grade_req = next(
        r for r in parsed.requirements if r.structured_condition and r.structured_condition.rule_type == "cidb_grade"
    )
    assert "Kontraktor hendaklah berdaftar dengan CIDB Gred G4" in cidb_grade_req.original_text


def test_mocked_gemini_rejects_malformed_json_response(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-test-key")
    bad_resp = MagicMock()
    bad_resp.text = "NOT VALID JSON AT ALL {"
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = bad_resp

    with patch("extract_requirements.genai.Client", return_value=mock_client):
        with pytest.raises(ValueError, match="Malformed JSON"):
            extract_tender_requirements(SAMPLE_3, mock_llm=False, allow_llm_ocr=False)
