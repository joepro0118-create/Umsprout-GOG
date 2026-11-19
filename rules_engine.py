"""Phase 2: Deterministic eligibility rules engine for TenderMate.

All structured pass/fail decisions are computed purely in deterministic Python code.
Statuses follow PRD v1.2 Sections 5.11 and 8.8:
- matched_rule_verified
- matched_user_evidenced
- gap
- needs_review
- not_applicable
"""

from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field

from schema import ExtractedRequirement, ExtractionOutput

ComplianceStatus = Literal[
    "matched_rule_verified",
    "matched_user_evidenced",
    "gap",
    "needs_review",
    "not_applicable",
]

CIDB_GRADE_ORDER: dict[str, int] = {
    "G1": 1,
    "G2": 2,
    "G3": 3,
    "G4": 4,
    "G5": 5,
    "G6": 6,
    "G7": 7,
}


# ---------------------------------------------------------------------------
# Company Profile & Compliance Result Schemas
# ---------------------------------------------------------------------------


class CompanyDocument(BaseModel):
    id: str
    document_type: str
    title: str
    filename: str
    storage_path: str
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    user_confirmed: bool = False
    notes: Optional[str] = None


class CIDBRecord(BaseModel):
    active: bool = False
    registration_number: Optional[str] = None
    grade: Optional[str] = None
    categories: list[str] = Field(default_factory=list)
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    evidence_document_id: Optional[str] = None
    user_confirmed: bool = False


class MOFRecord(BaseModel):
    active: bool = False
    registration_number: Optional[str] = None
    codes: list[str] = Field(default_factory=list)
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    evidence_document_id: Optional[str] = None
    user_confirmed: bool = False


class BumiputeraRecord(BaseModel):
    status: Optional[bool] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    evidence_document_id: Optional[str] = None
    user_confirmed: bool = False


class StatusFlagRecord(BaseModel):
    value: Optional[bool] = None
    evidence_document_id: Optional[str] = None
    user_confirmed: bool = False


class FinancialRecord(BaseModel):
    paid_up_capital_rm: Optional[float] = None
    net_worth_rm: Optional[float] = None
    as_of: Optional[str] = None
    evidence_document_id: Optional[str] = None
    user_confirmed: bool = False


class CompanyProfile(BaseModel):
    company_id: str
    name: str
    registration_number: str
    confirmed_at: Optional[str] = None
    contact: dict[str, Any] = Field(default_factory=dict)
    cidb: Optional[CIDBRecord] = None
    mof: Optional[MOFRecord] = None
    bumiputera: Optional[BumiputeraRecord] = None
    status_flags: dict[str, StatusFlagRecord] = Field(default_factory=dict)
    financials: Optional[FinancialRecord] = None
    documents: list[CompanyDocument] = Field(default_factory=list)

    def get_document(self, doc_id: Optional[str]) -> Optional[CompanyDocument]:
        if not doc_id:
            return None
        for doc in self.documents:
            if doc.id == doc_id:
                return doc
        return None


class UserResolution(BaseModel):
    evidence_document_id: str
    evidence_filename: str
    attested_by: str
    attested_at: str
    note: str = ""


class ComplianceResult(BaseModel):
    requirement_id: str
    status: ComplianceStatus
    is_disqualifying: bool
    rule_id: Optional[str] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    comparison: dict[str, Any] = Field(default_factory=dict)
    tender_condition: dict[str, Any] = Field(default_factory=dict)
    company_evidence: Optional[dict[str, Any]] = None
    missing_evidence_marker: Optional[dict[str, Any]] = None
    user_resolution: Optional[UserResolution] = None
    explanation: str


class ComplianceSummary(BaseModel):
    total_requirements: int
    matched_rule_verified: int
    matched_user_evidenced: int
    gap: int
    needs_review: int
    not_applicable: int
    disqualifying_gaps: int


class ComplianceAssessment(BaseModel):
    tender_file: str
    company_id: str
    company_name: str
    evaluated_at: str
    summary: ComplianceSummary
    results: list[ComplianceResult]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalize_code(value: str) -> str:
    return value.strip().upper()


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value or not isinstance(value, str):
        return None
    cleaned = value.strip()
    try:
        return date.fromisoformat(cleaned[:10])
    except ValueError:
        return None


def _evidence_to_dict(doc: Optional[CompanyDocument]) -> Optional[dict[str, Any]]:
    if doc is None:
        return None
    return {
        "document_id": doc.id,
        "document_type": doc.document_type,
        "title": doc.title,
        "filename": doc.filename,
        "storage_path": doc.storage_path,
        "valid_from": doc.valid_from,
        "valid_until": doc.valid_until,
        "user_confirmed": doc.user_confirmed,
    }


def _missing_marker(expected_type: str, reason: str) -> dict[str, Any]:
    return {
        "missing": True,
        "expected_document_type": expected_type,
        "reason": reason,
    }


