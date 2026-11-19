"""Pydantic schemas and deterministic validation for TenderMate Phase 1 extraction."""

from __future__ import annotations

import json
import re
from typing import Any, Iterable, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator

RuleType = Literal[
    "cidb_grade",
    "cidb_category",
    "cidb_validity",
    "mof_active",
    "mof_code",
    "mof_validity",
    "bumiputera_status",
    "status_flag",
    "date_validity",
    "paid_up_capital",
    "non_structured",
]

LanguageCode = Literal["ms", "en", "mixed"]
MandatoryStatus = Literal["mandatory", "conditional", "informational"]
RequirementCategory = Literal[
    "mof_registration",
    "cidb_registration",
    "bumiputera_status",
    "site_briefing",
    "performance_bond",
    "mandatory_documents",
    "financial_technical_experience",
    "submission_instructions",
    "other",
]
ConfidenceLevel = Literal["high", "medium", "low"]
ExtractionPass = Literal["initial", "coverage", "system_safeguard"]
PageExtractionMethod = Literal[
    "text",
    "ocr_tesseract",
    "ocr_gemini_vision",
    "ocr_unavailable",
]


class StructuredCondition(BaseModel):
    """Normalized structured representation of a single checkable tender condition."""

    rule_type: RuleType
    field: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[Union[str, int, float, bool, list[str]]] = None
    reference_date: Optional[str] = Field(
        default=None,
        description="ISO date YYYY-MM-DD stated by tender, e.g. tender closing date.",
    )


class ExtractedRequirement(BaseModel):
    """Single atomic tender requirement extracted with verbatim wording and citation."""

    id: str = Field(default="REQ-000")
    original_text: str
    language: LanguageCode
    mandatory_status: MandatoryStatus
    category: RequirementCategory
    is_disqualifying: bool = Field(
        description="Tier B flag: eligibility, performance bond, compulsory briefing, or mandatory form/declaration."
    )
    structured_condition: Optional[StructuredCondition] = None
    explanation: str
    source_page: Optional[int] = None
    source_excerpt: str
    confidence: ConfidenceLevel
    review_required: bool
    extraction_pass: ExtractionPass = "initial"
    validation_flags: list[str] = Field(default_factory=list)

    @field_validator("original_text", "explanation")
    @classmethod
    def _must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Field must be a non-empty string.")
        return value.strip()

    @field_validator("source_excerpt")
    @classmethod
    def _strip_excerpt(cls, value: str) -> str:
        return value.strip()


class PageExtractionInfo(BaseModel):
    """Per-page text extraction and OCR metadata."""

    page_number: int
    char_count: int
    image_count: int
    extraction_method: PageExtractionMethod
    low_quality: bool
    quality_notes: Optional[str] = None


class ExtractionSummary(BaseModel):
    """Aggregate counts across extracted atomic requirements and pages."""

    total_requirements: int
    tier_a_mandatory_count: int
    tier_b_disqualifying_count: int
    informational_count: int
    review_required_count: int
    initial_pass_count: int
    coverage_pass_added_count: int
    uncited_or_flagged_count: int
    low_quality_page_count: int


class ExtractionOutput(BaseModel):
    """Top-level requirements.json schema."""

    tender_file: str
    extracted_at: str
    model_used: str
    page_count: int
    low_quality_pages: list[int]
    pages_info: list[PageExtractionInfo]
    summary: ExtractionSummary
    requirements: list[ExtractedRequirement]


def parse_llm_requirements_json(raw_json_text: str) -> list[dict[str, Any]]:
    """Parse raw JSON text returned by an LLM into a list of raw requirement dicts.

    Rejects malformed JSON or unexpected top-level structures with ValueError.
    """
    if not raw_json_text or not raw_json_text.strip():
        raise ValueError("Empty LLM response; expected JSON array or object.")

    cleaned = raw_json_text.strip()
    # Strip markdown code fences if a model emits them despite JSON mode.
    fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Malformed JSON from extraction model: {exc}") from exc

    if isinstance(parsed, dict) and "requirements" in parsed:
        items = parsed["requirements"]
    elif isinstance(parsed, list):
        items = parsed
    else:
        raise ValueError(
            "Expected JSON array or object containing a 'requirements' list."
        )

    if not isinstance(items, list):
        raise ValueError("'requirements' field must be a JSON list.")

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"Requirement entry at index {idx} must be a JSON object.")

    return items


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def _significant_tokens(text: str) -> set[str]:
    normalized = _normalize_text(text)
    raw_tokens = re.findall(r"[a-z0-9]{3,}", normalized)
    return set(raw_tokens)


