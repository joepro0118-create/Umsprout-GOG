"""Phase 2 unit & integration tests for TenderMate deterministic rules engine."""

from __future__ import annotations

from pathlib import Path

from rules_engine import (
    check_cidb_category,
    check_cidb_grade,
    check_date_validity,
    check_mof_code,
    check_paid_up_capital,
    check_status_flag,
    evaluate_requirement,
    evaluate_tender,
    load_company_profile,
    load_extraction_output,
    resolve_needs_review_with_evidence,
)
from schema import ExtractedRequirement, StructuredCondition

ROOT_DIR = Path(__file__).resolve().parent.parent
PROFILE_PATH = ROOT_DIR / "data" / "company_profile.json"
REQUIREMENTS_PATH = ROOT_DIR / "requirements.json"

SAMPLE_CIDB_EVIDENCE = {
    "document_id": "DOC-CIDB-001",
    "document_type": "cidb_certificate",
    "filename": "CIDB_PPK_G3_Aman_2024_2027.pdf",
    "user_confirmed": True,
}
SAMPLE_MOF_EVIDENCE = {
    "document_id": "DOC-MOF-001",
    "document_type": "mof_certificate",
    "filename": "MOF_Certificate_Aman_2025_2028.pdf",
    "user_confirmed": True,
}
SAMPLE_BUMI_EVIDENCE = {
    "document_id": "DOC-BUMI-001",
    "document_type": "bumiputera_certificate",
    "filename": "MOF_Bumiputera_Aman_2025_2028.pdf",
    "user_confirmed": True,
}


# ---------------------------------------------------------------------------
# 1. CIDB Grade Threshold Tests (including G3-vs-G4 gap)
# ---------------------------------------------------------------------------


def test_cidb_grade_match() -> None:
    res = check_cidb_grade("G4", "G4", ">=", evidence=SAMPLE_CIDB_EVIDENCE, user_confirmed=True)
    assert res["status"] == "matched_rule_verified"
    assert res["rule_id"] == "RULE_CIDB_GRADE_THRESHOLD"
    assert res["comparison"]["passed"] is True
    assert res["company_evidence"] == SAMPLE_CIDB_EVIDENCE
    assert res["missing_evidence_marker"] is None

    res_higher = check_cidb_grade("G6", "G4", ">=", evidence=SAMPLE_CIDB_EVIDENCE, user_confirmed=True)
    assert res_higher["status"] == "matched_rule_verified"


def test_cidb_grade_g3_vs_g4_gap() -> None:
    res = check_cidb_grade("G3", "G4", ">=", evidence=SAMPLE_CIDB_EVIDENCE, user_confirmed=True)
    assert res["status"] == "gap"
    assert res["rule_id"] == "RULE_CIDB_GRADE_THRESHOLD"
    assert res["comparison"]["company_rank"] == 3
    assert res["comparison"]["required_rank"] == 4
    assert res["comparison"]["passed"] is False
    assert res["company_evidence"] == SAMPLE_CIDB_EVIDENCE
    assert res["missing_evidence_marker"] is None


def test_cidb_grade_missing_evidence_gap() -> None:
    res = check_cidb_grade("G5", "G4", ">=", evidence=None, user_confirmed=True)
    assert res["status"] == "gap"
    assert res["missing_evidence_marker"] is not None
    assert res["missing_evidence_marker"]["missing"] is True


def test_cidb_grade_unconfirmed_needs_review() -> None:
    res = check_cidb_grade("G5", "G4", ">=", evidence=SAMPLE_CIDB_EVIDENCE, user_confirmed=False)
    assert res["status"] == "needs_review"


# ---------------------------------------------------------------------------
# 2. CIDB Category Membership Tests
# ---------------------------------------------------------------------------