def _build_tender_condition(req: ExtractedRequirement) -> dict[str, Any]:
    return {
        "original_text": req.original_text,
        "language": req.language,
        "category": req.category,
        "mandatory_status": req.mandatory_status,
        "source_page": req.source_page,
        "source_excerpt": req.source_excerpt,
        "structured_condition": (
            req.structured_condition.model_dump() if req.structured_condition else None
        ),
    }


# ---------------------------------------------------------------------------
# Plain Deterministic Rule Functions
# ---------------------------------------------------------------------------


def check_cidb_grade(
    company_grade: Optional[str],
    required_grade: Union[str, list[str]],
    operator: str = ">=",
    evidence: Optional[dict[str, Any]] = None,
    user_confirmed: bool = True,
) -> dict[str, Any]:
    """Deterministic rule: compare company CIDB grade against tender threshold."""
    rule_id = "RULE_CIDB_GRADE_THRESHOLD"
    op = (operator or ">=").strip().lower()
    inputs = {
        "company_cidb_grade": company_grade,
        "required_cidb_grade": required_grade,
        "operator": op,
        "user_confirmed": user_confirmed,
    }

    if not user_confirmed:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": "Company CIDB grade is not user-confirmed."},
            "company_evidence": evidence,
            "missing_evidence_marker": (
                None if evidence else _missing_marker("cidb_certificate", "CIDB record not confirmed or missing evidence.")
            ),
            "explanation": "Company CIDB grade must be confirmed by the user before deterministic matching.",
        }

    if not company_grade or not evidence:
        reason = (
            "Company CIDB grade is missing."
            if not company_grade
            else "Supporting CIDB certificate evidence is missing."
        )
        return {
            "status": "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"passed": False, "reason": reason},
            "company_evidence": evidence,
            "missing_evidence_marker": _missing_marker("cidb_certificate", reason),
            "explanation": f"Gap: {reason}",
        }

    norm_company = _normalize_code(company_grade)
    if norm_company not in CIDB_GRADE_ORDER:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": f"Unrecognized company CIDB grade '{company_grade}'."},
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": f"Needs Review: unrecognized company CIDB grade '{company_grade}'.",
        }

    company_rank = CIDB_GRADE_ORDER[norm_company]

    if op == "in" or isinstance(required_grade, list):
        allowed = [_normalize_code(str(g)) for g in (required_grade if isinstance(required_grade, list) else [required_grade])]
        if any(g not in CIDB_GRADE_ORDER for g in allowed):
            return {
                "status": "needs_review",
                "rule_id": rule_id,
                "inputs": inputs,
                "comparison": {"evaluated": False, "reason": f"Unrecognized required CIDB grades {allowed}."},
                "company_evidence": evidence,
                "missing_evidence_marker": None,
                "explanation": f"Needs Review: unrecognized required CIDB grade list {allowed}.",
            }
        passed = norm_company in allowed
        expr = f"{norm_company} in {allowed} -> {passed}"
        return {
            "status": "matched_rule_verified" if passed else "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {
                "operator": "in",
                "company_grade": norm_company,
                "required_grades": allowed,
                "passed": passed,
                "expression": expr,
            },
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": (
                f"Company CIDB grade {norm_company} is within allowed tender grades {allowed}."
                if passed
                else f"Gap: Company CIDB grade {norm_company} is not in allowed tender grades {allowed}."
            ),
        }

    norm_req = _normalize_code(str(required_grade))
    if norm_req not in CIDB_GRADE_ORDER:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": f"Unrecognized required CIDB grade '{required_grade}'."},
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": f"Needs Review: unrecognized tender CIDB grade '{required_grade}'.",
        }

    req_rank = CIDB_GRADE_ORDER[norm_req]
    if op == ">=":
        passed = company_rank >= req_rank
    elif op == "==":
        passed = company_rank == req_rank
    elif op == "<=":
        passed = company_rank <= req_rank
    else:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": f"Unsupported operator '{op}'."},
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": f"Needs Review: unsupported CIDB grade operator '{op}'.",
        }

    expr = f"{norm_company} (rank {company_rank}) {op} {norm_req} (rank {req_rank}) -> {passed}"
    return {
        "status": "matched_rule_verified" if passed else "gap",
        "rule_id": rule_id,
        "inputs": inputs,
        "comparison": {
            "operator": op,
            "company_grade": norm_company,
            "company_rank": company_rank,
            "required_grade": norm_req,
            "required_rank": req_rank,
            "passed": passed,
            "expression": expr,
        },
        "company_evidence": evidence,
        "missing_evidence_marker": None,
        "explanation": (
            f"Company CIDB grade {norm_company} satisfies tender requirement {op} {norm_req}."
            if passed
            else f"Gap: Company CIDB grade {norm_company} does not satisfy tender requirement {op} {norm_req}."
        ),
    }


