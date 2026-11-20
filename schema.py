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
    "text+ocr",
    "ocr_tesseract",
    "ocr_gemini_vision",
    "ocr_unavailable",
]
AppliesTo = Literal["prime_bidder", "subcontractor", "conditional", "unknown"]


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
    applies_to: AppliesTo = Field(
        default="prime_bidder",
        description="Entity or scope the requirement applies to: prime_bidder | subcontractor | conditional | unknown.",
    )
    has_rejection_language: Optional[bool] = Field(
        default=None,
        description="True when the clause explicitly states rejection, disqualification, invalidity, or non-consideration.",
    )
    rejection_quote: Optional[str] = Field(
        default=None,
        description="Verbatim rejection/disqualification phrase from the clause, if present.",
    )
    is_disqualifying: bool = Field(
        default=False,
        description="Deterministic Tier B flag computed from rejection language, mandatory eligibility registration, or compulsory briefing.",
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


# ---------------------------------------------------------------------------
# Deterministic Applies-To & Tier B (is_disqualifying) Classification
# ---------------------------------------------------------------------------

_SUBCONTRACTOR_RE = re.compile(
    r"\b(?:melantik\s+)?sub\s*[- ]?kontraktor\b|\bsub\s*[- ]?contractor\b",
    re.IGNORECASE,
)

_CONDITIONAL_MARKER_RE = re.compile(
    r"\bjika\s+berkaitan\b|\bsekiranya\s+berkaitan\b|\bif\s+applicable\b|\bwhere\s+applicable\b"
    r"|\byang\s+ingin\s+menuntut\s+sst\b|\bif\s+tenderer(?:\(s\))?\s+decide\s+not\s+to\s+participate\b"
    r"|\bfor\s+all\s+works\s+exceeding\s+rm\s*500,000\b",
    re.IGNORECASE,
)

# Explicit tender rejection, disqualification, invalidity, or participation-gate phrases (BM & EN).
# Excludes post-award tax reimbursement caveats like "tidak layak menuntut apa-apa bayaran".
_REJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bditolak\s+dengan\s+serta\s*[- ]?merta\b", re.IGNORECASE),
    re.compile(r"\bakan\s+ditolak\b", re.IGNORECASE),
    re.compile(r"\bpenyertaan\s+tender\s+ini\s+ditolak\b", re.IGNORECASE),
    re.compile(r"\btender\s+ditolak\b", re.IGNORECASE),
    re.compile(r"\btidak\s+akan\s+dipertimbangkan\b", re.IGNORECASE),
    re.compile(r"\btidak\s+layak\s+untuk\s+dipertimbangkan\b", re.IGNORECASE),
    re.compile(r"\bhilang\s+kelayakan(?:\s+untuk\s+dinilai)?\b", re.IGNORECASE),
    re.compile(r"\btidak\s+dibenarkan\s+untuk\s+menyertai\b", re.IGNORECASE),
    re.compile(r"\btidak\s+boleh\s+membeli\s+tender\b", re.IGNORECASE),
    re.compile(r"\bhanya\s+boleh\s+disertai\s+oleh\b", re.IGNORECASE),
    re.compile(r"\bbagi\s+melayakkan\s+penyertaan\s+tender\b", re.IGNORECASE),
    re.compile(r"\blulus\s+pra\s*[- ]?kelayakan\b", re.IGNORECASE),
    re.compile(r"\bsyarat\s+pra\s*[- ]?kelayakan\b", re.IGNORECASE),
    re.compile(r"\bwill\s+not\s+be\s+considered\b", re.IGNORECASE),
    re.compile(r"\bnot\s+be\s+considered\s+or\s+accepted\b", re.IGNORECASE),
    re.compile(r"\bshall\s+not\s+be\s+accepted\b", re.IGNORECASE),
    re.compile(r"\bshall\s+be\s+invalid\b", re.IGNORECASE),
    re.compile(r"\bdisqualif(?:y|ied|ication)\b", re.IGNORECASE),
    re.compile(r"\bresult\s+in\s+unsuccessful\s+bid\b", re.IGNORECASE),
    re.compile(r"\bpremature\s+opening\s*\(\s*and\s+therefore\s+rejection\s*\)", re.IGNORECASE),
    re.compile(r"\band\s+therefore\s+rejection\b", re.IGNORECASE),
    re.compile(r"\bin\s+order\s+to\s+qualify\s+for\s+selection\b", re.IGNORECASE),
]