def _excerpt_matches_page(excerpt: str, page_text: str) -> bool:
    norm_excerpt = _normalize_text(excerpt)
    norm_page = _normalize_text(page_text)
    if not norm_excerpt or not norm_page:
        return False

    if norm_excerpt in norm_page:
        return True

    excerpt_tokens = _significant_tokens(norm_excerpt)
    if not excerpt_tokens:
        # Short numeric/code excerpt fallback (e.g. "G4", "B04")
        compact_tokens = set(re.findall(r"[a-z0-9]+", norm_excerpt))
        if not compact_tokens:
            return False
        page_compact = set(re.findall(r"[a-z0-9]+", norm_page))
        return len(compact_tokens & page_compact) / len(compact_tokens) >= 0.6

    page_tokens = _significant_tokens(norm_page)
    overlap_ratio = len(excerpt_tokens & page_tokens) / len(excerpt_tokens)
    return overlap_ratio >= 0.6


def _condition_signature(cond: Optional[StructuredCondition]) -> tuple[Any, ...]:
    if cond is None:
        return ("none",)
    val = cond.value
    if isinstance(val, list):
        norm_val: Any = tuple(sorted(_normalize_text(str(v)) for v in val))
    elif isinstance(val, str):
        norm_val = _normalize_text(val)
    else:
        norm_val = val
    return (
        cond.rule_type,
        _normalize_text(cond.field or ""),
        _normalize_text(cond.operator or ""),
        norm_val,
        _normalize_text(cond.reference_date or ""),
    )


def _jaccard_similarity(a: str, b: str) -> float:
    tokens_a = _significant_tokens(a)
    tokens_b = _significant_tokens(b)
    if not tokens_a and not tokens_b:
        return 1.0 if _normalize_text(a) == _normalize_text(b) else 0.0
    if not tokens_a or not tokens_b:
        return 0.0
    return len(tokens_a & tokens_b) / len(tokens_a | tokens_b)


def _is_near_duplicate(candidate: ExtractedRequirement, existing: ExtractedRequirement) -> bool:
    if candidate.source_page != existing.source_page:
        return False
    if candidate.category != existing.category:
        return False

    cand_sig = _condition_signature(candidate.structured_condition)
    exist_sig = _condition_signature(existing.structured_condition)
    if cand_sig != exist_sig:
        return False

    # Same page, category, and structured condition signature -> check excerpt or original text overlap
    excerpt_sim = _jaccard_similarity(candidate.source_excerpt, existing.source_excerpt)
    text_sim = _jaccard_similarity(candidate.original_text, existing.original_text)
    if max(excerpt_sim, text_sim) >= 0.6:
        return True

    # For non_structured items, also deduplicate if original_text is near-identical
    if cand_sig == ("non_structured", "", "", None, "") or cand_sig == ("none",):
        return text_sim >= 0.8

    return False