def check_cidb_category(
    company_categories: Optional[list[str]],
    required_category: Union[str, list[str]],
    evidence: Optional[dict[str, Any]] = None,
    user_confirmed: bool = True,
) -> dict[str, Any]:
    """Deterministic rule: check whether company holds required CIDB category/specialisation."""
    rule_id = "RULE_CIDB_CATEGORY_MEMBERSHIP"
    req_list = (
        [_normalize_code(str(c)) for c in required_category]
        if isinstance(required_category, list)
        else [_normalize_code(str(required_category))]
    )
    comp_list = [_normalize_code(c) for c in (company_categories or [])]
    inputs = {
        "company_cidb_categories": comp_list,
        "required_cidb_categories": req_list,
        "user_confirmed": user_confirmed,
    }

    if not user_confirmed:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": "Company CIDB categories are not user-confirmed."},
            "company_evidence": evidence,
            "missing_evidence_marker": (
                None if evidence else _missing_marker("cidb_certificate", "CIDB record not confirmed or missing evidence.")
            ),
            "explanation": "Company CIDB categories must be confirmed by the user before deterministic matching.",
        }

    if not evidence:
        reason = "Supporting CIDB certificate evidence is missing."
        return {
            "status": "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"passed": False, "reason": reason},
            "company_evidence": None,
            "missing_evidence_marker": _missing_marker("cidb_certificate", reason),
            "explanation": f"Gap: {reason}",
        }

    missing_codes = [c for c in req_list if c not in comp_list]
    passed = len(missing_codes) == 0
    expr = f"{req_list} subset_of {comp_list} -> {passed}"
    return {
        "status": "matched_rule_verified" if passed else "gap",
        "rule_id": rule_id,
        "inputs": inputs,
        "comparison": {
            "operator": "contains",
            "required": req_list,
            "actual": comp_list,
            "missing": missing_codes,
            "passed": passed,
            "expression": expr,
        },
        "company_evidence": evidence,
        "missing_evidence_marker": None,
        "explanation": (
            f"Company holds required CIDB category {', '.join(req_list)}."
            if passed
            else f"Gap: Company is missing required CIDB category {', '.join(missing_codes)}."
        ),
    }


def check_mof_code(
    company_mof_codes: Optional[list[str]],
    required_code: Union[str, list[str]],
    evidence: Optional[dict[str, Any]] = None,
    user_confirmed: bool = True,
) -> dict[str, Any]:
    """Deterministic rule: check whether company holds required MOF field code."""
    rule_id = "RULE_MOF_CODE_MEMBERSHIP"
    req_list = (
        [_normalize_code(str(c)) for c in required_code]
        if isinstance(required_code, list)
        else [_normalize_code(str(required_code))]
    )
    comp_list = [_normalize_code(c) for c in (company_mof_codes or [])]
    inputs = {
        "company_mof_codes": comp_list,
        "required_mof_codes": req_list,
        "user_confirmed": user_confirmed,
    }

    if not user_confirmed:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": "Company MOF codes are not user-confirmed."},
            "company_evidence": evidence,
            "missing_evidence_marker": (
                None if evidence else _missing_marker("mof_certificate", "MOF record not confirmed or missing evidence.")
            ),
            "explanation": "Company MOF codes must be confirmed by the user before deterministic matching.",
        }

    if not evidence:
        reason = "Supporting MOF certificate evidence is missing."
        return {
            "status": "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"passed": False, "reason": reason},
            "company_evidence": None,
            "missing_evidence_marker": _missing_marker("mof_certificate", reason),
            "explanation": f"Gap: {reason}",
        }

    missing_codes = [c for c in req_list if c not in comp_list]
    passed = len(missing_codes) == 0
    expr = f"{req_list} subset_of {comp_list} -> {passed}"
    return {
        "status": "matched_rule_verified" if passed else "gap",
        "rule_id": rule_id,
        "inputs": inputs,
        "comparison": {
            "operator": "contains",
            "required": req_list,
            "actual": comp_list,
            "missing": missing_codes,
            "passed": passed,
            "expression": expr,
        },
        "company_evidence": evidence,
        "missing_evidence_marker": None,
        "explanation": (
            f"Company holds required MOF code {', '.join(req_list)}."
            if passed
            else f"Gap: Company is missing required MOF code {', '.join(missing_codes)}."
        ),
    }