def test_cidb_category_match_gap_and_missing_evidence() -> None:
    match_res = check_cidb_category(["B04", "M15"], "b04", evidence=SAMPLE_CIDB_EVIDENCE, user_confirmed=True)
    assert match_res["status"] == "matched_rule_verified"
    assert match_res["rule_id"] == "RULE_CIDB_CATEGORY_MEMBERSHIP"

    gap_res = check_cidb_category(["B04", "M15"], "CE36", evidence=SAMPLE_CIDB_EVIDENCE, user_confirmed=True)
    assert gap_res["status"] == "gap"
    assert gap_res["comparison"]["missing"] == ["CE36"]

    missing_ev = check_cidb_category(["B04"], "B04", evidence=None, user_confirmed=True)
    assert missing_ev["status"] == "gap"
    assert missing_ev["missing_evidence_marker"]["missing"] is True


# ---------------------------------------------------------------------------
# 3. MOF Code Membership Tests
# ---------------------------------------------------------------------------


def test_mof_code_match_gap_and_missing_evidence() -> None:
    match_res = check_mof_code(["220401", "221001"], "220401", evidence=SAMPLE_MOF_EVIDENCE, user_confirmed=True)
    assert match_res["status"] == "matched_rule_verified"
    assert match_res["rule_id"] == "RULE_MOF_CODE_MEMBERSHIP"

    gap_res = check_mof_code(["220401"], "221001", evidence=SAMPLE_MOF_EVIDENCE, user_confirmed=True)
    assert gap_res["status"] == "gap"
    assert gap_res["comparison"]["missing"] == ["221001"]

    missing_ev = check_mof_code(["220401"], "220401", evidence=None, user_confirmed=True)
    assert missing_ev["status"] == "gap"
    assert missing_ev["missing_evidence_marker"]["missing"] is True


# ---------------------------------------------------------------------------
# 4. Status Flag Tests
# ---------------------------------------------------------------------------


def test_status_flag_match_gap_and_missing_evidence() -> None:
    match_res = check_status_flag(
        "bumiputera_status", True, True, evidence=SAMPLE_BUMI_EVIDENCE, user_confirmed=True
    )
    assert match_res["status"] == "matched_rule_verified"
    assert match_res["rule_id"] == "RULE_STATUS_FLAG"

    gap_res = check_status_flag(
        "bumiputera_status", False, True, evidence=SAMPLE_BUMI_EVIDENCE, user_confirmed=True
    )
    assert gap_res["status"] == "gap"
    assert gap_res["comparison"]["passed"] is False

    missing_ev = check_status_flag("bumiputera_status", True, True, evidence=None, user_confirmed=True)
    assert missing_ev["status"] == "gap"
    assert missing_ev["missing_evidence_marker"]["missing"] is True


# ---------------------------------------------------------------------------
# 5. Date Validity Tests
# ---------------------------------------------------------------------------


def test_date_validity_match_expired_missing_evidence_and_no_ref_date() -> None:
    match_res = check_date_validity(
        credential_name="CIDB",
        valid_from="2024-06-01",
        valid_until="2027-05-31",
        reference_date="2026-12-15",
        evidence=SAMPLE_CIDB_EVIDENCE,
        user_confirmed=True,
    )
    assert match_res["status"] == "matched_rule_verified"
    assert match_res["rule_id"] == "RULE_DATE_VALIDITY"

    expired_res = check_date_validity(
        credential_name="CIDB",
        valid_from="2023-01-01",
        valid_until="2026-11-01",
        reference_date="2026-12-15",
        evidence=SAMPLE_CIDB_EVIDENCE,
        user_confirmed=True,
    )
    assert expired_res["status"] == "gap"
    assert expired_res["comparison"]["passed"] is False

    missing_ev = check_date_validity(
        credential_name="CIDB",
        valid_until="2027-05-31",
        reference_date="2026-12-15",
        evidence=None,
        user_confirmed=True,
    )
    assert missing_ev["status"] == "gap"
    assert missing_ev["missing_evidence_marker"]["missing"] is True

    no_ref = check_date_validity(
        credential_name="CIDB",
        valid_until="2027-05-31",
        reference_date=None,
        evidence=SAMPLE_CIDB_EVIDENCE,
        user_confirmed=True,
    )
    assert no_ref["status"] == "needs_review"


