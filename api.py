"""Phase 3: TenderMate FastAPI backend (single user, one pre-seeded company profile).

Run:  py -m uvicorn api:app --reload --port 8000

Storage: SQLite (data/tendermate.db) + PDF files under data/uploads/.
Rule results are recomputed on every read from the stored extraction + current
company profile (PRD 9.4: reproducible, re-analysable), then stored user
resolutions are applied. User resolutions can only move needs_review ->
matched_user_evidenced and always require an uploaded evidence file.
"""

from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
import uuid

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

from extract_requirements import DEFAULT_MODEL, extract_tender_requirements
from report import build_report_pdf
from rules_engine import (
    ComplianceAssessment,
    evaluate_tender,
    load_company_profile,
    resolve_needs_review_with_evidence,
    summarize_results,
)
from schema import ExtractionOutput

load_dotenv()

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = Path(os.getenv("TENDERMATE_DB", str(DATA_DIR / "tendermate.db")))
UPLOAD_DIR = Path(os.getenv("TENDERMATE_UPLOADS", str(DATA_DIR / "uploads")))
PROFILE_PATH = Path(os.getenv("TENDERMATE_PROFILE", str(DATA_DIR / "company_profile.json")))
# EXTRACTION_MODE=live uses Gemini; =mock uses the offline regex extractor (demo fallback only).
EXTRACTION_MODE = os.getenv("EXTRACTION_MODE", "live").strip().lower()
MAX_PDF_BYTES = 25 * 1024 * 1024

