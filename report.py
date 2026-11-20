"""Phase 3: PDF readiness report (ReportLab)."""

from __future__ import annotations

from datetime import datetime, timezone
import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from rules_engine import ComplianceAssessment, ComplianceResult, CompanyProfile
from schema import ExtractedRequirement, ExtractionOutput

DISCLAIMER = "Preliminary readiness assessment \u2014 verify against the official tender documents."

STATUS_LABELS = {
    "matched_rule_verified": "Rule-checked",
    "matched_user_evidenced": "User-evidenced",
    "gap": "Gap",
    "needs_review": "Needs Review",
    "not_applicable": "Not Applicable",
}
STATUS_COLORS = {
    "matched_rule_verified": colors.HexColor("#15803D"),
    "matched_user_evidenced": colors.HexColor("#1D4ED8"),
    "gap": colors.HexColor("#B91C1C"),
    "needs_review": colors.HexColor("#B45309"),
    "not_applicable": colors.HexColor("#6B7280"),
}
NEXT_ACTIONS = {
    "matched_rule_verified": "Include the referenced company evidence in the submission.",
    "matched_user_evidenced": "Include the attached evidence. User-attested, not rule-verified: confirm against the tender.",
    "gap": "Address the gap before submitting or reconsider participation. Cannot be overridden by user attestation.",
    "needs_review": "Verify manually. If met, attach supporting evidence and mark as satisfied.",
    "not_applicable": "No action, subject to confirmation against the tender.",
}

_base = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=_base["Heading1"], fontSize=16, leading=20, spaceAfter=4)
H2 = ParagraphStyle("H2", parent=_base["Heading2"], fontSize=12, leading=15, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("Body", parent=_base["BodyText"], fontSize=8.5, leading=11)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=7.5, leading=9.5)
DISCLAIMER_STYLE = ParagraphStyle(
    "Disclaimer", parent=BODY, fontName="Helvetica-Bold", fontSize=9.5, leading=12,
    textColor=colors.HexColor("#7C2D12"),
)


def _p(text: object, style: ParagraphStyle = BODY) -> Paragraph:
    return Paragraph(escape("" if text is None else str(text)), style)


def _fmt_dt(value: str | None) -> str:
    if not value:
        return "-"
    try:
        return datetime.fromisoformat(value).strftime("%d %b %Y %H:%M UTC")
    except ValueError:
        return value


def _grid(data: list[list], widths: list[float], header: bool = True) -> Table:
    tbl = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0"))]
    tbl.setStyle(TableStyle(style))
    return tbl


def _evidence_text(result: ComplianceResult) -> str:
    if result.company_evidence:
        ev = result.company_evidence
        return f"{ev.get('title') or ev.get('filename')} [{ev.get('document_id')}] - {ev.get('filename')}"
    if result.missing_evidence_marker:
        return f"MISSING EVIDENCE: {result.missing_evidence_marker.get('reason')}"
    return "-"


def _detail_block(req: ExtractedRequirement, result: ComplianceResult) -> KeepTogether:
    tier = "  [TIER B - DISQUALIFYING]" if req.is_disqualifying else ""
    label = STATUS_LABELS[result.status]
    rows: list[list] = [
        [_p("Tender condition"), _p(f'"{req.original_text}" (page {req.source_page})')],
    ]
    if result.status in ("matched_rule_verified", "gap"):
        rows += [
            [_p("Rule applied"), _p(result.rule_id or "-")],
            [_p("Comparison"), _p(result.comparison.get("expression") or result.comparison.get("reason") or "-")],
            [_p("Company evidence"), _p(_evidence_text(result))],
        ]
    elif result.status == "matched_user_evidenced" and result.user_resolution:
        ur = result.user_resolution
        rows += [
            [_p("Basis"), _p("User attestation with attached evidence - NOT rule-verified.")],
            [_p("Evidence reference"), _p(f"{ur.evidence_document_id} - {ur.evidence_filename}")],
            [_p("Attested by / at"), _p(f"{ur.attested_by} / {_fmt_dt(ur.attested_at)}")],
            [_p("Note"), _p(ur.note or "-")],
        ]
    else:
        rows += [[_p("Why"), _p(result.explanation)]]
        if req.validation_flags:
            rows += [[_p("Extraction flags"), _p(", ".join(req.validation_flags))]]
    rows += [[_p("Next action"), _p(NEXT_ACTIONS[result.status])]]

    header = Paragraph(
        f"<b>{escape(req.id)}</b> - page {req.source_page} - "
        f"<font color='{STATUS_COLORS[result.status].hexval()}'><b>{label}</b></font>{escape(tier)}",
        BODY,
    )
    return KeepTogether([header, Spacer(1, 2), _grid(rows, [32 * mm, 138 * mm], header=False), Spacer(1, 6)])