# Non-disqualifying operational, post-award, commercial, or routine form patterns (when no rejection language exists).
_POST_AWARD_OR_COMMERCIAL_EXCLUSION_RE = re.compile(
    r"\bperformance\s+bond\b|\bbon\s+pelaksanaan\b"
    r"|\binsurance\s+of\s+works\b|\bpublic\s+liability\s+insurance\b|\bcontractor'?s\s+all\s+risk\b"
    r"|\bworkm[ae]n'?s\s+compensation\b|\bsocso\b|\bperkeso\b"
    r"|\bkey\s+performance\s+indicator\b|\bminimum\s+kpi\b"
    r"|\bintellectual\s+property\s+rights\b"
    r"|\benter\s+into\s+a\s+service\s+agreement\b|\buntil\s+the\s+agreement\s+is\s+signed\b"
    r"|\be-payment\s+account\b|\bdeclare\s+(?:its\s+)?current\s+bank\s+account\s+particulars\b"
    r"|\bcreating\s+the\s+e-payment\b|\beffects\s+payment\s+via\s+electronic\s+means\b"
    r"|\bsubmit\s+its\s+current\s+bank\s+account'?s\s+statement\s+for\s+purposes\s+of\s+creating\s+the\s+e-payment\b"
    r"|\bfi\s+perkhidmatan\b"
    r"|\btidak\s+layak\s+menuntut\s+apa-apa\s+bayaran\b|\bdalam\s+tempoh\s+7\s+hari\s+dari\s+tarikh\s+surat\s+setuju\s+terima\b"
    r"|\bclarification\s+purposes,\s+after\s+the\s+closing\s+date\b"
    r"|\bmemakai\s+pakaian\s+keselamatan\b|\balat\s+perlindungan\s+diri\b"
    r"|\bsyarat\s+keselamatan\s+dari\s+jabatan\s+keselamatan\s+dan\s+kesihatan\s+pekerja\b|\bdosh\b"
    r"|\bpermit\s+pelupusan\s+sisa\s+pokok\b|\bresit\s+pembuangan\s+sisa\b"
    r"|\btempoh\s+sah\s+laku\s+sebutharga\s+ini\s+ialah\s+selama\s+90\s+hari\b"
    r"|\bwaktu\s+kerja\s+adalah\s+antara\s+jam\s+8\.00\s+pagi\b"
    r"|\bliquid\s+paper\b|\bsatu\s+jilid\b|\bpengesahan\s+oleh\s+syarikat\b"
    r"|\bharga\s+indikatif\s+jabatan\b|\bno\s+unauthorized\s+alteration\b|\bno\s+fluctuation\s+in\s+price\b"
    r"|\bdivulge\s+any\s+information\s+to\s+any\s+third\s+party\b|\bconditions\s+of\s+confidentiality\b"
    r"|\binclusive\s+fixed\s+and\s+firm\s+price\s+tender\b"
    r"|\bstatutory\s+requirements\s+and\s+guidelines\s+enforced\s+by\s+relevant\s+authorities\b"
    r"|\bcontract\s+tenure\s+is\s+for\s+a\s+duration\s+of\s+four\b",
    re.IGNORECASE,
)

# Routine declaration / contract / pricing forms that are mandatory to fill/include
# but are not Tier B disqualifying unless accompanied by explicit rejection wording.
_ROUTINE_FORM_EXCLUSION_RE = re.compile(
    r"\bborang\s+kontrak\s*\(\s*am\s*\)\s*(?:9/93|10/93|2/91)\b"
    r"|\bform\s+of\s+schedule\b|\bform\s+of\s+tender\b"
    r"|\bborang\s+sebut\s+harga\b"
    r"|\bpemunya\s+benefisial\b|\bbeneficial\s+owner\b"
    r"|\bpemerdagangan\s+orang\s+dan\s+buruh\s+paksa\b"
    r"|\blampiran\s*['‘’\"]?[ef]['‘’\"]?\b|\bakta\s+rahsia\s+rasmi\b"
    r"|\bsenarai\s+kuantiti\s*\(\s*bq\s*\)\b"
    r"|\ba\.\s*dokumen\s+sebutharga\b",
    re.IGNORECASE,
)

