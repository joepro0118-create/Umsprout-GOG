"""Unit tests for extraction reliability fixes (Fixes 1 through 9) using real clauses from TEST_REPORT.md."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from google.genai import errors as genai_errors
from google.genai import types
import pymupdf
import pytest

from extract_requirements import (
     LLMCallStats,
    PROMPT_VERSION,
    QuotaExhaustedError,
    RateLimiter,
    SUPPORTED_MODELS,
    _generate_content_pinned,
    _has_significant_images,
    _ocr_batch_with_gemini_vision,
    build_generation_config_for_model,
    extract_pdf_pages,
    extract_tender_requirements,
    merge_text_and_ocr,
    parse_args,
    strip_watermarks,
)
from rules_engine import evaluate_requirement, load_company_profile
from schema import (
    ExtractedRequirement,
    StructuredCondition,
    compute_is_disqualifying,
    detect_rejection_language,
    infer_applies_to,
    resolve_substantive_page_citation,
    validate_and_enrich_requirements,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
PROFILE_PATH = ROOT_DIR / "data" / "company_profile.json"


# ---------------------------------------------------------------------------
# Fix 1: OCR coverage for hybrid pages & watermark removal
# ---------------------------------------------------------------------------


def test_strip_watermarks_and_merge_text_and_ocr() -> None:
    raw_watermarked = (
        "5                                                                 Sebut Harga : S0175/26 \n"
        "S0175/26 \n"
        "NO SEBUTHARGA : S0175/26\n"
        "MEJA TAWARAN\n"
        "KEMENTERIAN KEWANGAN : 221002 (MEMBERSIH KAWASAN) MEJA TAWARAN"
    )
    cleaned = strip_watermarks(raw_watermarked)
    assert "MEJA TAWARAN" not in cleaned
    assert "NO SEBUTHARGA" not in cleaned
    assert "221002 (MEMBERSIH KAWASAN)" in cleaned

    text_layer = "S0175/26\n221002 (MEMBERSIH KAWASAN)\n3 NOVEMBER 2026 (SELASA)"
    ocr_layer = (
        "BORANG KONTRAK (AM) 1/91\n"
        "KEMENTERIAN KEWANGAN : 221002 (MEMBERSIH KAWASAN)\n"
        "TARIKH TUTUP : 3 NOVEMBER 2026 (SELASA) JAM 12.00 TENGAHARI\n"
        "MUSTAHAK: KEGAGALAN MENGEMUKAKAN ITEM-ITEM TERSEBUT MENYEBABKAN DOKUMEN AKAN DITOLAK.\n"
        "MEJA TAWARAN"
    )
    merged = merge_text_and_ocr(text_layer, ocr_layer)
    assert "BORANG KONTRAK (AM) 1/91" in merged
    assert "JAM 12.00 TENGAHARI" in merged
    assert "AKAN DITOLAK" in merged
    assert "MEJA TAWARAN" not in merged


def test_significant_image_detection_skips_tiny_logos_and_triggers_hybrid_ocr(tmp_path: Path) -> None:
    pdf_path = tmp_path / "hybrid_and_logo.pdf"
    doc = pymupdf.open()

    # Build a 100x100 solid PNG in memory via Pixmap
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 100, 100), False)
    pix.clear_with(200)
    png_bytes = pix.tobytes("png")

    # Page 1: >60 chars text + tiny logo (<1% of page area) -> should NOT trigger OCR
    p1 = doc.new_page(width=600, height=800)
    p1.insert_text((40, 60), "A" * 120 + " clean text page with a tiny header logo image.")
    p1.insert_image(pymupdf.Rect(20, 10, 50, 30), stream=png_bytes)  # 600 / 480000 = 0.125%

    # Page 2: >60 chars text + large embedded form image (50% of page area) -> hybrid page -> text+ocr
    p2 = doc.new_page(width=600, height=800)
    p2.insert_text((40, 60), "S0175/26 221002 (MEMBERSIH KAWASAN) 3 NOVEMBER 2026 (SELASA) " + ("B" * 80))
    p2.insert_image(pymupdf.Rect(30, 100, 570, 550), stream=png_bytes)  # >50% area

    # Page 3: Only 37-char watermark + full-page scan that returns [UNREADABLE_PAGE] -> stays low_quality
    p3 = doc.new_page(width=600, height=800)
    p3.insert_text((40, 40), "NO SEBUTHARGA : S0175/26\nMEJA TAWARAN")
    p3.insert_image(pymupdf.Rect(0, 0, 600, 800), stream=png_bytes)

    doc.save(str(pdf_path))
    doc.close()

    reopened = pymupdf.open(str(pdf_path))
    try:
        assert _has_significant_images(reopened[0]) is False
        assert _has_significant_images(reopened[1]) is True
        assert _has_significant_images(reopened[2]) is True
    finally:
        reopened.close()

    # Mock Gemini batch OCR response for pages 2 and 3
    batch_resp = MagicMock()
    batch_resp.text = json.dumps(
        {
            "pages": [
                {
                    "page_number": 2,
                    "text": "KEMENTERIAN KEWANGAN : 221002 MUSTAHAK: DOKUMEN AKAN DITOLAK JAM 12.00 TENGAHARI",
                },
                {
                    "page_number": 3,
                    "text": "[UNREADABLE_PAGE]",
                },
            ]
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = batch_resp

    stats = LLMCallStats(pdf_sha256="testsha", use_cache=False, cache_dir=tmp_path / "cache")
    limiter = RateLimiter(requests_per_minute=0)

    with patch("extract_requirements._ocr_with_tesseract", return_value=("", False, "no tesseract")):
        pages_info, pages_text_map, low_quality_pages = extract_pdf_pages(
            pdf_path,
            client=mock_client,
            model_name="gemini-3-flash-preview",
            allow_llm_ocr=True,
            stats=stats,
            rate_limiter=limiter,
        )

    assert pages_info[0].extraction_method == "text"
    assert pages_info[0].low_quality is False

    # Page 2 is hybrid -> text+ocr with merged text layer and OCR text
    assert pages_info[1].extraction_method == "text+ocr"
    assert pages_info[1].low_quality is False
    assert "221002 (MEMBERSIH KAWASAN)" in pages_text_map[2]
    assert "JAM 12.00 TENGAHARI" in pages_text_map[2]

    # Page 3 remained illegible after OCR -> low_quality_pages + unreadable safeguard
    assert 3 in low_quality_pages
    assert pages_info[2].low_quality is True

    reqs = validate_and_enrich_requirements([], pages_text_map, low_quality_pages)
    assert any(r.source_page == 3 and "UNREADABLE_PAGE_SAFEGUARD" in r.validation_flags for r in reqs)


# ---------------------------------------------------------------------------
# Fix 2: One pinned model per run (retry same model, no mid-run model switch)
# ---------------------------------------------------------------------------


def test_pinned_model_retries_same_model_and_never_switches(tmp_path: Path) -> None:
    calls: list[str] = []

    def side_effect(*, model: str, contents, config):
        calls.append(model)
        if len(calls) < 3:
            raise genai_errors.APIError(503, {"message": "Service temporarily unavailable"})
        resp = MagicMock()
        resp.text = '{"requirements": []}'
        return resp

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = side_effect
    sleeps: list[float] = []
    stats = LLMCallStats(pdf_sha256="sha_retry", use_cache=False, cache_dir=tmp_path)

    text, used_model = _generate_content_pinned(
        client=mock_client,
        model_name="gemini-3-flash-preview",
        contents="test prompt",
        step_id="extract_merged_pass",
        stats=stats,
        rate_limiter=RateLimiter(requests_per_minute=0),
        max_retries=3,
        base_backoff_seconds=1.0,
        sleep_fn=sleeps.append,
    )
    assert used_model == "gemini-3-flash-preview"
    assert calls == ["gemini-3-flash-preview", "gemini-3-flash-preview", "gemini-3-flash-preview"]
    assert sleeps == [1.0, 2.0]
    assert text == '{"requirements": []}'


def test_pinned_model_fails_clearly_without_switching_when_retries_exhausted(tmp_path: Path) -> None:
    calls: list[str] = []

    def side_effect(*, model: str, contents, config):
        calls.append(model)
        raise genai_errors.APIError(504, {"message": "Deadline exceeded"})

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = side_effect
    stats = LLMCallStats(pdf_sha256="sha_fail", use_cache=False, cache_dir=tmp_path)

    with pytest.raises(RuntimeError, match="Pinned model 'gemini-3.1-flash-lite' failed"):
        _generate_content_pinned(
            client=mock_client,
            model_name="gemini-3.1-flash-lite",
            contents="test",
            step_id="extract_merged_pass",
            stats=stats,
            rate_limiter=RateLimiter(requests_per_minute=0),
            max_retries=2,
            sleep_fn=lambda _: None,
        )
    # Must never have attempted any other model
    assert set(calls) == {"gemini-3.1-flash-lite"}
    assert len(calls) == 3


# ---------------------------------------------------------------------------
# Fix 3: gemini-4-hydrogen OCR config validity (no ThinkingLevel.MINIMAL)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("model_name", SUPPORTED_MODELS)
def test_request_config_valid_for_each_supported_model(model_name: str) -> None:
    ocr_cfg = build_generation_config_for_model(model_name, for_ocr=True)
    ext_cfg = build_generation_config_for_model(
        model_name,
        for_ocr=False,
        system_instruction="system",
        response_mime_type="application/json",
    )
    for cfg in (ocr_cfg, ext_cfg):
        assert isinstance(cfg, types.GenerateContentConfig)
        assert cfg.temperature == 0.0
        if cfg.thinking_config is not None:
            assert cfg.thinking_config.thinking_level != types.ThinkingLevel.MINIMAL
            assert cfg.thinking_config.thinking_level == types.ThinkingLevel.LOW


# ---------------------------------------------------------------------------
# Fix 4: Deterministic Tier B (is_disqualifying) on real TEST_REPORT.md clauses
# ---------------------------------------------------------------------------


def test_deterministic_tier_b_on_real_clauses_from_test_report() -> None:
    # 1. Explicit rejection clauses -> True
    assert compute_is_disqualifying(
        category="submission_instructions",
        mandatory_status="mandatory",
        original_text=(
            "3) Sebarang pengemukaan dokumen meja tawaran yang telah disunting atau tidak disunting "
            "ke dalam peti tender pada tarikh serahan akhir dokumen, boleh menyebabkan dokumen tawaran "
            "tersebut DITOLAK DENGAN SERTA MERTA."
        ),
        has_rejection_language=True,
        rejection_quote="DITOLAK DENGAN SERTA MERTA",
    ) is True

    assert compute_is_disqualifying(
        category="mandatory_documents",
        mandatory_status="mandatory",
        original_text=(
            "MUSTAHAK: SILA LAMPIRKAN BERSAMA BORANG TENDER / SEBUTHARGA INI DENGAN SALINAN SIJIL PENDAFTARAN, "
            "PENYATA BANK ( 3 BULAN TERKINI ) DAN PENGALAMAN KERJA ( 2 TAHUN TERAKHIR ). KEGAGALAN MENGEMUKAKAN "
            "ITEM-ITEM TERSEBUT MENYEBABKAN DOKUMEN TENDER/SEBUTHARGA TUAN INI AKAN DITOLAK."
        ),
    ) is True

    assert compute_is_disqualifying(
        category="submission_instructions",
        mandatory_status="mandatory",
        original_text=(
            "2.3 e) Tender proposals submitted by facsimile, e-mail, telex, telegram or any other means "
            "will NOT be considered or accepted."
        ),
    ) is True

    assert compute_is_disqualifying(
        category="submission_instructions",
        mandatory_status="mandatory",
        original_text=(
            "2.3 h) Tender proposals received after the closing date and time shall be invalid and will not be considered."
        ),
    ) is True

    assert compute_is_disqualifying(
        category="other",
        mandatory_status="mandatory",
        original_text=(
            "2.2 b) Disqualification – any non-compliance by the Tenderers on any requirements stipulated "
            "in this document shall entitle BNM, at its sole discretion, to disqualify the Tenderers."
        ),
    ) is True

    assert compute_is_disqualifying(
        category="mandatory_documents",
        mandatory_status="mandatory",
        original_text=(
            "2. Salinan Sijil Pematuhan Cukai dari Lembaga Hasil Dalam Negeri (TCC) berstatus PATUH serta jelas "
            "dan boleh diimbas melalui aplikasi MyTax. Sebarang kegagalan Majlis dalam mengimbas semula dokumen "
            "ini boleh menyebabkan dokumen tuan/puan tidak layak untuk dipertimbangkan."
        ),
    ) is True

    # 2. Mandatory eligibility registrations (MOF 221002, TNB Pre-Qual, SSM) -> True
    assert compute_is_disqualifying(
        category="mof_registration",
        mandatory_status="mandatory",
        original_text="KEMENTERIAN KEWANGAN : 221002 (MEMBERSIH KAWASAN)",
        structured_condition=StructuredCondition(
            rule_type="mof_code", field="mof_codes", operator="contains", value="221002"
        ),
    ) is True

    assert compute_is_disqualifying(
        category="other",
        mandatory_status="mandatory",
        original_text="2.1 a) Malaysian registered company;",
        structured_condition=StructuredCondition(
            rule_type="status_flag", field="ssm_active", operator="==", value=True
        ),
    ) is True

    # 3. Compulsory site briefing vs PPE attire during site visit vs unscheduled self-visit
    assert compute_is_disqualifying(
        category="site_briefing",
        mandatory_status="mandatory",
        original_text=(
            "Petender yang ingin menyertai tender ini DIWAJIBKAN hadir taklimat tender dan lawatan tapak "
            "di KEDUA-DUA sesi/lokasi seperti di atas."
        ),
    ) is True

    assert compute_is_disqualifying(
        category="site_briefing",
        mandatory_status="mandatory",
        original_text="Petender dikehendaki memakai pakaian keselamatan (PPE) semasa lawatan tapak diadakan.",
    ) is False

    assert compute_is_disqualifying(
        category="site_briefing",
        mandatory_status="mandatory",
        original_text=(
            "1. The tenderer shall visit the site to ascertain for himself the nature, character and extent "
            "of the works before pricing the Bill Of Quantities. NOTE : The Contractor shall visit the site before tendering"
        ),
    ) is False

    # 4. Post-award performance bonds & insurances -> False
    assert compute_is_disqualifying(
        category="performance_bond",
        mandatory_status="mandatory",
        original_text=(
            "7. The successful tenderer shall before the commencement of the works, deposit to the Council: "
            "B. Performance Bond amounts to 2.5% of the contract sum."
        ),
    ) is False

    # 5. Conditional items ("Jika Berkaitan") -> False
    assert compute_is_disqualifying(
        category="bumiputera_status",
        mandatory_status="conditional",
        applies_to="conditional",
        original_text="1. iii. Salinan Sijil Akuan Bumiputera Dari Kementerian Kewangan (Jika Berkaitan)",
    ) is False

    # 6. Routine declaration / contract forms without rejection wording -> False
    for routine_clause in (
        "BORANG PENGISYTIHARAN PEMUNYA BENEFISIAL [Berdasarkan Akta Syarikat (pindaan) 2024 [Akta A1701]]",
        "SURAT AKUAN SYARIKAT DALAM MENANGANI JENAYAH PEMERDAGANGAN ORANG DAN BURUH PAKSA",
        "Lampiran 'E' AKTA RAHSIA RASMI 1972 (AKTA 88)",
        "4. Borang Kontrak (Am) 9/93 dan 10/93 (Wajib Disertakan)",
        "12. Senarai Kuantiti (BQ) (Wajib Disertakan dan Diisi) (Sila cetak atas kertas berwarna hijau)",
    ):
        assert compute_is_disqualifying(
            category="mandatory_documents",
            mandatory_status="mandatory",
            original_text=routine_clause,
        ) is False

    # 7. Commercial / operational / post-award terms (KPI, IP, Service Agreement, 7-day JKDM tax claim) -> False
    for commercial_clause in (
        "1.2 a) performance is assessed on a monthly basis to meet minimum Key Performance Indicator (KPI) of at least 85%.",
        "2.5 a) The successful tenderer shall enter into a service agreement with the Bank.",
        "2.8 The intellectual property rights of the services and any deliverables prepared by the Tenderer shall vest with the Bank.",
        "6.3 Kegagalan atau kelewatan syarikat untuk memaklumkan kepada Majlis mengenai status pendaftaran dengan JKDM akan menyebabkan syarikat perlu menanggung Cukai dan tidak layak menuntut apa-apa bayaran daripada Majlis.",
    ):
        assert compute_is_disqualifying(
            category="other",
            mandatory_status="mandatory",
            original_text=commercial_clause,
        ) is False


# ---------------------------------------------------------------------------
# Fix 5: Subcontractor and conditional requirements -> needs_review (never gap)
# ---------------------------------------------------------------------------


def test_mbi_e11_subcontractor_clause_produces_needs_review_not_gap() -> None:
    profile = load_company_profile(PROFILE_PATH)
    mbi_e11_clause = (
        "9.3 PENENDER PERLU MELANTIK SUB-KONTRAKTOR YANG AKAN MELAKUKAN KERJA-KERJA MEMBEKAL DAN MEMASANG, "
        "PENDAWAIAN DAN ALAT KELENGKAPAN ELEKTRIK YANG MEMPUNYAI PENGKHUSUSAN KOD BIDANG CIDB E11(KERJA AM ELEKTRIK) "
        "DAN PERLU DIKEMUKAKAN KEPADA PEGAWAI PENGUASA (P.P)"
    )

    assert infer_applies_to(None, mbi_e11_clause, "Appoint CIDB E11 electrical sub-contractor.") == "subcontractor"

    # Even if structured_condition is cidb_category=E11 and review_required=False, rules_engine must return needs_review
    req = ExtractedRequirement(
        id="REQ-027",
        original_text=mbi_e11_clause,
        language="ms",
        mandatory_status="mandatory",
        category="cidb_registration",
        applies_to="subcontractor",
        is_disqualifying=False,
        structured_condition=StructuredCondition(
            rule_type="cidb_category",
            field="cidb_categories",
            operator="contains",
            value="E11",
        ),
        explanation="Tenderer must appoint an electrical sub-contractor holding CIDB E11 specialization.",
        source_page=18,
        source_excerpt=mbi_e11_clause,
        confidence="high",
        review_required=False,
    )

    result = evaluate_requirement(req, profile)
    assert result.status == "needs_review"
    assert "subcontractor" in result.explanation.lower()


# ---------------------------------------------------------------------------
# Fix 6: Substantive page citation upgrade for checklist items
# ---------------------------------------------------------------------------


def test_checklist_citation_upgraded_to_substantive_page() -> None:
    pages_map = {
        3: "SENARAI SEMAK DOKUMEN SEBUT HARGA NO. S0175/26\n3. Surat Akuan Pembida\n6. Pemunya Benefisial",
        5: "SURAT AKUAN PEMBIDA\nBersama ini dilampirkan Surat Perwakilan Kuasa bagi saya mewakili syarikat...\n2.1 Hilang kelayakan untuk dinilai dan dilantik",
        11: "BORANG PENGISYTIHARAN PEMUNYA BENEFISIAL\nBerdasarkan Akta Syarikat (pindaan) 2024 [Akta A1701]",
    }
    raw = [
        {
            "original_text": "6. Borang Pengisytiharan Pemunya Benefisial (Wajib Disertakan & Diisi)",
            "language": "ms",
            "mandatory_status": "mandatory",
            "category": "mandatory_documents",
            "applies_to": "prime_bidder",
            "has_rejection_language": False,
            "explanation": "Complete and submit Beneficial Ownership Declaration form.",
            "source_page": 3,
            "source_excerpt": "6. Pemunya Benefisial",
            "confidence": "high",
            "review_required": True,
        }
    ]
    validated = validate_and_enrich_requirements(raw, pages_map, low_quality_pages=[])
    assert len(validated) == 1
    assert validated[0].source_page == 11
    assert "checklist page 3" in validated[0].source_excerpt.lower()
    assert "EXCERPT_NOT_VERIFIED_ON_PAGE" not in validated[0].validation_flags


# ---------------------------------------------------------------------------
# Fix 7: Missing rule targets (date_validity:tender_closing_date & status_flag aliases)
# ---------------------------------------------------------------------------


def test_missing_rule_targets_ssm_aliases_and_tender_closing_date() -> None:
    profile = load_company_profile(PROFILE_PATH)

    # 1. Malaysian registered company / ssm_registration -> matches profile.status_flags['ssm_active']
    ssm_req = ExtractedRequirement(
        id="REQ-SSM",
        original_text="2.1 a) Malaysian registered company;",
        language="en",
        mandatory_status="mandatory",
        category="other",
        applies_to="prime_bidder",
        is_disqualifying=True,
        structured_condition=StructuredCondition(
            rule_type="status_flag",
            field="is_malaysian_registered",
            operator="==",
            value=True,
        ),
        explanation="Must be a Malaysian registered company.",
        source_page=8,
        source_excerpt="Malaysian registered company",
        confidence="high",
        review_required=False,
    )
    ssm_res = evaluate_requirement(ssm_req, profile)
    assert ssm_res.status == "matched_rule_verified"
    assert ssm_res.rule_id == "RULE_STATUS_FLAG"
    assert ssm_res.company_evidence is not None
    assert ssm_res.company_evidence["document_id"] == "DOC-SSM-001"

    # 2. Unrecorded status flag (e.g. tcc_status) -> stays needs_review without inventing data
    tcc_req = ssm_req.model_copy(
        update={
            "id": "REQ-TCC",
            "structured_condition": StructuredCondition(
                rule_type="status_flag", field="tcc_status", operator="==", value=True
            ),
        }
    )
    tcc_res = evaluate_requirement(tcc_req, profile)
    assert tcc_res.status == "needs_review"

    # 3. date_validity with field='tender_closing_date' on CIDB registration -> evaluates CIDB validity
    cidb_closing_req = ExtractedRequirement(
        id="REQ-CIDB-DATE",
        original_text="Sijil CIDB masih sah sehingga tarikh tutup tender 15 Disember 2026.",
        language="ms",
        mandatory_status="mandatory",
        category="cidb_registration",
        applies_to="prime_bidder",
        is_disqualifying=True,
        structured_condition=StructuredCondition(
            rule_type="date_validity",
            field="tender_closing_date",
            operator="valid_on",
            value="2026-12-15",
        ),
        explanation="CIDB registration valid through tender closing date.",
        source_page=1,
        source_excerpt="sah sehingga tarikh tutup tender 15 Disember 2026",
        confidence="high",
        review_required=False,
    )
    cidb_date_res = evaluate_requirement(cidb_closing_req, profile)
    assert cidb_date_res.status == "matched_rule_verified"
    assert cidb_date_res.rule_id == "RULE_DATE_VALIDITY"

    # 4. date_validity with field='tender_closing_date' on submission_instructions -> needs_review with deadline explanation
    sub_deadline_req = ExtractedRequirement(
        id="REQ-SUB-DATE",
        original_text="Tarikh tutup (5 petang): 30 November 2026",
        language="ms",
        mandatory_status="mandatory",
        category="submission_instructions",
        applies_to="prime_bidder",
        is_disqualifying=True,
        structured_condition=StructuredCondition(
            rule_type="date_validity",
            field="tender_closing_date",
            operator="==",
            value="2026-11-30",
        ),
        explanation="Tender closing date is 30 November 2026.",
        source_page=1,
        source_excerpt="30 November 2026",
        confidence="high",
        review_required=False,
    )
    sub_res = evaluate_requirement(sub_deadline_req, profile)
    assert sub_res.status == "needs_review"
    assert "submission deadline" in sub_res.explanation.lower()


# ---------------------------------------------------------------------------
# Fix 9: Free-tier disk cache, checkpoint & resume, batch OCR fallback, rate limiter
# ---------------------------------------------------------------------------


def test_disk_cache_hit_makes_no_api_call_and_no_cache_flag_bypasses(tmp_path: Path) -> None:
    mock_resp = MagicMock()
    mock_resp.text = '{"requirements": []}'
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_resp
    limiter = RateLimiter(requests_per_minute=0)

    # First call: live call -> writes to cache
    stats1 = LLMCallStats(pdf_sha256="abc123sha", use_cache=True, cache_dir=tmp_path)
    out1, _ = _generate_content_pinned(
        mock_client,
        "gemini-3-flash-preview",
        "prompt",
        step_id="extract_merged_pass",
        stats=stats1,
        rate_limiter=limiter,
    )
    assert out1 == '{"requirements": []}'
    assert stats1.live_calls == 1
    assert stats1.cache_hits == 0
    assert mock_client.models.generate_content.call_count == 1

    # Second call with same key: cache hit -> 0 new API calls
    stats2 = LLMCallStats(pdf_sha256="abc123sha", use_cache=True, cache_dir=tmp_path)
    out2, _ = _generate_content_pinned(
        mock_client,
        "gemini-3-flash-preview",
        "prompt",
        step_id="extract_merged_pass",
        stats=stats2,
        rate_limiter=limiter,
    )
    assert out2 == '{"requirements": []}'
    assert stats2.live_calls == 0
    assert stats2.cache_hits == 1
    assert mock_client.models.generate_content.call_count == 1

    # Bumping prompt_version invalidates old cache entry
    stats_v_next = LLMCallStats(
        pdf_sha256="abc123sha",
        prompt_version="v99.0",
        use_cache=True,
        cache_dir=tmp_path,
    )
    _generate_content_pinned(
        mock_client,
        "gemini-3-flash-preview",
        "prompt",
        step_id="extract_merged_pass",
        stats=stats_v_next,
        rate_limiter=limiter,
    )
    assert stats_v_next.live_calls == 1
    assert stats_v_next.cache_hits == 0

    # CLI --no-cache flag parsing
    args = parse_args(["dummy.pdf", "--no-cache"])
    assert args.no_cache is True


def test_checkpoint_and_resume_on_quota_exhausted(tmp_path: Path) -> None:
    call_steps: list[str] = []

    def first_run_side_effect(*, model: str, contents, config):
        if len(call_steps) == 0:
            call_steps.append("step_1")
            resp = MagicMock()
            resp.text = '{"pages": [{"page_number": 1, "text": "Page 1 OCR text"}]}'
            return resp
        call_steps.append("step_2_fail")
        raise genai_errors.APIError(
            429,
            {"message": "RESOURCE_EXHAUSTED: GenerateRequestsPerDayPerProjectPerModel limit reached. retryDelay: 3600s"},
        )

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = first_run_side_effect
    limiter = RateLimiter(requests_per_minute=0)
    stats1 = LLMCallStats(pdf_sha256="resume_sha_001", use_cache=True, cache_dir=tmp_path)

    # Step 1 succeeds and is cached
    text1, _ = _generate_content_pinned(
        mock_client,
        "gemini-3-flash-preview",
        "ocr batch 1",
        step_id="ocr_batch_1",
        stats=stats1,
        rate_limiter=limiter,
    )
    assert "Page 1 OCR text" in text1

    # Step 2 hits daily quota (retryDelay=3600s > 120s) -> saves checkpoint with status="quota_exhausted"
    with pytest.raises(QuotaExhaustedError) as exc_info:
        _generate_content_pinned(
            mock_client,
            "gemini-3-flash-preview",
            "extract pass",
            step_id="extract_merged_pass",
            stats=stats1,
            rate_limiter=limiter,
        )

    err = exc_info.value
    assert err.status == "quota_exhausted"
    assert err.step_id == "extract_merged_pass"
    assert err.checkpoint_path is not None and err.checkpoint_path.exists()
    ckpt_data = json.loads(err.checkpoint_path.read_text(encoding="utf-8"))
    assert ckpt_data["status"] == "quota_exhausted"
    assert ckpt_data["stopped_at_step"] == "extract_merged_pass"
    assert "ocr_batch_1" in ckpt_data["completed_steps"]

    # Re-running resumes from cache: step 1 hits cache (0 API calls), step 2 makes 1 live call
    mock_client_resume = MagicMock()
    resume_resp = MagicMock()
    resume_resp.text = '{"requirements": []}'
    mock_client_resume.models.generate_content.return_value = resume_resp
    stats2 = LLMCallStats(pdf_sha256="resume_sha_001", use_cache=True, cache_dir=tmp_path)

    _generate_content_pinned(
        mock_client_resume,
        "gemini-3-flash-preview",
        "ocr batch 1",
        step_id="ocr_batch_1",
        stats=stats2,
        rate_limiter=limiter,
    )
    _generate_content_pinned(
        mock_client_resume,
        "gemini-3-flash-preview",
        "extract pass",
        step_id="extract_merged_pass",
        stats=stats2,
        rate_limiter=limiter,
    )
    assert stats2.cache_hits == 1
    assert stats2.live_calls == 1
    assert mock_client_resume.models.generate_content.call_count == 1


def test_batch_ocr_falls_back_to_single_page_when_unparseable(tmp_path: Path) -> None:
    pdf_file = tmp_path / "two_pages.pdf"
    doc = pymupdf.open()
    doc.new_page(width=200, height=200)
    doc.new_page(width=200, height=200)
    doc.save(str(pdf_file))
    doc.close()

    doc = pymupdf.open(str(pdf_file))
    p1 = doc[0]
    p2 = doc[1]

    responses = [
        MagicMock(text="UNPARSEABLE BATCH OUTPUT WITHOUT PAGE MARKERS OR JSON"),
        MagicMock(text="Single page 1 transcribed text with enough readable characters for analysis."),
        MagicMock(text="Single page 2 transcribed text with enough readable characters for analysis."),
    ]
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = responses
    stats = LLMCallStats(pdf_sha256="batch_fallback_sha", use_cache=False, cache_dir=tmp_path)
    limiter = RateLimiter(requests_per_minute=0)

    try:
        res = _ocr_batch_with_gemini_vision(
            [(1, p1), (2, p2)],
            client=mock_client,
            model_name="gemini-3-flash-preview",
            stats=stats,
            rate_limiter=limiter,
        )
    finally:
        doc.close()

    assert 1 in res and 2 in res
    assert "Single page 1" in res[1][0]
    assert "Single page 2" in res[2][0]
    assert stats.live_calls == 3


def test_rate_limiter_enforces_5_rpm_spacing() -> None:
    clock = [100.0]
    slept: list[float] = []

    def fake_clock() -> float:
        return clock[0]

    def fake_sleep(seconds: float) -> None:
        slept.append(seconds)
        clock[0] += seconds

    limiter = RateLimiter(requests_per_minute=5.0, sleep_fn=fake_sleep, clock_fn=fake_clock)
    assert limiter.wait_for_slot() == 0.0
    clock[0] += 4.0  # 4s elapsed (< 12s min_interval)
    waited = limiter.wait_for_slot()
    assert pytest.approx(waited, rel=1e-3) == 8.0
    assert pytest.approx(slept[0], rel=1e-3) == 8.0


def test_fix8_frontend_shrink0_removed_and_report_page_col_widened() -> None:
    page_tsx = (ROOT_DIR / "frontend" / "app" / "page.tsx").read_text(encoding="utf-8")
    assert 'className="flex flex-wrap items-center gap-2 shrink-0"' not in page_tsx
    assert 'className="flex flex-wrap items-center gap-2"' in page_tsx

    report_py = (ROOT_DIR / "report.py").read_text(encoding="utf-8")
    assert "[16 * mm, 13 * mm, 13 * mm, 26 * mm, 78 * mm, 24 * mm]" in report_py