def check_status_flag(
    flag_name: str,
    company_value: Optional[bool],
    expected_value: bool = True,
    evidence: Optional[dict[str, Any]] = None,
    user_confirmed: bool = True,
    expected_document_type: str = "supporting_certificate",
) -> dict[str, Any]:
    """Deterministic rule: check boolean registration/status flag (MOF active, Bumiputera, SSM, etc.)."""
    rule_id = "RULE_STATUS_FLAG"
    inputs = {
        "flag_name": flag_name,
        "company_value": company_value,
        "expected_value": expected_value,
        "user_confirmed": user_confirmed,
    }

    if not user_confirmed:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": f"Status flag '{flag_name}' is not user-confirmed."},
            "company_evidence": evidence,
            "missing_evidence_marker": (
                None if evidence else _missing_marker(expected_document_type, f"Unconfirmed or missing evidence for '{flag_name}'.")
            ),
            "explanation": f"Company status '{flag_name}' must be confirmed by the user before deterministic matching.",
        }

    if company_value is None or not evidence:
        reason = (
            f"Company value for '{flag_name}' is missing."
            if company_value is None
            else f"Supporting evidence for '{flag_name}' is missing."
        )
        return {
            "status": "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"passed": False, "reason": reason},
            "company_evidence": evidence,
            "missing_evidence_marker": _missing_marker(expected_document_type, reason),
            "explanation": f"Gap: {reason}",
        }

    passed = bool(company_value) == bool(expected_value)
    expr = f"{flag_name}: {company_value} == {expected_value} -> {passed}"
    return {
        "status": "matched_rule_verified" if passed else "gap",
        "rule_id": rule_id,
        "inputs": inputs,
        "comparison": {
            "operator": "==",
            "flag_name": flag_name,
            "actual": bool(company_value),
            "expected": bool(expected_value),
            "passed": passed,
            "expression": expr,
        },
        "company_evidence": evidence,
        "missing_evidence_marker": None,
        "explanation": (
            f"Company status '{flag_name}' ({company_value}) satisfies tender requirement ({expected_value})."
            if passed
            else f"Gap: Company status '{flag_name}' ({company_value}) does not satisfy tender requirement ({expected_value})."
        ),
    }


def check_date_validity(
    credential_name: str,
    valid_until: Optional[str],
    reference_date: Optional[str],
    valid_from: Optional[str] = None,
    evidence: Optional[dict[str, Any]] = None,
    user_confirmed: bool = True,
    expected_document_type: str = "registration_certificate",
) -> dict[str, Any]:
    """Deterministic rule: check point-in-time certificate validity against a tender-stated date."""
    rule_id = "RULE_DATE_VALIDITY"
    inputs = {
        "credential": credential_name,
        "company_valid_from": valid_from,
        "company_valid_until": valid_until,
        "tender_reference_date": reference_date,
        "user_confirmed": user_confirmed,
    }

    parsed_ref = _parse_iso_date(reference_date)
    if parsed_ref is None:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": "Tender did not specify a valid ISO reference date."},
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": f"Needs Review: no parseable tender reference date for {credential_name} validity check.",
        }

    if not user_confirmed:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": f"Company {credential_name} validity dates are not user-confirmed."},
            "company_evidence": evidence,
            "missing_evidence_marker": (
                None if evidence else _missing_marker(expected_document_type, f"Unconfirmed or missing evidence for {credential_name}.")
            ),
            "explanation": f"Company {credential_name} validity must be confirmed by the user before deterministic matching.",
        }

    parsed_until = _parse_iso_date(valid_until)
    if parsed_until is None or not evidence:
        reason = (
            f"Company {credential_name} expiry date is missing or invalid."
            if parsed_until is None
            else f"Supporting {credential_name} certificate evidence is missing."
        )
        return {
            "status": "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"passed": False, "reason": reason},
            "company_evidence": evidence,
            "missing_evidence_marker": _missing_marker(expected_document_type, reason),
            "explanation": f"Gap: {reason}",
        }

    parsed_from = _parse_iso_date(valid_from)
    starts_ok = parsed_from is None or parsed_from <= parsed_ref
    ends_ok = parsed_until >= parsed_ref
    passed = starts_ok and ends_ok

    if parsed_from is not None:
        expr = f"{parsed_from.isoformat()} <= {parsed_ref.isoformat()} <= {parsed_until.isoformat()} -> {passed}"
    else:
        expr = f"{parsed_until.isoformat()} >= {parsed_ref.isoformat()} -> {passed}"

    if passed:
        explanation = (
            f"Company {credential_name} registration (valid until {parsed_until.isoformat()}) "
            f"is valid on tender date {parsed_ref.isoformat()}."
        )
    elif not ends_ok:
        explanation = (
            f"Gap: Company {credential_name} registration expires on {parsed_until.isoformat()}, "
            f"before tender reference date {parsed_ref.isoformat()}."
        )
    else:
        explanation = (
            f"Gap: Company {credential_name} registration starts on {parsed_from.isoformat()}, "
            f"after tender reference date {parsed_ref.isoformat()}."
        )

    return {
        "status": "matched_rule_verified" if passed else "gap",
        "rule_id": rule_id,
        "inputs": inputs,
        "comparison": {
            "operator": "valid_on",
            "valid_from": parsed_from.isoformat() if parsed_from else None,
            "valid_until": parsed_until.isoformat(),
            "reference_date": parsed_ref.isoformat(),
            "passed": passed,
            "expression": expr,
        },
        "company_evidence": evidence,
        "missing_evidence_marker": None,
        "explanation": explanation,
    }


# ---------------------------------------------------------------------------
# Requirement Evaluation & User-Evidenced Resolution
# ---------------------------------------------------------------------------