# Mandatory prime-bidder eligibility registrations & pre-qualification gates (CIDB, MOF, Bumiputera, SSM, TNB, LHDN TCC).
_ELIGIBILITY_REGISTRATION_RE = re.compile(
    r"\b(?:cidb|lembaga\s+pembangunan\s+industri\s+pembinaan)\b"
    r"|\b(?:mof|kementerian\s+kewangan|kod\s+bidang\s+\d{6}|\b22\d{4}\b|\b21\d{4}\b)\b"
    r"|\bpkk\b|\bpusat\s+khidmat\s+kontraktor\b"
    r"|\bbumiputera\b"
    r"|\b(?:ssm|suruhanjaya\s+syarikat\s+malaysia|sijil\s+pendaftaran\s+syarikat|malaysian\s+registered\s+company)\b"
    r"|\b(?:pra\s*[- ]?kelayakan|sus\s+supplier|portal\s+sus|berdaftar\s+dengan.*tenaga\s+nasional\s+berhad)\b"
    r"|\b(?:sijil\s+pematuhan\s+cukai|tcc.*patuh|lhdn)\b",
    re.IGNORECASE,
)

# Compulsory site briefing or scheduled site visit attendance (excludes unscheduled self-inspection & PPE rules).
_COMPULSORY_BRIEFING_RE = re.compile(
    r"\b(?:taklimat\s+tender|site\s+briefing)\b"
    r"|\b(?:lawatan\s+tapak|site\s+visit).*(?:diwajibkan|wajib|compulsory|mandatory|rekod\s+kehadiran|sesi\s+\d|surat\s+wakil\s+kuasa)\b"
    r"|\b(?:diwajibkan|wajib|compulsory|mandatory).*(?:lawatan\s+tapak|site\s+visit|taklimat)\b"
    r"|\bsurat\s+wakil\s+kuasa\b.*\btaklimat\b",
    re.IGNORECASE,
)

# Core mandatory pre-award bid gates (e.g., paid-up capital/net worth thresholds, mandatory 3-month bank statements,
# mandatory 2-year CPCs / 3-year experience criteria under BNM 2.1 or MBI Dokumen Wajib, Surat Akuan Pembida,
# sample packaging submitted with tender, physical Tender Box deposit / closing deadline).
_MANDATORY_BID_GATE_RE = re.compile(
    r"\b(?:paid-up\s+capital|modal\s+berbayar|positive\s+net\s+worth)\b"
    r"|\bpenyata\s+(?:bulanan\s+akaun\s+)?bank\s*\(\s*3\s+bulan\s+terkini\s*\)|\bbank\s+statements\s+for\s+the\s+last\s+3\s+months\b"
    r"|\bpengesahan\s+siap\s+kerja\b|\bcertificate\s+of\s+practical\s+completion\b"
    r"|\bat\s+least\s+3\s+years['’]?\s+experience\b"
    r"|\bdeclaration\s+of\s+no\s+litigation\s+or\s+dispute\b"
    r"|\bsupply\s+all\s+required\s+items\s+based\s+on\s+scope\b"
    r"|\bsample\s+packaging\s+method.*submitted\s+together\s+with\s+tender\s+documents\b"
    r"|\bsurat\s+akuan\s+pembida\b|\bsurat\s+perwakilan\s+kuasa\b|\bintegrity\s+declaration\b"
    r"|\bborang\s+tender\s+jkr\s+203b\b|\bvalid\s+osha\s*/?\s*dosh\b"
    r"|\b(?:tender\s+box|peti\s+tender)\b"
    r"|\b(?:tarikh\s+tutup|closing\s+date|tender\s+submission\s+deadline)\b",
    re.IGNORECASE,
)