app = FastAPI(title="TenderMate API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tenders (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                filename TEXT NOT NULL,
                pdf_path TEXT NOT NULL,
                status TEXT NOT NULL,          -- processing | completed | failed
                error TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                extraction_json TEXT
            );
            CREATE TABLE IF NOT EXISTS resolutions (
                id TEXT PRIMARY KEY,           -- evidence reference, e.g. EVID-1a2b3c4d
                tender_id TEXT NOT NULL,
                requirement_id TEXT NOT NULL,
                evidence_filename TEXT NOT NULL,
                evidence_path TEXT NOT NULL,
                attested_by TEXT NOT NULL,
                attested_at TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT ''
            );
            """
        )


init_db()


def _get_tender_row(tender_id: str) -> sqlite3.Row:
    with _db() as conn:
        row = conn.execute("SELECT * FROM tenders WHERE id = ?", (tender_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Tender not found.")
    return row


def _tender_meta(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "filename": row["filename"],
        "status": row["status"],
        "error": row["error"],
        "created_at": row["created_at"],
        "completed_at": row["completed_at"],
    }


def _validate_pdf_upload(upload: UploadFile | None, content: bytes, label: str) -> None:
    if upload is None or not upload.filename or not content:
        raise HTTPException(status_code=400, detail=f"{label}: a PDF file upload is required.")
    if not upload.filename.lower().endswith(".pdf") or not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=415,
            detail=f"{label}: only PDF files are supported in the MVP (DOCX/XLSX/images are not accepted).",
        )
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail=f"{label}: file exceeds 25 MB limit.")


def _safe_name(filename: str) -> str:
    keep = "".join(c if c.isalnum() or c in "._- " else "_" for c in Path(filename).name)
    return keep.strip() or "upload.pdf"


def build_assessment(row: sqlite3.Row) -> tuple[ExtractionOutput, ComplianceAssessment]:
    """Re-run deterministic rules, then apply stored evidence-backed user resolutions."""
    extraction = ExtractionOutput.model_validate_json(row["extraction_json"])
    profile = load_company_profile(PROFILE_PATH)
    assessment = evaluate_tender(extraction, profile)

    with _db() as conn:
        resolutions = conn.execute(
            "SELECT * FROM resolutions WHERE tender_id = ? ORDER BY attested_at", (row["id"],)
        ).fetchall()
    latest = {r["requirement_id"]: r for r in resolutions}

    results = []
    for result in assessment.results:
        res = latest.get(result.requirement_id)
        if res is not None:
            # Guardrail lives in rules_engine: only needs_review can change, and only with evidence.
            result = resolve_needs_review_with_evidence(
                result,
                evidence_document_id=res["id"],
                evidence_filename=res["evidence_filename"],
                attested_by=res["attested_by"],
                note=res["note"],
                attested_at=res["attested_at"],
            )
        results.append(result)
    assessment.results = results
    assessment.summary = summarize_results(results)
    return extraction, assessment


def _process_tender(tender_id: str, pdf_path: str) -> None:
    """Background extraction job (FastAPI BackgroundTasks; no queue service)."""
    try:
        output = extract_tender_requirements(
            pdf_path=Path(pdf_path),
            model_name=os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
            mock_llm=EXTRACTION_MODE == "mock",
        )
        with _db() as conn:
            conn.execute(
                "UPDATE tenders SET status='completed', completed_at=?, extraction_json=?, error=NULL WHERE id=?",
                (_now(), output.model_dump_json(), tender_id),
            )
    except Exception as exc:  # preserve the error for the UI (PRD 9.4)
        with _db() as conn:
            conn.execute(
                "UPDATE tenders SET status='failed', completed_at=?, error=? WHERE id=?",
                (_now(), f"{type(exc).__name__}: {exc}", tender_id),
            )


# ---------------------------------------------------------------------------
# Company profile & library (read-only)
# ---------------------------------------------------------------------------


@app.get("/api/company")
def get_company() -> dict:
    return load_company_profile(PROFILE_PATH).model_dump()


# ---------------------------------------------------------------------------
# Tenders
# ---------------------------------------------------------------------------


@app.get("/api/tenders")
def list_tenders() -> list[dict]:
    with _db() as conn:
        rows = conn.execute("SELECT * FROM tenders ORDER BY created_at DESC").fetchall()
    return [_tender_meta(r) for r in rows]


@app.post("/api/tenders", status_code=202)
async def upload_tender(
    background: BackgroundTasks,
    file: UploadFile | None = File(None),
    title: str = Form(""),
) -> dict:
    content = await file.read() if file else b""
    _validate_pdf_upload(file, content, "Tender document")

    tender_id = f"TND-{uuid.uuid4().hex[:8]}"
    dest_dir = UPLOAD_DIR / "tenders" / tender_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    filename = _safe_name(file.filename)
    pdf_path = dest_dir / filename
    pdf_path.write_bytes(content)

    with _db() as conn:
        conn.execute(
            "INSERT INTO tenders (id, title, filename, pdf_path, status, created_at) VALUES (?, ?, ?, ?, 'processing', ?)",
            (tender_id, title.strip() or Path(filename).stem, filename, str(pdf_path), _now()),
        )
    background.add_task(_process_tender, tender_id, str(pdf_path))
    return {"id": tender_id, "status": "processing"}


@app.get("/api/tenders/{tender_id}")
def get_tender(tender_id: str) -> dict:
    row = _get_tender_row(tender_id)
    payload: dict = {"tender": _tender_meta(row), "extraction": None, "assessment": None}
    if row["status"] == "completed":
        extraction, assessment = build_assessment(row)
        payload["extraction"] = extraction.model_dump()
        payload["assessment"] = assessment.model_dump()
    return payload


@app.get("/api/tenders/{tender_id}/pdf")
def get_tender_pdf(tender_id: str) -> FileResponse:
    row = _get_tender_row(tender_id)
    return FileResponse(row["pdf_path"], media_type="application/pdf", content_disposition_type="inline")


@app.post("/api/tenders/{tender_id}/requirements/{requirement_id}/resolve")
async def resolve_requirement(
    tender_id: str,
    requirement_id: str,
    file: UploadFile | None = File(None),
    attested_by: str = Form(""),
    note: str = Form(""),
) -> dict:
    """Mark a Needs Review item as satisfied. Requires an uploaded evidence file and who."""
    row = _get_tender_row(tender_id)
    if row["status"] != "completed":
        raise HTTPException(status_code=409, detail="Tender analysis is not completed.")

    _, assessment = build_assessment(row)
    current = next((r for r in assessment.results if r.requirement_id == requirement_id), None)
    if current is None:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    if current.status != "needs_review":
        raise HTTPException(
            status_code=409,
            detail=f"Only Needs Review items can be marked satisfied (current status: {current.status}). "
            "Rule-checked results and gaps cannot be overridden.",
        )

    content = await file.read() if file else b""
    _validate_pdf_upload(file, content, "Evidence")  # no upload -> 400, status unchanged
    if not attested_by.strip():
        raise HTTPException(status_code=400, detail="Name of the person attesting is required.")

    evidence_id = f"EVID-{uuid.uuid4().hex[:8]}"
    filename = _safe_name(file.filename)
    dest_dir = UPLOAD_DIR / "evidence" / tender_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    evidence_path = dest_dir / f"{evidence_id}_{filename}"
    evidence_path.write_bytes(content)

    with _db() as conn:
        conn.execute(
            "INSERT INTO resolutions (id, tender_id, requirement_id, evidence_filename, evidence_path, "
            "attested_by, attested_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (evidence_id, tender_id, requirement_id, filename, str(evidence_path),
             attested_by.strip(), _now(), note.strip()),
        )

    _, assessment = build_assessment(row)
    updated = next(r for r in assessment.results if r.requirement_id == requirement_id)
    return updated.model_dump()


@app.get("/api/tenders/{tender_id}/evidence/{evidence_id}")
def get_evidence(tender_id: str, evidence_id: str) -> FileResponse:
    with _db() as conn:
        res = conn.execute(
            "SELECT * FROM resolutions WHERE id = ? AND tender_id = ?", (evidence_id, tender_id)
        ).fetchone()
    if res is None:
        raise HTTPException(status_code=404, detail="Evidence not found.")
    return FileResponse(res["evidence_path"], media_type="application/pdf", content_disposition_type="inline")


@app.get("/api/tenders/{tender_id}/report.pdf")
def get_report(tender_id: str) -> Response:
    row = _get_tender_row(tender_id)
    if row["status"] != "completed":
        raise HTTPException(status_code=409, detail="Tender analysis is not completed.")
    extraction, assessment = build_assessment(row)
    profile = load_company_profile(PROFILE_PATH)
    pdf_bytes = build_report_pdf(_tender_meta(row), extraction, assessment, profile)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="TenderMate_Report_{tender_id}.pdf"'},
    )