def check_paid_up_capital(
    company_paid_up_capital: Optional[float],
    required_amount: Any,
    accepts_net_worth: bool = False,
    company_net_worth: Optional[float] = None,
    evidence: Optional[dict[str, Any]] = None,
    user_confirmed: bool = True,
) -> dict[str, Any]:
    """Deterministic numeric-threshold rule: company paid-up capital (RM) >= tender minimum.

    If the tender accepts paid-up capital OR net worth, either value meeting the threshold passes.
    A shortfall is only a Gap when every accepted measure is known; otherwise Needs Review.
    """
    rule_id = "RULE_PAID_UP_CAPITAL_THRESHOLD"
    inputs = {
        "company_paid_up_capital_rm": company_paid_up_capital,
        "company_net_worth_rm": company_net_worth,
        "required_minimum_rm": required_amount,
        "accepts_net_worth": accepts_net_worth,
        "user_confirmed": user_confirmed,
    }

    try:
        required = float(str(required_amount).replace(",", ""))
    except (TypeError, ValueError):
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": f"Tender amount '{required_amount}' is not numeric."},
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": "Needs Review: tender paid-up capital amount could not be parsed as a number.",
        }

    if not user_confirmed:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"evaluated": False, "reason": "Company financial figures are not user-confirmed."},
            "company_evidence": evidence,
            "missing_evidence_marker": (
                None if evidence else _missing_marker("paid_up_capital_statement", "Financial record not confirmed or missing evidence.")
            ),
            "explanation": "Company paid-up capital must be confirmed by the user before deterministic matching.",
        }

    if company_paid_up_capital is None or not evidence:
        reason = (
            "Company paid-up capital is missing."
            if company_paid_up_capital is None
            else "Supporting paid-up capital evidence is missing."
        )
        return {
            "status": "gap",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": {"passed": False, "reason": reason},
            "company_evidence": evidence,
            "missing_evidence_marker": _missing_marker("paid_up_capital_statement", reason),
            "explanation": f"Gap: {reason}",
        }

    puc_ok = company_paid_up_capital >= required
    nw_ok = accepts_net_worth and company_net_worth is not None and company_net_worth >= required
    passed = puc_ok or nw_ok
    expr = f"paid_up_capital RM {company_paid_up_capital:,.2f} >= RM {required:,.2f} -> {puc_ok}"
    if accepts_net_worth:
        nw_str = f"RM {company_net_worth:,.2f}" if company_net_worth is not None else "unknown"
        expr += f"; OR net_worth {nw_str} >= RM {required:,.2f} -> {nw_ok}"

    comparison = {
        "operator": ">=",
        "company_paid_up_capital_rm": company_paid_up_capital,
        "company_net_worth_rm": company_net_worth,
        "required_minimum_rm": required,
        "passed": passed,
        "expression": expr,
    }

    if passed:
        measure = "paid-up capital" if puc_ok else "net worth"
        value = company_paid_up_capital if puc_ok else company_net_worth
        return {
            "status": "matched_rule_verified",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": comparison,
            "company_evidence": evidence,
            "missing_evidence_marker": None,
            "explanation": f"Company {measure} RM {value:,.0f} meets the tender minimum of RM {required:,.0f}.",
        }

    if accepts_net_worth and company_net_worth is None:
        return {
            "status": "needs_review",
            "rule_id": rule_id,
            "inputs": inputs,
            "comparison": comparison,
            "company_evidence": evidence,
            "missing_evidence_marker": _missing_marker(
                "net_worth_statement", "Paid-up capital is below threshold and net worth is not on record."
            ),
            "explanation": (
                f"Needs Review: paid-up capital RM {company_paid_up_capital:,.0f} is below RM {required:,.0f}, "
                "but the tender also accepts net worth, which is not recorded."
            ),
        }

    return {
        "status": "gap",
        "rule_id": rule_id,
        "inputs": inputs,
        "comparison": comparison,
        "company_evidence": evidence,
        "missing_evidence_marker": None,
        "explanation": f"Gap: company does not meet the tender minimum of RM {required:,.0f}.",
    }