def infer_applies_to(
    raw_applies_to: Optional[str],
    original_text: str,
    explanation: str = "",
    mandatory_status: str = "mandatory",
) -> AppliesTo:
    """Deterministically normalize and verify `applies_to` from clause wording and model output."""
    combined = f"{original_text or ''} {explanation or ''}"

    # 1. Explicit subcontractor clauses always resolve to 'subcontractor'
    if _SUBCONTRACTOR_RE.search(combined):
        return "subcontractor"

    # 2. Explicit conditional clauses ("jika berkaitan", "if applicable", etc.) resolve to 'conditional'
    if mandatory_status == "conditional" or _CONDITIONAL_MARKER_RE.search(combined):
        return "conditional"

    # 3. Respect valid model value if provided
    if raw_applies_to in ("prime_bidder", "subcontractor", "conditional", "unknown"):
        return raw_applies_to  # type: ignore[return-value]

    return "prime_bidder"


def detect_rejection_language(
    text: str,
    rejection_quote: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """Check whether clause text or rejection_quote contains explicit rejection/disqualification wording."""
    combined = f"{text or ''} {rejection_quote or ''}".strip()
    if not combined:
        return False, None

    # First check if rejection_quote itself matches a verified pattern
    if rejection_quote and rejection_quote.strip():
        q = rejection_quote.strip()
        for pat in _REJECTION_PATTERNS:
            if pat.search(q):
                return True, q

    # Check combined clause text against verified rejection patterns
    for pat in _REJECTION_PATTERNS:
        m = pat.search(combined)
        if m:
            quote = rejection_quote.strip() if (rejection_quote and rejection_quote.strip()) else m.group(0)
            return True, quote

    return False, None


def compute_is_disqualifying(
    *,
    category: str,
    mandatory_status: str,
    original_text: str,
    explanation: str = "",
    source_excerpt: str = "",
    has_rejection_language: Optional[bool] = None,
    rejection_quote: Optional[str] = None,
    applies_to: str = "prime_bidder",
    structured_condition: Optional[Union[StructuredCondition, dict[str, Any]]] = None,
) -> bool:
    """Deterministically compute Tier B `is_disqualifying` per Fix 4 rules.

    Set `is_disqualifying = True` when ANY of:
      1. `has_rejection_language` is verified true (clause contains explicit rejection,
         disqualification, invalidity, ineligibility, or non-consideration language).
      2. `category` (or structured rule / clause) is an eligibility registration the tender
         states as mandatory for the prime bidder (CIDB, MOF, Bumiputera, SSM, TNB or other
         pre-qualification / tax compliance certificate).
      3. The item is a compulsory briefing or scheduled site visit attendance requirement.

    Not disqualifying by default (when no verified tender-rejection wording is present):
      - Subcontractor requirements (`applies_to == "subcontractor"`, e.g. MBI Clause 9.3 CIDB E11).
      - Conditional items marked `"jika berkaitan"` / `"if applicable"` (`applies_to == "conditional"`
        or `mandatory_status in ("conditional", "informational")`).
      - Post-award performance bonds and insurances (`category == "performance_bond"`).
      - Routine declaration / contract / BQ forms without rejection wording.
      - General commercial, operational, or post-award terms (payment, e-payment, service fee,
        IP rights, KPI/SLA, working hours, PPE attire, unscheduled site inspection).
    """
    full_text = f"{original_text or ''} {source_excerpt or ''} {explanation or ''}".strip()
    effective_applies_to = infer_applies_to(applies_to, original_text, explanation, mandatory_status)

    # 1. Check for verified explicit tender-rejection / disqualification language
    verified_rejection, _ = detect_rejection_language(
        f"{original_text or ''} {source_excerpt or ''}",
        rejection_quote=rejection_quote,
    )
    if not verified_rejection and has_rejection_language is True and rejection_quote:
        # Allow caller-supplied rejection_quote if it contains an unmistakable rejection keyword
        # and is not a post-award tax reimbursement caveat.
        if re.search(
            r"\b(?:ditolak|reject(?:ed|ion)?|disqualif\w*|invalid|unsuccessful\s+bid|hilang\s+kelayakan"
            r"|tidak\s+akan\s+dipertimbangkan|tidak\s+layak\s+untuk\s+dipertimbangkan|not\s+be\s+considered)\b",
            rejection_quote,
            re.IGNORECASE,
        ) and not re.search(r"tidak\s+layak\s+menuntut\s+apa-apa\s+bayaran", rejection_quote, re.IGNORECASE):
            verified_rejection = True

    if verified_rejection:
        return True

    # 2. Exclusions ("Not disqualifying by default" when no rejection wording is present)
    if effective_applies_to in ("subcontractor", "conditional"):
        return False
    if mandatory_status in ("conditional", "informational"):
        return False
    if _CONDITIONAL_MARKER_RE.search(full_text):
        return False
    if category == "performance_bond":
        return False
    if _POST_AWARD_OR_COMMERCIAL_EXCLUSION_RE.search(full_text):
        return False
    if _ROUTINE_FORM_EXCLUSION_RE.search(full_text):
        return False

    # 3. Compulsory briefing or scheduled site visit attendance
    if _COMPULSORY_BRIEFING_RE.search(full_text):
        return True
    if category == "site_briefing":
        # Exclude unscheduled self-inspection ("shall visit the site to ascertain for himself... before pricing")
        # and PPE attire rules if they have no compulsory briefing/attendance marker.
        if re.search(
            r"\bvisit\s+the\s+site\s+to\s+ascertain\s+for\s+himself\b|\bvisit\s+the\s+site\s+before\s+tendering\b",
            full_text,
            re.IGNORECASE,
        ):
            return False
        return True

    # 4. Mandatory prime-bidder eligibility registrations (CIDB, MOF, Bumiputera, SSM, TNB, TCC)
    rule_type: Optional[str] = None
    if isinstance(structured_condition, StructuredCondition):
        rule_type = structured_condition.rule_type
    elif isinstance(structured_condition, dict):
        rule_type = structured_condition.get("rule_type")

    if category in ("cidb_registration", "mof_registration", "bumiputera_status"):
        # Exclude CIDB levy (>RM500k) if categorized under cidb_registration
        if re.search(r"\blevy\b|\b0\.125%\b", full_text, re.IGNORECASE):
            return False
        return True

    if rule_type in (
        "cidb_grade",
        "cidb_category",
        "cidb_validity",
        "mof_active",
        "mof_code",
        "mof_validity",
        "bumiputera_status",
        "status_flag",
        "paid_up_capital",
    ):
        return True

    if _ELIGIBILITY_REGISTRATION_RE.search(full_text):
        if not re.search(r"\blevy\b|\b0\.125%\b", full_text, re.IGNORECASE):
            return True

    # 5. Core mandatory bid gates & Dokumen Wajib items
    if _MANDATORY_BID_GATE_RE.search(full_text):
        return True

    return False


# ---------------------------------------------------------------------------
# Checklist -> Substantive Page Citation Resolver (Fix 6)
# ---------------------------------------------------------------------------

_CHECKLIST_PAGE_RE = re.compile(r"\bsenarai\s+semak\b|\bchecklist\b", re.IGNORECASE)

# Distinctive substantive form signatures -> regex matching the substantive page header/body
_SUBSTANTIVE_FORM_SIGNATURES: list[tuple[re.Pattern[str], re.Pattern[str]]] = [
    (
        re.compile(r"\bdokumen\s+meja\s+tawaran\b", re.IGNORECASE),
        re.compile(r"MAKLUMAN\s+BERKAITAN\s+DOKUMEN\s+MEJA\s+TAWARAN", re.IGNORECASE),
    ),
    (
        re.compile(r"\bborang\s+kontrak\s*\(\s*am\s*\)\s*1/91\b", re.IGNORECASE),
        re.compile(r"BORANG\s+KONTRAK\s*\(\s*AM\s*\)\s*1/91|221002|KEMENTERIAN\s+KEWANGAN", re.IGNORECASE),
    ),
    (
        re.compile(r"\bsurat\s+akuan\s+pembida\b|\bsurat\s+perwakilan\s+kuasa\b", re.IGNORECASE),
        re.compile(r"SURAT\s+AKUAN\s+PEMBIDA.*Hilang\s+kelayakan|Bersama\s+ini\s+dilampirkan\s+Surat\s+Perwakilan\s+Kuasa", re.IGNORECASE | re.DOTALL),
    ),
    (
        re.compile(r"\bborang\s+kontrak\s*\(\s*am\s*\)\s*9/93\b|\bform\s+of\s+schedule\b", re.IGNORECASE),
        re.compile(r"FORM\s+OF\s+SCHEDULE|BORANG\s+KONTRAK\s*\(\s*AM\s*\)\s*9/93", re.IGNORECASE),
    ),
    (
        re.compile(r"\bborang\s+kontrak\s*\(\s*am\s*\)\s*10/93\b", re.IGNORECASE),
        re.compile(r"FORM\s+OF\s+TENDER|BORANG\s+KONTRAK\s*\(\s*AM\s*\)\s*10/93", re.IGNORECASE),
    ),
    (
        re.compile(r"\bborang\s+sebut\s+harga\s+bekalan\b", re.IGNORECASE),
        re.compile(r"jumlah\s+harga\s+pukal\s+sebanyak\s+Ringgit\s+Malaysia|Meterai\s+atau\s+Cap\s+Kontraktor", re.IGNORECASE),
    ),
    (
        re.compile(r"\bpemunya\s+benefisial\b", re.IGNORECASE),
        re.compile(r"BORANG\s+PENGISYTIHARAN\s+PEMUNYA\s+BENEFISIAL.*Akta\s+A1701", re.IGNORECASE | re.DOTALL),
    ),
    (
        re.compile(r"\bpemerdagangan\s+orang\s+dan\s+buruh\s+paksa\b", re.IGNORECASE),
        re.compile(r"SURAT\s+AKUAN\s+SYARIKAT\s+DALAM\s+MENANGANI\s+JENAYAH\s+PEMERDAGANGAN\s+ORANG.*Akta\s+670", re.IGNORECASE | re.DOTALL),
    ),
    (
        re.compile(r"\blampiran\s*['‘’\"]?e['‘’\"]?\b", re.IGNORECASE),
        re.compile(r"Lampiran\s*['‘’\"]?E['‘’\"]?.*AKTA\s+RAHSIA\s+RASMI\s+1972", re.IGNORECASE | re.DOTALL),
    ),
    (
        re.compile(r"\blampiran\s*['‘’\"]?f['‘’\"]?\b", re.IGNORECASE),
        re.compile(r"Lampiran\s*['‘’\"]?F['‘’\"]?.*APABILA\s+TAMAT\s+KONTRAK", re.IGNORECASE | re.DOTALL),
    ),
    (
        re.compile(r"\bborang\s+kontrak\s*\(\s*am\s*\)\s*2/91\b", re.IGNORECASE),
        re.compile(r"BORANG\s+KONTRAK\s*\(\s*AM\s*\)\s*2/91.*SENARAI\s+KERJA\s+YANG\s+DILAKSANAKAN", re.IGNORECASE | re.DOTALL),
    ),
    (
        re.compile(r"\bmaklumat\s+harga\s+indikatif\b", re.IGNORECASE),
        re.compile(r"MAKLUMAT\s+HARGA\s+INDIKATIF\s+JABATAN|HARGA\s+INDIKATIF\s*:\s*RM", re.IGNORECASE),
    ),
    (
        re.compile(r"\bsenarai\s+kuantiti\s*\(\s*bq\s*\)\b", re.IGNORECASE),
        re.compile(r"RINGKASAN\s+SEBUTHARGA|SENARAI\s+KUANTITI|Tempoh\s+Siap\s+Kerja\s*:\s*3\s+minggu", re.IGNORECASE),
    ),
]


def resolve_substantive_page_citation(
    req: ExtractedRequirement,
    pages_text_map: dict[int, str],
) -> Optional[int]:
    """If `req` cites a checklist/summary page but a substantive page exists for that form/clause,
    update `req.source_page` to the substantive page and note the checklist page in `req.source_excerpt`.
    Returns the previous checklist page number if re-pointed, else None.
    """
    if req.source_page is None or req.source_page not in pages_text_map:
        return None

    current_page_text = pages_text_map.get(req.source_page, "")
    if not _CHECKLIST_PAGE_RE.search(current_page_text):
        return None

    combined_req_text = f"{req.original_text} {req.source_excerpt} {req.explanation}"
    # Do not re-point an item that is specifically about the checklist itself (e.g. Senarai Semak ordering / Satu Jilid / Bahagian A summary)
    if re.search(r"\bsatu\s+jilid\b|\bsusun\s+dokumen\b|\bpengesahan\s+oleh\s+syarikat\b", combined_req_text, re.IGNORECASE):
        return None

    checklist_page = req.source_page
    for item_pat, page_pat in _SUBSTANTIVE_FORM_SIGNATURES:
        if item_pat.search(combined_req_text):
            for page_num in sorted(pages_text_map.keys()):
                if page_num == checklist_page:
                    continue
                candidate_text = pages_text_map[page_num]
                if _CHECKLIST_PAGE_RE.search(candidate_text) and page_num in (3, 4):
                    continue
                if page_pat.search(candidate_text):
                    req.source_page = page_num
                    note_suffix = f" [Also listed on checklist page {checklist_page}]"
                    if note_suffix not in req.source_excerpt and f"checklist page {checklist_page}" not in req.source_excerpt.lower():
                        req.source_excerpt = f"{req.source_excerpt.strip()}{note_suffix}".strip()
                    return checklist_page

    return None


def parse_llm_requirements_json(raw_json_text: str) -> list[dict[str, Any]]:
    """Parse raw JSON text returned by an LLM into a list of raw requirement dicts.

    Rejects malformed JSON or unexpected top-level structures with ValueError.
    """
    if not raw_json_text or not raw_json_text.strip():
        raise ValueError("Empty LLM response; expected JSON array or object.")

    cleaned = raw_json_text.strip()
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


def _strip_checklist_note(excerpt: str) -> str:
    return re.sub(r"\s*\[(?:Also\s+)?listed\s+on\s+checklist\s+page\s+\d+\]\s*", "", excerpt or "", flags=re.IGNORECASE).strip()


def _excerpt_matches_page(excerpt: str, page_text: str) -> bool:
    clean_excerpt = _strip_checklist_note(excerpt)
    norm_excerpt = _normalize_text(clean_excerpt)
    norm_page = _normalize_text(page_text)
    if not norm_excerpt or not norm_page:
        return False

    if norm_excerpt in norm_page:
        return True

    excerpt_tokens = _significant_tokens(norm_excerpt)
    if not excerpt_tokens:
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
    cand_sig = _condition_signature(candidate.structured_condition)
    exist_sig = _condition_signature(existing.structured_condition)

    # Identical concrete structured condition (e.g. same MOF code or CIDB grade) with same applies_to
    is_concrete_rule = (
        candidate.structured_condition is not None
        and candidate.structured_condition.rule_type != "non_structured"
    )
    if is_concrete_rule and cand_sig == exist_sig and candidate.applies_to == existing.applies_to:
        if candidate.source_page == existing.source_page:
            return True
        # Cross-page duplicate of the exact same structured eligibility condition
        if candidate.category == existing.category:
            return True

    if candidate.source_page != existing.source_page:
        # Also catch cross-page duplicates with near-identical original_text or explanation
        if candidate.category == existing.category:
            text_sim = _jaccard_similarity(candidate.original_text, existing.original_text)
            expl_sim = _jaccard_similarity(candidate.explanation, existing.explanation)
            if text_sim >= 0.82 or (text_sim >= 0.7 and expl_sim >= 0.75):
                return True
        return False

    if candidate.category != existing.category:
        return False

    if cand_sig != exist_sig:
        return False

    excerpt_sim = _jaccard_similarity(
        _strip_checklist_note(candidate.source_excerpt),
        _strip_checklist_note(existing.source_excerpt),
    )
    text_sim = _jaccard_similarity(candidate.original_text, existing.original_text)
    if max(excerpt_sim, text_sim) >= 0.6:
        return True

    if cand_sig == ("non_structured", "", "", None, "") or cand_sig == ("none",):
        return text_sim >= 0.75

    return False


def validate_and_enrich_requirements(
    raw_requirements: Iterable[Union[dict[str, Any], ExtractedRequirement]],
    pages_text_map: dict[int, str],
    low_quality_pages: Iterable[int],
) -> list[ExtractedRequirement]:
    """Validate extracted requirements, apply deterministic Tier B & applies_to, verify citations, deduplicate, and add safeguards."""
    low_quality_set = set(low_quality_pages)
    validated: list[ExtractedRequirement] = []

    for idx, raw_item in enumerate(raw_requirements):
        compute_tier_b = False
        if isinstance(raw_item, ExtractedRequirement):
            req = raw_item.model_copy(deep=True)
            if req.has_rejection_language is not None:
                compute_tier_b = True
        elif isinstance(raw_item, dict):
            item_copy = dict(raw_item)
            if not item_copy.get("id"):
                item_copy["id"] = f"TMP-{idx + 1:03d}"
            if item_copy.get("source_excerpt") is None:
                item_copy["source_excerpt"] = ""
            if "has_rejection_language" in item_copy or "is_disqualifying" not in item_copy:
                compute_tier_b = True
                item_copy.setdefault("is_disqualifying", False)
            req = ExtractedRequirement.model_validate(item_copy)
        else:
            raise ValueError(f"Unsupported requirement type at index {idx}: {type(raw_item)}")

        # 0a. Deterministic applies_to inference (Fix 5)
        req.applies_to = infer_applies_to(
            req.applies_to,
            req.original_text,
            req.explanation,
            req.mandatory_status,
        )
        if req.applies_to == "conditional" and req.mandatory_status == "mandatory":
            if _CONDITIONAL_MARKER_RE.search(f"{req.original_text} {req.explanation}"):
                req.mandatory_status = "conditional"

        # 0b. Deterministic Tier B classification (Fix 4)
        verified_rej, verified_quote = detect_rejection_language(
            f"{req.original_text} {req.source_excerpt}",
            rejection_quote=req.rejection_quote,
        )
        if verified_rej:
            req.has_rejection_language = True
            if not req.rejection_quote:
                req.rejection_quote = verified_quote
        elif req.has_rejection_language is None:
            req.has_rejection_language = False

        if compute_tier_b:
            req.is_disqualifying = compute_is_disqualifying(
                category=req.category,
                mandatory_status=req.mandatory_status,
                original_text=req.original_text,
                explanation=req.explanation,
                source_excerpt=req.source_excerpt,
                has_rejection_language=req.has_rejection_language,
                rejection_quote=req.rejection_quote,
                applies_to=req.applies_to,
                structured_condition=req.structured_condition,
            )

        # 0c. Upgrade checklist page citation to substantive page when present (Fix 6)
        previous_checklist_page = resolve_substantive_page_citation(req, pages_text_map)

        flags: list[str] = list(dict.fromkeys(req.validation_flags))

        # 1. Citation presence check
        has_valid_page = req.source_page is not None and req.source_page in pages_text_map
        has_excerpt = bool(req.source_excerpt and _strip_checklist_note(req.source_excerpt))

        if not has_valid_page or not has_excerpt:
            flags.append("UNCITED_ITEM")
            req.review_required = True
        else:
            assert req.source_page is not None
            page_text = pages_text_map[req.source_page]
            matches_substantive = _excerpt_matches_page(req.source_excerpt, page_text)
            matches_checklist = (
                previous_checklist_page is not None
                and previous_checklist_page in pages_text_map
                and _excerpt_matches_page(req.source_excerpt, pages_text_map[previous_checklist_page])
            )
            if not (matches_substantive or matches_checklist):
                # Check if another page in the document contains the excerpt and re-point if unambiguous
                matched_other_page: Optional[int] = None
                for adj in (req.source_page - 1, req.source_page + 1):
                    if adj in pages_text_map and _excerpt_matches_page(req.source_excerpt, pages_text_map[adj]):
                        matched_other_page = adj
                        break
                if matched_other_page is not None:
                    flags.append(f"EXCERPT_NOT_VERIFIED_ON_PAGE")
                    flags.append(f"EXCERPT_MATCHED_ADJACENT_PAGE_{matched_other_page}")
                    req.review_required = True
                else:
                    flags.append("EXCERPT_NOT_VERIFIED_ON_PAGE")
                    req.review_required = True

        # 2. Low-quality source page check
        if req.source_page is not None and req.source_page in low_quality_set:
            flags.append("LOW_QUALITY_SOURCE_PAGE")
            req.review_required = True

        # 3. Conservative human review enforcement
        if (
            req.structured_condition is None
            or req.structured_condition.rule_type == "non_structured"
            or req.mandatory_status == "conditional"
            or req.applies_to != "prime_bidder"
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
                applies_to="unknown",
                has_rejection_language=False,
                rejection_quote=None,
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
    tier_a = sum(
        1
        for r in requirements
        if r.mandatory_status in ("mandatory", "conditional")
        and r.extraction_pass != "system_safeguard"
    )
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