# ---------------------------------------------------------------------------
# 5b. Paid-up Capital Numeric Threshold Tests
# ---------------------------------------------------------------------------

SAMPLE_PUC_EVIDENCE = {
    "document_id": "DOC-PUC-001",
    "document_type": "paid_up_capital_statement",
    "filename": "SSM_Section78_PaidUpCapital_Aman_2026.pdf",
    "user_confirmed": True,
}


def test_paid_up_capital_match_gap_missing_evidence_and_unconfirmed() -> None:
    match_res = check_paid_up_capital(250000, 150000, evidence=SAMPLE_PUC_EVIDENCE)
    assert match_res["status"] == "matched_rule_verified"
    assert match_res["rule_id"] == "RULE_PAID_UP_CAPITAL_THRESHOLD"
    assert match_res["comparison"]["passed"] is True

    exact_res = check_paid_up_capital(150000, "150,000", evidence=SAMPLE_PUC_EVIDENCE)
    assert exact_res["status"] == "matched_rule_verified"

    gap_res = check_paid_up_capital(100000, 150000, evidence=SAMPLE_PUC_EVIDENCE)
    assert gap_res["status"] == "gap"
    assert gap_res["comparison"]["passed"] is False

    missing_ev = check_paid_up_capital(250000, 150000, evidence=None)
    assert missing_ev["status"] == "gap"
    assert missing_ev["missing_evidence_marker"]["missing"] is True

    unconfirmed = check_paid_up_capital(250000, 150000, evidence=SAMPLE_PUC_EVIDENCE, user_confirmed=False)
    assert unconfirmed["status"] == "needs_review"

    bad_amount = check_paid_up_capital(250000, "RM satu ratus ribu", evidence=SAMPLE_PUC_EVIDENCE)
    assert bad_amount["status"] == "needs_review"


def test_paid_up_capital_or_net_worth_alternative() -> None:
    # Paid-up capital short, but net worth meets threshold -> match via net worth
    nw_match = check_paid_up_capital(
        100000, 150000, accepts_net_worth=True, company_net_worth=400000, evidence=SAMPLE_PUC_EVIDENCE
    )
    assert nw_match["status"] == "matched_rule_verified"

    # Paid-up capital short and net worth unknown -> cannot call it a Gap
    nw_unknown = check_paid_up_capital(
        100000, 150000, accepts_net_worth=True, company_net_worth=None, evidence=SAMPLE_PUC_EVIDENCE
    )
    assert nw_unknown["status"] == "needs_review"

    # Both known and short -> Gap
    both_short = check_paid_up_capital(
        100000, 150000, accepts_net_worth=True, company_net_worth=120000, evidence=SAMPLE_PUC_EVIDENCE
    )
    assert both_short["status"] == "gap"


# ---------------------------------------------------------------------------
# 6. User-Evidenced Resolution Guardrail (PRD 5.11 & 5.13)
# ---------------------------------------------------------------------------