def evaluate_requirement(
    req: ExtractedRequirement,
    profile: CompanyProfile,
) -> ComplianceResult:
    """Evaluate one atomic requirement against a company profile deterministically."""
    tender_cond = _build_tender_condition(req)

    # Conservative gate: uncertain, conditional, safeguard, or non-structured items stay Needs Review.
    if (
        req.review_required
        or req.mandatory_status in ("conditional", "informational")
        or req.extraction_pass == "system_safeguard"
        or req.structured_condition is None
        or req.structured_condition.rule_type == "non_structured"
    ):
        reason = (
            "Unreadable/low-quality source page requires manual inspection."
            if req.extraction_pass == "system_safeguard"
            else "Non-structured, conditional, or review-flagged requirement requires human review and evidence attachment."
        )
        return ComplianceResult(
            requirement_id=req.id,
            status="needs_review",
            is_disqualifying=req.is_disqualifying,
            rule_id=None,
            inputs={},
            comparison={"evaluated": False, "reason": reason},
            tender_condition=tender_cond,
            company_evidence=None,
            missing_evidence_marker=None,
            explanation=reason,
        )

    sc = req.structured_condition
    rule_type = sc.rule_type

    if rule_type == "cidb_grade":
        cidb = profile.cidb
        evidence = _evidence_to_dict(profile.get_document(cidb.evidence_document_id)) if cidb else None
        res = check_cidb_grade(
            company_grade=cidb.grade if cidb else None,
            required_grade=sc.value if sc.value is not None else "",
            operator=sc.operator or ">=",
            evidence=evidence,
            user_confirmed=cidb.user_confirmed if cidb else True,
        )
    elif rule_type == "cidb_category":
        cidb = profile.cidb
        evidence = _evidence_to_dict(profile.get_document(cidb.evidence_document_id)) if cidb else None
        res = check_cidb_category(
            company_categories=cidb.categories if cidb else None,
            required_category=sc.value if sc.value is not None else "",
            evidence=evidence,
            user_confirmed=cidb.user_confirmed if cidb else True,
        )
    elif rule_type == "cidb_validity":
        cidb = profile.cidb
        evidence = _evidence_to_dict(profile.get_document(cidb.evidence_document_id)) if cidb else None
        ref_date = sc.reference_date or (str(sc.value) if sc.value else None)
        res = check_date_validity(
            credential_name="CIDB",
            valid_until=cidb.valid_until if cidb else None,
            reference_date=ref_date,
            valid_from=cidb.valid_from if cidb else None,
            evidence=evidence,
            user_confirmed=cidb.user_confirmed if cidb else True,
            expected_document_type="cidb_certificate",
        )
    elif rule_type == "mof_active":
        mof = profile.mof
        evidence = _evidence_to_dict(profile.get_document(mof.evidence_document_id)) if mof else None
        res = check_status_flag(
            flag_name="mof_active",
            company_value=mof.active if mof else None,
            expected_value=bool(sc.value) if sc.value is not None else True,
            evidence=evidence,
            user_confirmed=mof.user_confirmed if mof else True,
            expected_document_type="mof_certificate",
        )
    elif rule_type == "mof_code":
        mof = profile.mof
        evidence = _evidence_to_dict(profile.get_document(mof.evidence_document_id)) if mof else None
        res = check_mof_code(
            company_mof_codes=mof.codes if mof else None,
            required_code=sc.value if sc.value is not None else "",
            evidence=evidence,
            user_confirmed=mof.user_confirmed if mof else True,
        )
    elif rule_type == "mof_validity":
        mof = profile.mof
        evidence = _evidence_to_dict(profile.get_document(mof.evidence_document_id)) if mof else None
        ref_date = sc.reference_date or (str(sc.value) if sc.value else None)
        res = check_date_validity(
            credential_name="MOF",
            valid_until=mof.valid_until if mof else None,
            reference_date=ref_date,
            valid_from=mof.valid_from if mof else None,
            evidence=evidence,
            user_confirmed=mof.user_confirmed if mof else True,
            expected_document_type="mof_certificate",
        )
    elif rule_type == "bumiputera_status":
        bumi = profile.bumiputera
        evidence = _evidence_to_dict(profile.get_document(bumi.evidence_document_id)) if bumi else None
        res = check_status_flag(
            flag_name="bumiputera_status",
            company_value=bumi.status if bumi else None,
            expected_value=bool(sc.value) if sc.value is not None else True,
            evidence=evidence,
            user_confirmed=bumi.user_confirmed if bumi else True,
            expected_document_type="bumiputera_certificate",
        )
    elif rule_type == "status_flag":
        flag_name = (sc.field or "").strip()
        if flag_name in ("mof_active", "mof_registration") and profile.mof is not None:
            evidence = _evidence_to_dict(profile.get_document(profile.mof.evidence_document_id))
            res = check_status_flag(
                flag_name=flag_name,
                company_value=profile.mof.active,
                expected_value=bool(sc.value) if sc.value is not None else True,
                evidence=evidence,
                user_confirmed=profile.mof.user_confirmed,
                expected_document_type="mof_certificate",
            )
        elif flag_name in ("cidb_active", "cidb_registration") and profile.cidb is not None:
            evidence = _evidence_to_dict(profile.get_document(profile.cidb.evidence_document_id))
            res = check_status_flag(
                flag_name=flag_name,
                company_value=profile.cidb.active,
                expected_value=bool(sc.value) if sc.value is not None else True,
                evidence=evidence,
                user_confirmed=profile.cidb.user_confirmed,
                expected_document_type="cidb_certificate",
            )
        elif flag_name == "bumiputera_status" and profile.bumiputera is not None:
            evidence = _evidence_to_dict(profile.get_document(profile.bumiputera.evidence_document_id))
            res = check_status_flag(
                flag_name=flag_name,
                company_value=profile.bumiputera.status,
                expected_value=bool(sc.value) if sc.value is not None else True,
                evidence=evidence,
                user_confirmed=profile.bumiputera.user_confirmed,
                expected_document_type="bumiputera_certificate",
            )
        elif flag_name in profile.status_flags:
            flag_rec = profile.status_flags[flag_name]
            evidence = _evidence_to_dict(profile.get_document(flag_rec.evidence_document_id))
            res = check_status_flag(
                flag_name=flag_name,
                company_value=flag_rec.value,
                expected_value=bool(sc.value) if sc.value is not None else True,
                evidence=evidence,
                user_confirmed=flag_rec.user_confirmed,
                expected_document_type=f"{flag_name}_evidence",
            )
        else:
            res = {
                "status": "needs_review",
                "rule_id": "RULE_STATUS_FLAG",
                "inputs": {"flag_name": flag_name, "expected_value": sc.value},
                "comparison": {"evaluated": False, "reason": f"Unsupported or unmapped status flag '{flag_name}'."},
                "company_evidence": None,
                "missing_evidence_marker": None,
                "explanation": f"Needs Review: no supported deterministic mapping for status flag '{flag_name}'.",
            }
    elif rule_type == "date_validity":
        field_lower = (sc.field or "").lower()
        ref_date = sc.reference_date or (str(sc.value) if sc.value else None)
        if "cidb" in field_lower:
            cidb = profile.cidb
            evidence = _evidence_to_dict(profile.get_document(cidb.evidence_document_id)) if cidb else None
            res = check_date_validity(
                credential_name="CIDB",
                valid_until=cidb.valid_until if cidb else None,
                reference_date=ref_date,
                valid_from=cidb.valid_from if cidb else None,
                evidence=evidence,
                user_confirmed=cidb.user_confirmed if cidb else True,
                expected_document_type="cidb_certificate",
            )
        elif "mof" in field_lower:
            mof = profile.mof
            evidence = _evidence_to_dict(profile.get_document(mof.evidence_document_id)) if mof else None
            res = check_date_validity(
                credential_name="MOF",
                valid_until=mof.valid_until if mof else None,
                reference_date=ref_date,
                valid_from=mof.valid_from if mof else None,
                evidence=evidence,
                user_confirmed=mof.user_confirmed if mof else True,
                expected_document_type="mof_certificate",
            )
        elif "bumi" in field_lower:
            bumi = profile.bumiputera
            evidence = _evidence_to_dict(profile.get_document(bumi.evidence_document_id)) if bumi else None
            res = check_date_validity(
                credential_name="Bumiputera",
                valid_until=bumi.valid_until if bumi else None,
                reference_date=ref_date,
                valid_from=bumi.valid_from if bumi else None,
                evidence=evidence,
                user_confirmed=bumi.user_confirmed if bumi else True,
                expected_document_type="bumiputera_certificate",
            )
        else:
            res = {
                "status": "needs_review",
                "rule_id": "RULE_DATE_VALIDITY",
                "inputs": {"field": sc.field, "reference_date": ref_date},
                "comparison": {"evaluated": False, "reason": f"Unsupported date_validity target '{sc.field}'."},
                "company_evidence": None,
                "missing_evidence_marker": None,
                "explanation": f"Needs Review: no supported credential date mapping for '{sc.field}'.",
            }
    elif rule_type == "paid_up_capital":
        fin = profile.financials
        evidence = _evidence_to_dict(profile.get_document(fin.evidence_document_id)) if fin else None
        res = check_paid_up_capital(
            company_paid_up_capital=fin.paid_up_capital_rm if fin else None,
            required_amount=sc.value,
            accepts_net_worth="net_worth" in (sc.field or "").lower(),
            company_net_worth=fin.net_worth_rm if fin else None,
            evidence=evidence,
            user_confirmed=fin.user_confirmed if fin else True,
        )
    else:
        res = {
            "status": "needs_review",
            "rule_id": None,
            "inputs": {},
            "comparison": {"evaluated": False, "reason": f"Unsupported rule_type '{rule_type}'."},
            "company_evidence": None,
            "missing_evidence_marker": None,
            "explanation": f"Needs Review: unsupported rule_type '{rule_type}'.",
        }

    return ComplianceResult(
        requirement_id=req.id,
        status=res["status"],
        is_disqualifying=req.is_disqualifying,
        rule_id=res["rule_id"],
        inputs=res["inputs"],
        comparison=res["comparison"],
        tender_condition=tender_cond,
        company_evidence=res["company_evidence"],
        missing_evidence_marker=res["missing_evidence_marker"],
        explanation=res["explanation"],
    )


