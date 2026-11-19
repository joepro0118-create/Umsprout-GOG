# TenderMate (Hackathon Prototype — Phases 1–3)

AI-powered tender preparation and compliance assistant for Malaysian SMEs (UM SPRout 9.0 prototype).

> **Disclaimer:** Preliminary readiness assessment — verify against the official tender documents.

## Architecture
- **Phase 1 — Extraction ([extract_requirements.py](extract_requirements.py), [schema.py](schema.py))**: PyMuPDF page-by-page extraction + OCR fallback (`tesseract` CLI -> Gemini Vision OCR -> low-quality safeguard) + two-pass Gemini extraction (initial + coverage pass) + citation & schema validation.
- **Phase 2 — Deterministic Rules Engine ([rules_engine.py](rules_engine.py), [data/company_profile.json](data/company_profile.json))**: Plain Python rules for CIDB grade threshold, CIDB category membership, MOF code membership, status flags, date validity, and paid-up capital numeric threshold, plus evidence-required `Needs Review -> User-evidenced` resolution guardrail.
- **Phase 3 — Web App & PDF Report ([api.py](api.py), [report.py](report.py), `frontend/`)**: FastAPI + SQLite + ReportLab PDF report + minimal Next.js & Tailwind CSS UI.

## Setup

### 1. Environment Variables
Copy `.env.example` to `.env` and set `GEMINI_API_KEY`:
```powershell
Copy-Item .env.example .env
```

> **Windows note:** Invoke Python via `py` (`py -m uvicorn ...`, `py -m pytest`).

### 2. Run the Backend (FastAPI)
```powershell
# Live Gemini extraction (default)
py -m uvicorn api:app --reload --port 8000

# Offline mock extraction fallback (for instant demo without Gemini latency)
$env:EXTRACTION_MODE="mock"; py -m uvicorn api:app --reload --port 8000
```

### 3. Run the Frontend (Next.js + Tailwind)
```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000`. Optionally set `NEXT_PUBLIC_API_URL` if the backend runs on another host/port.

### 4. CLI Tools & Tests
```powershell
# Run all unit & API tests (Phases 1–3)
py -m pytest -v

# Phase 1 extraction CLI
py extract_requirements.py samples/sample_1_bilingual_jkr_maintenance.pdf -o requirements.json

# Phase 2 rules CLI
py rules_engine.py requirements.json data/company_profile.json -o compliance_results.json

# Inspect a single PDF page's raw text / OCR status
py scripts/inspect_page.py samples/sample_1_bilingual_jkr_maintenance.pdf 4 --live-ocr
```