def build_report_pdf(
    tender: dict,
    extraction: ExtractionOutput,
    assessment: ComplianceAssessment,
    profile: CompanyProfile,
) -> bytes:
    buf = io.BytesIO()
    generated_at = datetime.now(timezone.utc).isoformat()

    def _footer(canvas, doc) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica-Oblique", 7.5)
        canvas.setFillColor(colors.HexColor("#7C2D12"))
        canvas.drawString(20 * mm, 10 * mm, DISCLAIMER)
        canvas.setFillColor(colors.grey)
        canvas.drawRightString(190 * mm, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
        title=f"TenderMate Readiness Report - {tender['title']}",
    )
    reqs = {r.id: r for r in extraction.requirements}
    s = assessment.summary
    story: list = [
        Paragraph("TenderMate - Tender Readiness Report", H1),
        Paragraph(escape(DISCLAIMER), DISCLAIMER_STYLE),
        Spacer(1, 6),
    ]

    cidb, mof = profile.cidb, profile.mof
    ident = [
        [_p("Tender"), _p(tender["title"]), _p("Company"), _p(profile.name)],
        [_p("Tender ID"), _p(tender["id"]), _p("Company reg. no."), _p(profile.registration_number)],
        [_p("Source file"), _p(tender["filename"]), _p("CIDB reg. / grade"),
         _p(f"{cidb.registration_number} / {cidb.grade}" if cidb else "-")],
        [_p("Pages"), _p(extraction.page_count), _p("MOF reg."), _p(mof.registration_number if mof else "-")],
        [_p("Analysis date"), _p(_fmt_dt(assessment.evaluated_at)), _p("Extraction model"), _p(extraction.model_used)],
        [_p("Report generated"), _p(_fmt_dt(generated_at)), _p("Profile confirmed"), _p(_fmt_dt(profile.confirmed_at))],
    ]
    story += [_grid(ident, [28 * mm, 57 * mm, 30 * mm, 55 * mm], header=False), Spacer(1, 6)]

    story.append(Paragraph("Summary", H2))
    summary_rows = [
        ["Total atomic requirements", s.total_requirements],
        ["Rule-checked (deterministic rule satisfied)", s.matched_rule_verified],
        ["User-evidenced (user attestation + attachment, not rule-verified)", s.matched_user_evidenced],
        ["Gap", f"{s.gap}  (of which Tier B disqualifying: {s.disqualifying_gaps})"],
        ["Needs Review", s.needs_review],
        ["Not Applicable", s.not_applicable],
    ]
    story.append(_grid([[_p(a), _p(b)] for a, b in summary_rows], [120 * mm, 50 * mm], header=False))

    if extraction.low_quality_pages:
        notes = "; ".join(
            f"page {p.page_number}: {p.extraction_method} ({p.quality_notes or 'low quality'})"
            for p in extraction.pages_info if p.low_quality
        )
        story += [Spacer(1, 4), _p(f"Extraction quality warning - low-quality/unreadable pages: {notes}", SMALL)]

    story.append(Paragraph("Requirement inventory", H2))
    inv = [[_p("ID"), _p("Page"), _p("Tier B"), _p("Category"), _p("Original wording"), _p("Status")]]
    for result in assessment.results:
        req = reqs[result.requirement_id]
        text = req.original_text if len(req.original_text) <= 180 else req.original_text[:177] + "..."
        inv.append([
            _p(req.id, SMALL), _p(req.source_page, SMALL), _p("Yes" if req.is_disqualifying else "No", SMALL),
            _p(req.category.replace("_", " "), SMALL), _p(text, SMALL),
            Paragraph(f"<font color='{STATUS_COLORS[result.status].hexval()}'><b>"
                      f"{STATUS_LABELS[result.status]}</b></font>", SMALL),
        ])
    story.append(_grid(inv, [16 * mm, 13 * mm, 13 * mm, 26 * mm, 78 * mm, 24 * mm]))

    sections = [
        ("matched_rule_verified", "Rule-checked matches"),
        ("matched_user_evidenced", "User-evidenced matches (user-confirmed, not rule-verified)"),
        ("gap", "Gaps"),
        ("needs_review", "Needs Review"),
        ("not_applicable", "Not Applicable"),
    ]
    for status, heading in sections:
        items = [r for r in assessment.results if r.status == status]
        if not items:
            continue
        story.append(Paragraph(f"{heading} ({len(items)})", H2))
        for result in items:
            story.append(_detail_block(reqs[result.requirement_id], result))

    story.append(Paragraph("Evidence references", H2))
    ev_rows = [[_p("Reference"), _p("Document"), _p("Source")]]
    used_docs = {r.company_evidence["document_id"] for r in assessment.results if r.company_evidence}
    for d in profile.documents:
        if d.id in used_docs:
            ev_rows.append([_p(d.id, SMALL), _p(f"{d.title} ({d.filename})", SMALL),
                            _p("Company library (user-confirmed metadata)", SMALL)])
    for r in assessment.results:
        if r.user_resolution:
            ev_rows.append([_p(r.user_resolution.evidence_document_id, SMALL),
                            _p(f"{r.user_resolution.evidence_filename} (for {r.requirement_id})", SMALL),
                            _p(f"User upload by {r.user_resolution.attested_by}", SMALL)])
    if len(ev_rows) == 1:
        ev_rows.append([_p("-"), _p("No evidence referenced"), _p("-")])
    story.append(_grid(ev_rows, [28 * mm, 92 * mm, 50 * mm]))

    story += [
        Paragraph("Limitations", H2),
        _p("Requirements were extracted by an AI model and may be incomplete; page citations should be checked "
           "against the source tender. Rule-checked results compare user-confirmed company data with the extracted "
           "condition and do not verify the authenticity of certificates. User-evidenced items are attestations by "
           "the user, not independent verification. This report is not an official eligibility determination, "
           "legal advice, or a guarantee of compliance or award."),
        Spacer(1, 6),
        Paragraph(escape(DISCLAIMER), DISCLAIMER_STYLE),
    ]

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()
