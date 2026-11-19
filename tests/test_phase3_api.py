"""Phase 3 backend tests: upload validation, evidence-required resolution, and PDF report."""

from __future__ import annotations

import io
import os
from pathlib import Path
import tempfile

_TMP = Path(tempfile.mkdtemp(prefix="tendermate_test_"))
os.environ["TENDERMATE_DB"] = str(_TMP / "test.db")
os.environ["TENDERMATE_UPLOADS"] = str(_TMP / "uploads")
os.environ["EXTRACTION_MODE"] = "mock"  # offline, deterministic

from fastapi.testclient import TestClient  # noqa: E402
from pypdf import PdfReader  # noqa: E402

from api import app  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_1 = ROOT / "samples" / "sample_1_bilingual_jkr_maintenance.pdf"
client = TestClient(app)


def _upload_sample() -> str:
    with SAMPLE_1.open("rb") as fh:
        resp = client.post("/api/tenders", files={"file": (SAMPLE_1.name, fh, "application/pdf")},
                           data={"title": "JKR Maintenance Demo"})
    assert resp.status_code == 202
    tender_id = resp.json()["id"]
    detail = client.get(f"/api/tenders/{tender_id}").json()  # background task already ran in TestClient
    assert detail["tender"]["status"] == "completed", detail["tender"]["error"]
    return tender_id


def _result(tender_id: str, predicate) -> dict:
    results = client.get(f"/api/tenders/{tender_id}").json()["assessment"]["results"]
    return next(r for r in results if predicate(r))


def test_company_profile_is_served() -> None:
    body = client.get("/api/company").json()
    assert body["cidb"]["grade"] == "G3"
    assert body["financials"]["paid_up_capital_rm"] == 250000


def test_non_pdf_upload_rejected() -> None:
    resp = client.post("/api/tenders", files={"file": ("tender.docx", b"PK\x03\x04 not a pdf", "application/octet-stream")})
    assert resp.status_code == 415
    resp = client.post("/api/tenders", data={"title": "no file"})
    assert resp.status_code == 400


def test_mark_satisfied_requires_upload_and_records_who_when_reference() -> None:
    tender_id = _upload_sample()
    briefing = _result(tender_id, lambda r: r["tender_condition"]["category"] == "site_briefing")
    assert briefing["status"] == "needs_review"
    url = f"/api/tenders/{tender_id}/requirements/{briefing['requirement_id']}/resolve"

    # 1) No upload -> rejected, status unchanged
    resp = client.post(url, data={"attested_by": "Ahmad Farhan", "note": "I attended"})
    assert resp.status_code == 400
    assert _result(tender_id, lambda r: r["requirement_id"] == briefing["requirement_id"])["status"] == "needs_review"

    # 2) Upload but no name -> rejected, status unchanged
    resp = client.post(url, files={"file": ("slip.pdf", b"%PDF-1.4 slip", "application/pdf")})
    assert resp.status_code == 400
    assert _result(tender_id, lambda r: r["requirement_id"] == briefing["requirement_id"])["status"] == "needs_review"

    # 3) Upload + name -> User-evidenced with who/when/reference
    resp = client.post(url, files={"file": ("Briefing_Slip.pdf", b"%PDF-1.4 slip", "application/pdf")},
                       data={"attested_by": "Ahmad Farhan", "note": "Signed JKR attendance slip"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "matched_user_evidenced"
    ur = body["user_resolution"]
    assert ur["attested_by"] == "Ahmad Farhan"
    assert ur["attested_at"]
    assert ur["evidence_document_id"].startswith("EVID-")
    assert ur["evidence_filename"] == "Briefing_Slip.pdf"
    assert client.get(f"/api/tenders/{tender_id}/evidence/{ur['evidence_document_id']}").status_code == 200


def test_gap_and_rule_checked_cannot_be_overridden() -> None:
    tender_id = _upload_sample()
    gap = _result(tender_id, lambda r: r["status"] == "gap")
    resp = client.post(f"/api/tenders/{tender_id}/requirements/{gap['requirement_id']}/resolve",
                       files={"file": ("x.pdf", b"%PDF-1.4", "application/pdf")}, data={"attested_by": "A"})
    assert resp.status_code == 409
    assert _result(tender_id, lambda r: r["requirement_id"] == gap["requirement_id"])["status"] == "gap"


def test_report_pdf_contains_disclaimer_and_labels() -> None:
    tender_id = _upload_sample()
    resp = client.get(f"/api/tenders/{tender_id}/report.pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    text = "\n".join(page.extract_text() for page in PdfReader(io.BytesIO(resp.content)).pages)
    flat = " ".join(text.split())
    assert "Preliminary readiness assessment \u2014 verify against the official tender documents." in flat
    assert "Rule-checked" in flat
    assert "Gap" in flat
    assert "Syarikat Kejuruteraan Aman" in flat
    assert tender_id in flat