def summarize_results(results: list[ComplianceResult]) -> ComplianceSummary:
    """Count results per status (recomputed after user-evidenced resolutions are applied)."""
    return ComplianceSummary(
        total_requirements=len(results),
        matched_rule_verified=sum(1 for r in results if r.status == "matched_rule_verified"),
        matched_user_evidenced=sum(1 for r in results if r.status == "matched_user_evidenced"),
        gap=sum(1 for r in results if r.status == "gap"),
        needs_review=sum(1 for r in results if r.status == "needs_review"),
        not_applicable=sum(1 for r in results if r.status == "not_applicable"),
        disqualifying_gaps=sum(1 for r in results if r.status == "gap" and r.is_disqualifying),
    )


def evaluate_tender(
    extraction: ExtractionOutput,
    profile: CompanyProfile,
) -> ComplianceAssessment:
    """Evaluate all extracted atomic requirements for a tender against a company profile."""
    results = [evaluate_requirement(req, profile) for req in extraction.requirements]
    return ComplianceAssessment(
        tender_file=extraction.tender_file,
        company_id=profile.company_id,
        company_name=profile.name,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        summary=summarize_results(results),
        results=results,
    )


def resolve_needs_review_with_evidence(
    result: ComplianceResult,
    evidence_document_id: Optional[str],
    evidence_filename: Optional[str],
    attested_by: str,
    note: str = "",
    attested_at: Optional[str] = None,
) -> ComplianceResult:
    """Resolve a Needs Review item ONLY when supporting evidence is attached (PRD 5.11 & 5.13).

    - Genuine rule-verified matches and deterministic gaps cannot be overridden by this path.
    - Marking satisfied without attaching evidence leaves status unchanged as needs_review.
    """
    updated = result.model_copy(deep=True)
    if updated.status != "needs_review":
        return updated

    has_doc_id = bool(evidence_document_id and evidence_document_id.strip())
    has_filename = bool(evidence_filename and evidence_filename.strip())
    has_attester = bool(attested_by and attested_by.strip())
    if not (has_doc_id and has_filename and has_attester):
        # PRD 5.11 / 5.13: acknowledgment without attached evidence (or without who) must NOT change status.
        return updated

    updated.status = "matched_user_evidenced"
    updated.user_resolution = UserResolution(
        evidence_document_id=evidence_document_id.strip(),
        evidence_filename=evidence_filename.strip(),
        attested_by=attested_by.strip(),
        attested_at=attested_at or datetime.now(timezone.utc).isoformat(),
        note=note.strip(),
    )
    updated.explanation = (
        f"User-evidenced match attested by {updated.user_resolution.attested_by} "
        f"with attached file '{updated.user_resolution.evidence_filename}'."
    )
    return updated