def validate_and_enrich_requirements(
    raw_requirements: Iterable[Union[dict[str, Any], ExtractedRequirement]],
    pages_text_map: dict[int, str],
    low_quality_pages: Iterable[int],
) -> list[ExtractedRequirement]:
    """Validate extracted requirements, verify page citations, deduplicate, and add safeguards."""
    low_quality_set = set(low_quality_pages)
    validated: list[ExtractedRequirement] = []

    for idx, raw_item in enumerate(raw_requirements):
        if isinstance(raw_item, ExtractedRequirement):
            req = raw_item.model_copy(deep=True)
        elif isinstance(raw_item, dict):
            item_copy = dict(raw_item)
            if not item_copy.get("id"):
                item_copy["id"] = f"TMP-{idx + 1:03d}"
            if item_copy.get("source_excerpt") is None:
                item_copy["source_excerpt"] = ""
            req = ExtractedRequirement.model_validate(item_copy)
        else:
            raise ValueError(f"Unsupported requirement type at index {idx}: {type(raw_item)}")

        flags: list[str] = list(dict.fromkeys(req.validation_flags))

        # 1. Citation presence check
        has_valid_page = req.source_page is not None and req.source_page in pages_text_map
        has_excerpt = bool(req.source_excerpt and req.source_excerpt.strip())

        if not has_valid_page or not has_excerpt:
            flags.append("UNCITED_ITEM")
            req.review_required = True
        else:
            assert req.source_page is not None
            page_text = pages_text_map[req.source_page]
            if not _excerpt_matches_page(req.source_excerpt, page_text):
                flags.append("EXCERPT_NOT_VERIFIED_ON_PAGE")
                req.review_required = True
                # Check adjacent pages to give reviewers a helpful hint
                for adj in (req.source_page - 1, req.source_page + 1):
                    if adj in pages_text_map and _excerpt_matches_page(req.source_excerpt, pages_text_map[adj]):
                        flags.append(f"EXCERPT_MATCHED_ADJACENT_PAGE_{adj}")
                        break

        # 2. Low-quality source page check
        if req.source_page is not None and req.source_page in low_quality_set:
            flags.append("LOW_QUALITY_SOURCE_PAGE")
            req.review_required = True

        # 3. Conservative human review enforcement
        if (
            req.structured_condition is None
            or req.structured_condition.rule_type == "non_structured"
            or req.mandatory_status == "conditional"
            or req.confidence != "high"
        ):
            req.review_required = True

        req.validation_flags = list(dict.fromkeys(flags))

        # 4. Deduplicate near-identical atomic requirements
        duplicate_found = False
        for existing in validated:
            if _is_near_duplicate(req, existing):
                duplicate_found = True
                break
        if not duplicate_found:
            validated.append(req)

    # 5. System safeguard for unreadable / low-quality pages (<50 chars post-OCR)
    for page_num in sorted(low_quality_set):
        page_text = pages_text_map.get(page_num, "").strip()
        if len(page_text) < 50:
            safeguard = ExtractedRequirement(
                id="TMP-SAFEGUARD",
                original_text=(
                    f"[UNREADABLE / SCANNED PAGE {page_num}] Text extraction yielded "
                    f"fewer than 50 characters ({len(page_text)} chars) even after OCR fallback; "
                    f"manual human inspection of page {page_num} is required."
                ),
                language="en",
                mandatory_status="conditional",
                category="other",
                is_disqualifying=False,
                structured_condition=StructuredCondition(
                    rule_type="non_structured",
                    field="manual_page_review",
                    operator="requires_inspection",
                    value=f"page_{page_num}",
                ),
                explanation=(
                    f"Page {page_num} could not be reliably read after OCR fallback. "
                    "Per PRD 5.5 and 9.4, unreadable pages are never marked cleared and require manual review."
                ),
                source_page=page_num,
                source_excerpt=page_text if page_text else "[No readable text extracted]",
                confidence="low",
                review_required=True,
                extraction_pass="system_safeguard",
                validation_flags=["LOW_QUALITY_SOURCE_PAGE", "UNREADABLE_PAGE_SAFEGUARD"],
            )
            validated.append(safeguard)

    # 6. Assign clean sequential IDs
    for seq_idx, req in enumerate(validated, start=1):
        req.id = f"REQ-{seq_idx:03d}"

    return validated


def build_extraction_summary(
    requirements: list[ExtractedRequirement],
    pages_info: list[PageExtractionInfo],
) -> ExtractionSummary:
    """Compute summary statistics for an ExtractionOutput."""
    tier_a = sum(1 for r in requirements if r.mandatory_status in ("mandatory", "conditional") and r.extraction_pass != "system_safeguard")
    tier_b = sum(1 for r in requirements if r.is_disqualifying)
    informational = sum(1 for r in requirements if r.mandatory_status == "informational")
    review_req = sum(1 for r in requirements if r.review_required)
    initial_cnt = sum(1 for r in requirements if r.extraction_pass == "initial")
    coverage_cnt = sum(1 for r in requirements if r.extraction_pass == "coverage")
    flagged_cnt = sum(1 for r in requirements if len(r.validation_flags) > 0)
    low_q_cnt = sum(1 for p in pages_info if p.low_quality)

    return ExtractionSummary(
        total_requirements=len(requirements),
        tier_a_mandatory_count=tier_a,
        tier_b_disqualifying_count=tier_b,
        informational_count=informational,
        review_required_count=review_req,
        initial_pass_count=initial_cnt,
        coverage_pass_added_count=coverage_cnt,
        uncited_or_flagged_count=flagged_cnt,
        low_quality_page_count=low_q_cnt,
    )