def test_needs_review_resolution_requires_evidence_and_cannot_override_gap() -> None:
    profile = load_company_profile(PROFILE_PATH)
    briefing_req = ExtractedRequirement(
        id="REQ-BRIEF",
        original_text="Taklimat Tender & Lawatan Tapak DIWAJIBKAN pada 25 November 2026.",
        language="ms",
        mandatory_status="mandatory",
        category="site_briefing",
        is_disqualifying=True,
        structured_condition=StructuredCondition(
            rule_type="non_structured",
            field="site_briefing_attendance",
            operator="requires_evidence",
            value="attendance_slip",
        ),
        explanation="Compulsory site briefing attendance.",
        source_page=2,
        source_excerpt="Taklimat Tender & Lawatan Tapak DIWAJIBKAN pada 25 November 2026.",
        confidence="high",
        review_required=True,
    )
    res = evaluate_requirement(briefing_req, profile)
    assert res.status == "needs_review"

    # Marking satisfied WITHOUT attaching evidence must NOT change status
    no_ev = resolve_needs_review_with_evidence(
        res,
        evidence_document_id="",
        evidence_filename="",
        attested_by="Ahmad Farhan",
        note="Attended briefing",
    )
    assert no_ev.status == "needs_review"
    assert no_ev.user_resolution is None

    # Marking satisfied WITH attached evidence becomes matched_user_evidenced
    with_ev = resolve_needs_review_with_evidence(
        res,
        evidence_document_id="DOC-BRIEF-001",
        evidence_filename="Site_Briefing_Slip_25Nov2026.pdf",
        attested_by="Ahmad Farhan",
        note="Signed JKR attendance slip attached.",
    )
    assert with_ev.status == "matched_user_evidenced"
    assert with_ev.user_resolution is not None
    assert with_ev.user_resolution.evidence_filename == "Site_Briefing_Slip_25Nov2026.pdf"

    # Deterministic G3-vs-G4 Gap cannot be overridden via user-evidenced resolution
    grade_req = ExtractedRequirement(
        id="REQ-GRADE",
        original_text="CIDB Gred G4 atau ke atas.",
        language="ms",
        mandatory_status="mandatory",
        category="cidb_registration",
        is_disqualifying=True,
        structured_condition=StructuredCondition(
            rule_type="cidb_grade", field="cidb_grade", operator=">=", value="G4"
        ),
        explanation="CIDB G4 required.",
        source_page=1,
        source_excerpt="CIDB Gred G4 atau ke atas.",
        confidence="high",
        review_required=False,
    )
    gap_res = evaluate_requirement(grade_req, profile)
    assert gap_res.status == "gap"
    attempted_override = resolve_needs_review_with_evidence(
        gap_res,
        evidence_document_id="DOC-FAKE",
        evidence_filename="override.pdf",
        attested_by="Ahmad Farhan",
    )
    assert attempted_override.status == "gap"


# ---------------------------------------------------------------------------
# 7. End-to-End Integration with Seeded Company Profile & Phase 1 Output
# ---------------------------------------------------------------------------


def test_end_to_end_evaluation_on_sample_requirements_and_seed_profile() -> None:
    profile = load_company_profile(PROFILE_PATH)
    extraction = load_extraction_output(REQUIREMENTS_PATH)
    assessment = evaluate_tender(extraction, profile)

    assert assessment.company_id == "COMP-001"
    assert assessment.summary.total_requirements == len(extraction.requirements)
    assert assessment.summary.gap == 1  # G3 vs G4 gap on REQ-001
    assert assessment.summary.disqualifying_gaps == 1
    assert assessment.summary.matched_rule_verified == 8  # includes paid-up capital
    assert assessment.summary.needs_review == 7

    by_id = {r.requirement_id: r for r in assessment.results}

    puc = next(r for r in assessment.results if r.rule_id == "RULE_PAID_UP_CAPITAL_THRESHOLD")
    assert puc.status == "matched_rule_verified"
    assert puc.company_evidence["document_id"] == "DOC-PUC-001"

    # Verify G3-vs-G4 gap + full audit trail on REQ-001
    req1 = by_id["REQ-001"]
    assert req1.status == "gap"
    assert req1.rule_id == "RULE_CIDB_GRADE_THRESHOLD"
    assert req1.inputs["company_cidb_grade"] == "G3"
    assert req1.inputs["required_cidb_grade"] == "G4"
    assert req1.tender_condition["source_page"] == 1
    assert "CIDB Gred G4" in req1.tender_condition["source_excerpt"]
    assert req1.company_evidence is not None
    assert req1.company_evidence["document_id"] == "DOC-CIDB-001"

    # Verify matched_rule_verified items have complete audit trail
    for res in assessment.results:
        if res.status in ("matched_rule_verified", "gap"):
            assert res.rule_id is not None
            assert res.inputs
            assert res.comparison
            assert res.tender_condition["source_page"] is not None
            assert res.tender_condition["source_excerpt"]
            assert res.company_evidence is not None or res.missing_evidence_marker is not None