def load_company_profile(path: Path) -> CompanyProfile:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return CompanyProfile.model_validate(raw)


def load_extraction_output(path: Path) -> ExtractionOutput:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return ExtractionOutput.model_validate(raw)


def print_assessment_summary(assessment: ComplianceAssessment) -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    s = assessment.summary
    print("=" * 78)
    print("TenderMate Phase 2 Deterministic Compliance Assessment")
    print("=" * 78)
    print(f"Tender  : {assessment.tender_file}")
    print(f"Company : {assessment.company_name} ({assessment.company_id})")
    print("-" * 78)
    print(f"Total Requirements     : {s.total_requirements}")
    print(f"  Matched (rule-verif) : {s.matched_rule_verified}")
    print(f"  Matched (user-evid)  : {s.matched_user_evidenced}")
    print(f"  Gap                  : {s.gap} (Tier B disqualifying gaps: {s.disqualifying_gaps})")
    print(f"  Needs Review         : {s.needs_review}")
    print(f"  Not Applicable       : {s.not_applicable}")
    print("=" * 78)

    for res in assessment.results:
        page = res.tender_condition.get("source_page")
        tier = "[TIER-B]" if res.is_disqualifying else "[STD]"
        rule_str = res.rule_id or "MANUAL_REVIEW"
        ev_str = (
            res.company_evidence["filename"]
            if res.company_evidence
            else (
                f"MISSING ({res.missing_evidence_marker['reason']})"
                if res.missing_evidence_marker
                else "N/A"
            )
        )
        print(f"{res.requirement_id} | Page {page} | {res.status.upper():<22} | {tier} | {rule_str}")
        if res.comparison.get("expression"):
            print(f"  Comparison : {res.comparison['expression']}")
        print(f"  Evidence   : {ev_str}")
        print(f"  Detail     : {res.explanation}")
    print("=" * 78)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="TenderMate Phase 2 CLI: Evaluate requirements.json against company_profile.json."
    )
    parser.add_argument("requirements_json", type=Path, help="Path to requirements.json from Phase 1.")
    parser.add_argument(
        "company_profile_json",
        type=Path,
        default=Path("data/company_profile.json"),
        nargs="?",
        help="Path to company_profile.json (default: data/company_profile.json).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("compliance_results.json"),
        help="Output JSON file path (default: compliance_results.json).",
    )
    args = parser.parse_args(argv)

    extraction = load_extraction_output(args.requirements_json)
    profile = load_company_profile(args.company_profile_json)
    assessment = evaluate_tender(extraction, profile)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(assessment.model_dump(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print_assessment_summary(assessment)
    print(f"\nSaved compliance assessment JSON to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
