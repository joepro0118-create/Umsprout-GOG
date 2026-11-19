# TenderMate — AI-Powered Tender Preparation & Compliance Assistant for Malaysian SMEs

[![GitHub Repository](https://img.shields.io/badge/GitHub-TenderMate_Repo-181717?style=for-the-badge&logo=github)](https://github.com/joepro0118-create/Umsprout-GOG)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_%2B_Python_3.13-009688?style=for-the-badge&logo=fastapi&logoColor=white)](api.py)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16_%2B_Tailwind_v4-000000?style=for-the-badge&logo=nextdotjs)](frontend/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_Long--Context_%2B_Vision_OCR-4285F4?style=for-the-badge&logo=google)](extract_requirements.py)

> **UM SPRout 9.0 · Malaysia · B2B SaaS / Procurement Technology Prototype**
>
> **“Know the requirements. Find the gaps. Prepare with confidence.”**
>
> Preparing a Malaysian government or corporate tender means wading through lengthy Bahasa Melayu (BM) and English PDFs, scanned appendices, and scattered company certificates — where missing a single mandatory requirement can disqualify a bid. **TenderMate** transforms unstructured bilingual tender PDFs into **atomic, page-cited mandatory requirements** using **Google Gemini** (with Vision OCR fallback for scanned pages), runs **100% deterministic Python eligibility rules** against a reusable **Company Profile & Document Library**, enforces **evidence-backed human sign-off** for non-structured items, and exports an auditable **PDF Readiness Report**.

It converts hours of error-prone manual tender checking into a transparent, evidence-backed Go/No-Go readiness assessment — without LLM pass/fail guesswork or proposal-drafting bloat.

> ⚠️ **Disclaimer:** **Preliminary readiness assessment — verify against the official tender documents.** TenderMate is a preparation aid, not an official eligibility determination, legal advice, or a submission portal. Demo samples in `samples/` and `data/company_profile.json` are synthetic/pre-seeded for prototype demonstration.

---

## Table of Contents

- [Project Overview](#project-overview)
  - [The Problem We Are Solving](#the-problem-we-are-solving)
  - [Our Proposed Solution](#our-proposed-solution)
  - [Target Users & Beneficiaries](#target-users--beneficiaries)
  - [What Makes TenderMate Unique](#what-makes-tendermate-unique)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Start the Backend Server (FastAPI)](#3-start-the-backend-server-fastapi)
  - [4. Install & Start the Frontend Application (Next.js)](#4-install--start-the-frontend-application-nextjs)
  - [5. Judge Evaluation Walkthrough (Under 3 Minutes)](#5-judge-evaluation-walkthrough-under-3-minutes)
- [Architecture & System Design](#architecture--system-design)
  - [Directory Structure](#directory-structure)
  - [End-to-End Processing Pipeline](#end-to-end-processing-pipeline)
  - [Data Flow Diagram](#data-flow-diagram)
  - [Core Subsystems](#core-subsystems)
- [Deterministic Rules Engine & Status Model](#deterministic-rules-engine--status-model)
  - [Supported Deterministic Rules](#supported-deterministic-rules)
  - [Status Enums vs UI / PDF Labels](#status-enums-vs-ui--pdf-labels)
- [API Reference](#api-reference)
- [Environment Variables & CLI Tools](#environment-variables--cli-tools)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)
- [Privacy, Security & Anti-Hallucination Guardrails](#privacy-security--anti-hallucination-guardrails)
- [Known Limitations & Scope](#known-limitations--scope)

---

## Project Overview

### The Problem We Are Solving
Malaysian SMEs — particularly small construction, engineering, and facilities-maintenance contractors — lose days of effort and face avoidable disqualifications during tender preparation:
- **Complex Bilingual Documentation:** Tenders mix Bahasa Melayu and English across instructions, tables, checklists (`Senarai Semak`), and scanned appendices (`Lampiran`).
- **Hidden Disqualifying Conditions (Tier B):** Missing one compulsory requirement — CIDB grade or category, MOF field code, Bumiputera status, certificate expiry date, compulsory site briefing (`Lawatan Tapak`), performance bond, or signed declaration (`Surat Akuan Pembida`) — can result in automatic rejection.
- **Repeated Manual Cross-Checking:** Company certificates are scattered across local folders, email, and WhatsApp, forcing teams to hunt for the same documents on every bid.
- **Unreliable General Chatbots:** Pasting a tender into a general LLM produces ungrounded prose without reproducible rules, persistent certificate records, or an auditable condition → rule → evidence trail.

### Our Proposed Solution
**TenderMate** delivers one focused, repeatable end-to-end workflow:
1. **Reusable Company Profile & Document Library:** Store user-confirmed CIDB, MOF, Bumiputera, SSM, and paid-up capital records alongside supporting certificate PDFs once and reuse them across every tender.
2. **Bilingual PDF Extraction + Vision OCR + Coverage Pass:** Extract text page-by-page with PyMuPDF, automatically apply OCR fallback (Tesseract CLI or Gemini Vision) on scanned pages, and run two Gemini passes (initial + coverage audit) to split compound clauses into **atomic, independently checkable requirements** with verbatim BM/English wording and page citations.
3. **Deterministic Eligibility Rules Engine:** Pure Python rules — **never the LLM** — evaluate structured conditions against confirmed company data and produce a complete audit trail (`rule_id`, `inputs`, `comparison`, `tender_condition`, and linked `company_evidence` or `missing_evidence_marker`).
4. **Evidence-Enforced Human Review & PDF Readiness Report:** Non-structured items (site briefings, performance bonds, experience, mandatory forms) stay **Needs Review** until the user **uploads actual PDF proof** and records their attestation (`User-evidenced`). Export a clean **PDF Readiness Report** separating **Rule-checked**, **User-evidenced**, **Gaps**, and **Needs Review** items.

### Target Users & Beneficiaries
- **Small Contractors & Engineering SMEs:** Civil, mechanical, and electrical contractors bidding on JKR, GLC, and corporate tenders.
- **Facilities-Maintenance Firms:** Companies managing recurring government and institutional maintenance contracts.
- **SME Owners & Tender Executives:** Lean teams needing a fast Go/No-Go eligibility check and auditable submission checklist before investing days into proposal writing.

### What Makes TenderMate Unique
- **Strict Separation of AI Extraction & Deterministic Pass/Fail:** Gemini reads bilingual PDFs and writes plain-language explanations; plain Python rules decide pass/fail. No LLM can hallucinate eligibility.
- **Atomic Requirement Splitting (PRD 5.6):** Compound clauses like *"CIDB G4 or above, category B04, valid until 15 Dec 2026"* are split into 3 independently verifiable requirements, each retaining verbatim wording and page citation.
- **No Rubber-Stamp Checkboxes:** Marking a `Needs Review` item as satisfied **requires an actual PDF file upload** plus the attester's name; acknowledging without evidence leaves the status unchanged, and deterministic `Gap` results can never be overridden.
- **Scanned Page Safeguard:** Scanned pages are transcribed via OCR fallback; if a page remains unreadable (`< 50` chars), the pipeline emits an explicit `UNREADABLE_PAGE_SAFEGUARD` review item so nothing is silently skipped.

---

## Key Features

- **PDF-Only Upload with Page-Aware Extraction:** Validates `.pdf` extension, `%PDF` magic bytes, and 25 MB size limit; preserves 1-based page boundaries for clickable `#page=N` citations.
- **Two-Pass Atomic Requirement Extraction:** Pass 1 extracts all mandatory/conditional items; Pass 2 performs a coverage audit over tables, `Senarai Semak` checklists, and compound clauses to reduce omissions.
- **OCR Fallback for Scanned Pages:** Automatically detects low-text/image-only pages, tries local `tesseract` if installed, falls back to **Gemini Vision OCR**, and explicitly flags low-quality or unreadable pages.
- **6 Deterministic Compliance Rules:** CIDB grade threshold (`G1`–`G7`), CIDB category membership, MOF 6-digit code membership, status flags (`mof_active`, `bumiputera_status`, `ssm_active`), point-in-time date validity, and paid-up capital / net worth numeric threshold.
- **Tier B Disqualifying Badges & Filters:** Highlights critical disqualifying requirements (eligibility, performance bonds, compulsory site briefings, mandatory forms/declarations) with one-click status and Tier B filtering.
- **Visually Distinct `Rule-checked` vs `User-evidenced` Statuses:** Both the web UI and exported PDF clearly separate deterministic rule verifications from user-attested evidence uploads.
- **Server-Side PDF Readiness Report (ReportLab):** Generates a downloadable A4 PDF with tender/company identifiers, summary counts, full requirement inventory, grouped detail sections with audit trails, evidence reference table, limitations, and mandatory disclaimer on every page.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js `16.4.6` + React `19.3.0` + Tailwind CSS `4.3.3` | App Router, TypeScript (`strict: true`), `@tailwindcss/turbopack`, Geist & Geist Mono fonts |
| **Backend** | Python `3.13` + FastAPI + Uvicorn | REST API, CORS middleware, multipart PDF uploads, FastAPI `BackgroundTasks` (no Celery/Redis) |
| **Database & Storage** | SQLite (`data/tendermate.db`) + Local Disk (`data/uploads/`) | Zero-setup single-user persistence for tender analyses and uploaded evidence PDFs |
| **PDF Parsing & OCR** | PyMuPDF (`pymupdf`) + Tesseract / Gemini Vision | Page-level text extraction, raster image rendering (`200 DPI`) for scanned page OCR fallback |
| **AI Extraction** | Google Gemini (`google-genai` SDK) | `gemini-3-flash-preview` default with automatic fallback (`gemini-3.1-flash-lite`, `gemini-4-hydrogen`) and strict JSON schema output |
| **Schema Validation** | Pydantic v2 | Strict validation of extracted atomic requirements, citations, company profile, and compliance results |
| **Rules Engine** | Pure Python (`rules_engine.py`) | 100% deterministic eligibility checks with full condition → rule → evidence audit trail |
| **PDF Report** | ReportLab (`report.py`) | Server-side A4 PDF readiness report with inline headers/footers and audit tables |
| **Testing** | Pytest (`26` tests) | Unit, schema, citation, deterministic rule, FastAPI endpoint, and PDF report verification |

---

## Prerequisites

- **Python:** 3.11+ (tested on Python `3.13.12`; invoke with `py` on Windows)
- **Node.js & npm:** Node.js `20+` and npm `10+` (tested on Node `v24.12.0`, npm `11.6.2`)
- **Google Gemini API Key** *(required for live extraction & Vision OCR; optional if running in `EXTRACTION_MODE=mock` offline demo mode)*:
  - Obtain a key from [Google AI Studio](https://aistudio.google.com/apikey).
- **Optional Local OCR:** `tesseract` binary on `PATH` (if absent, Gemini Vision OCR handles scanned pages automatically in live mode).

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/joepro0118-create/Umsprout-GOG.git
cd Umsprout-GOG
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (`.env` is gitignored and never committed):

```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your Gemini API key:

```dotenv
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3-flash-preview
```

### 3. Start the Backend Server (FastAPI)

From the repository root:

```powershell
# Live Gemini extraction + Gemini Vision OCR (default)
py -m uvicorn api:app --reload --port 8000

# Offline deterministic fixture mode (instant demo without external API latency)
$env:EXTRACTION_MODE="mock"; py -m uvicorn api:app --reload --port 8000
```

Interactive OpenAPI docs are available at `http://localhost:8000/docs`.

### 4. Install & Start the Frontend Application (Next.js)

Open a **second terminal**:

```powershell
cd frontend
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser.

### 5. Judge Evaluation Walkthrough (Under 3 Minutes)

1. **Inspect the Reusable Company Profile:**
   - Click **Company Profile & Library** in the top navigation bar.
   - Review the pre-seeded demo contractor (*Syarikat Kejuruteraan Aman Sdn. Bhd.*): **CIDB G3** (`B04`, `M15`, `CE21`), **MOF** (`220401`, `221001`, `210101`), **Bumiputera = Yes**, **Paid-up Capital = RM 250,000**, and 5 confirmed evidence PDFs.
2. **Upload a Bilingual Tender PDF:**
   - Switch to **Tender Upload & Review** and upload `samples/sample_1_bilingual_jkr_maintenance.pdf`.
   - The app polls until extraction and deterministic matching complete.
3. **Inspect Deterministic `Gap` vs `Rule-checked` Audit Trails:**
   - Notice **`REQ-001` (Gap · Tier B Disqualifying):** `RULE_CIDB_GRADE_THRESHOLD` compares `G3 (rank 3) >= G4 (rank 4) -> False` with linked evidence `CIDB_PPK_G3_Aman_2024_2027.pdf`.
   - Click **`Page 1 ↗`** on any card to open the source tender PDF directly to the cited page.
   - Notice **Paid-up Capital (`RM 250,000 >= RM 150,000`)**, **CIDB `B04`/`M15`**, **MOF `220401`/`221001`**, **Validity Date**, and **Bumiputera** all resolve as **`Rule-checked`**.
   - In live mode, verify **Page 4 (scanned image)** was transcribed via Gemini Vision OCR and extracted the **OSHA/DOSH** Tier B requirement.
4. **Test the Evidence-Enforced `Needs Review` Guardrail:**
   - On a `Needs Review` item (e.g., compulsory site briefing), click **Mark as satisfied**.
   - Try clicking **Confirm & Attach Evidence** *without* selecting a file → rejected, status remains `Needs Review`.
   - Attach any PDF file + enter your name → status updates to **`User-evidenced`** (dashed blue badge) with who, timestamp, and clickable `EVID-xxxxxxxx` reference.
5. **Export the PDF Readiness Report:**
   - Click **Export PDF Report** to download `TenderMate_Report_<id>.pdf` and verify the separated **Rule-checked**, **User-evidenced**, **Gaps**, and **Needs Review** sections plus the disclaimer.

---

## Architecture & System Design

### Directory Structure

```text
Umsprout/
├── api.py                             # FastAPI backend, SQLite persistence, upload & resolve guardrails
├── extract_requirements.py            # Phase 1 CLI & Gemini two-pass extraction + Vision OCR fallback
├── schema.py                          # Pydantic v2 models, citation verifier, deduplicator, unreadable-page safeguard
├── rules_engine.py                    # Phase 2 deterministic eligibility rules + CLI runner
├── report.py                          # ReportLab server-side A4 PDF readiness report generator
├── UI_HANDOFF.md                      # Complete frontend handoff specification for UI redesign
├── data/
│   └── company_profile.json           # Editable pre-seeded demo company profile & document library
├── samples/
│   ├── sample_1_bilingual_jkr_maintenance.pdf   # 4-page bilingual tender (tables + scanned Page 4)
│   ├── sample_2_english_it_facility.pdf         # 2-page English M&E/IT tender
│   └── sample_3_bm_construction_edge_cases.pdf  # 2-page BM edge cases (conflicting dates, conditional clauses)
├── scripts/
│   ├── generate_sample_tenders.py     # Generates synthetic test tender PDFs
│   └── inspect_page.py                # Diagnostic tool to inspect raw text layer & live OCR on any page
├── tests/
│   ├── test_phase1_extraction.py      # 9 tests: PDF/OCR detection, JSON rejection, citation checks, safeguards
│   ├── test_phase2_rules_engine.py    # 12 tests: all 6 deterministic rules, G3-vs-G4 gap, resolution guardrails
│   └── test_phase3_api.py             # 5 tests: FastAPI uploads, 400/409/415 enforcement, PDF report content
├── frontend/
│   ├── app/
│   │   ├── globals.css                # Tailwind v4 styles
│   │   ├── layout.tsx                 # Root layout (Geist + Geist Mono fonts)
│   │   └── page.tsx                   # Main workspace (upload, analyses list, summary, filters, tabs)
│   ├── components/
│   │   ├── CompanyProfileView.tsx     # Read-only Company Profile & Document Library view
│   │   └── RequirementCard.tsx        # Atomic requirement card, audit trail, & evidence upload form
│   ├── lib/
│   │   └── types.ts                   # Shared TypeScript interfaces, API_BASE, DISCLAIMER, STATUS_LABELS
│   ├── next.config.ts                 # Next.js 16 + @tailwindcss/turbopack configuration
│   └── package.json                   # Frontend dependencies & scripts
├── .env.example                       # Environment variable template (no real keys)
├── .gitignore                         # Excludes .env, *.db, data/uploads/, node_modules/, .next/
└── README.md                          # Project documentation
```

### End-to-End Processing Pipeline

```text
Uploaded Tender PDF (BM / English / Bilingual / Scanned Pages)
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. PDF Text & OCR Extraction (extract_requirements.py / PyMuPDF)           │
│    - Validates .pdf + %PDF header (max 25 MB)                              │
│    - Extracts page-labelled text; detects scanned/low-text pages (<60 chr) │
│    - OCR fallback: Tesseract CLI -> Gemini Vision OCR -> low-quality flag  │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ Page-labelled text inside <UNTRUSTED_TENDER_DOCUMENT>
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 2. Two-Pass Atomic LLM Extraction (Gemini + schema.py)                     │
│    - Pass 1: Extracts atomic conditions, verbatim BM/EN text, page cites   │
│    - Pass 2: Coverage audit for missed tables, checklists & compound rules │
│    - Post-validation: Rejects malformed JSON, verifies page excerpts,      │
│      deduplicates, and emits UNREADABLE_PAGE_SAFEGUARD for unreadable pgs  │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ Validated ExtractionOutput JSON
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 3. Deterministic Eligibility Rules Engine (rules_engine.py — Zero LLM)     │
│    - Compares structured conditions against confirmed company_profile.json │
│    - 6 rules: CIDB grade, CIDB category, MOF code, status flags,           │
│      date validity, paid-up capital numeric threshold                      │
│    - Persists rule_id, inputs, comparison, citation & evidence/missing     │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ ComplianceAssessment
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 4. Human Review & PDF Readiness Report (api.py, report.py, frontend/)      │
│    - Needs Review items require PDF evidence upload + attester name        │
│    - Visually distinguishes Rule-checked vs User-evidenced                 │
│    - Exports ReportLab A4 PDF with audit trails & mandatory disclaimer     │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```text
Next.js UI (:3000)                    FastAPI Backend (:8000)                 Gemini API
       │                                         │                                 │
       │── 1. GET /api/company ─────────────────>│ (reads company_profile.json)    │
       │<── CompanyProfile + Document Library ───│                                 │
       │                                         │                                 │
       │── 2. POST /api/tenders (PDF) ──────────>│                                 │
       │<── 202 { id, status: "processing" } ────│── [BackgroundTask]              │
       │                                         │── PyMuPDF text + Vision OCR ───>│
       │                                         │── Pass 1 + Pass 2 extraction ──>│
       │                                         │<── Structured JSON ─────────────│
       │                                         │── Validate citations & store DB │
       │                                         │                                 │
       │── 3. Poll GET /api/tenders/{id} ───────>│                                 │
       │<── extraction + deterministic results ──│ (rules_engine.py — local Python)│
       │                                         │                                 │
       │── 4. POST .../resolve (PDF + who) ─────>│── Validate PDF & needs_review   │
       │<── Updated User-evidenced result ───────│── Persist EVID-xxxx in SQLite   │
       │                                         │                                 │
       │── 5. GET /api/tenders/{id}/report.pdf ─>│── Generate ReportLab PDF        │
       │<── Download TenderMate_Report_{id}.pdf ─│                                 │
```

### Core Subsystems
- **Extraction & Citation Validator (`extract_requirements.py`, `schema.py`):** Wraps untrusted PDF text in `<UNTRUSTED_TENDER_DOCUMENT>` tags for prompt-injection resistance, rejects malformed JSON, verifies that `source_excerpt` appears on `source_page` (flagging `EXCERPT_NOT_VERIFIED_ON_PAGE` or `UNCITED_ITEM`), and guarantees unreadable pages produce a `review_required=True` safeguard.
- **Deterministic Rules Engine (`rules_engine.py`):** Plain, unit-tested Python functions with zero LLM involvement. Enforces PRD Section 5.9 (`user_confirmed=False` → `needs_review`) and PRD Section 5.13 (`resolve_needs_review_with_evidence` refuses overrides on `gap` or `matched_rule_verified` and refuses status changes without evidence).
- **Backend & Report (`api.py`, `report.py`):** Stores tender metadata, extracted JSON, and user resolutions in SQLite (`data/tendermate.db`) and uploaded PDFs under `data/uploads/`. Recomputes deterministic rules on read so profile edits immediately reflect in assessments.

---

## Deterministic Rules Engine & Status Model

### Supported Deterministic Rules

| Rule ID | Function | What It Checks | Missing Evidence / Unconfirmed Behaviour |
|---|---|---|---|
| `RULE_CIDB_GRADE_THRESHOLD` | `check_cidb_grade` | Ranks `G1=1..G7=7`; supports `>=`, `==`, `<=`, `in` (e.g., `G3 >= G4 -> False -> Gap`) | Unconfirmed → `needs_review`; missing grade or certificate → `gap` + `missing_evidence_marker` |
| `RULE_CIDB_CATEGORY_MEMBERSHIP` | `check_cidb_category` | Case-insensitive membership of required code(s) (`B04`, `M15`, `CE21`, etc.) | Unconfirmed → `needs_review`; missing certificate → `gap` + `missing_evidence_marker` |
| `RULE_MOF_CODE_MEMBERSHIP` | `check_mof_code` | Membership of required 6-digit MOF field code(s) (`220401`, `221001`, etc.) | Unconfirmed → `needs_review`; missing certificate → `gap` + `missing_evidence_marker` |
| `RULE_STATUS_FLAG` | `check_status_flag` | Boolean registration/status checks (`mof_active`, `cidb_active`, `bumiputera_status`, `ssm_active`) | Unconfirmed → `needs_review`; missing value or evidence → `gap` + `missing_evidence_marker` |
| `RULE_DATE_VALIDITY` | `check_date_validity` | Point-in-time validity (`valid_from <= reference_date <= valid_until`) against tender closing date | Missing tender date or unconfirmed → `needs_review`; expired or missing evidence → `gap` |
| `RULE_PAID_UP_CAPITAL_THRESHOLD` | `check_paid_up_capital` | Numeric RM threshold (`paid_up_capital_rm >= required`); supports `"paid-up capital / net worth"` OR logic | Shortfall with unknown alternative net worth → `needs_review`; confirmed shortfall → `gap` |

### Status Enums vs UI / PDF Labels

| API / DB Enum (`result.status`) | UI & PDF Display Label | Meaning & Permitted Transitions |
|---|---|---|
| `matched_rule_verified` | **Rule-checked** | Deterministic rule passed using confirmed company data + linked evidence. Cannot be overridden. |
| `matched_user_evidenced` | **User-evidenced** | Non-structured `Needs Review` item resolved by user **with uploaded PDF evidence** + name + timestamp. Visibly distinct from `Rule-checked`. |
| `gap` | **Gap** | Deterministic rule failed or required evidence is missing. Cannot be overridden (`HTTP 409`). |
| `needs_review` | **Needs Review** | Non-structured, conditional, ambiguous, unconfirmed, or low-quality OCR item. Eligible for **Mark as satisfied** (PDF upload required). |
| `not_applicable` | **Not Applicable** | Reserved for explicitly confirmed inapplicable clauses. |

---

## API Reference

Full JSON schemas and real example responses are documented in **[UI_HANDOFF.md](UI_HANDOFF.md)**.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/company` | Returns read-only company profile and reusable document library from `data/company_profile.json` |
| `GET` | `/api/tenders` | Lists all uploaded tender analyses (`newest first`) |
| `POST` | `/api/tenders` | Accepts `multipart/form-data` (`file` PDF + optional `title`); returns `202` and starts background extraction |
| `GET` | `/api/tenders/{tender_id}` | Returns tender metadata, `extraction`, and recomputed `assessment` (with applied user resolutions) |
| `GET` | `/api/tenders/{tender_id}/pdf` | Serves original tender PDF inline (`application/pdf`) for `#page=N` citation links |
| `POST` | `/api/tenders/{tender_id}/requirements/{requirement_id}/resolve` | Marks a `needs_review` item as `matched_user_evidenced`; requires PDF `file` + `attested_by` (`400` if missing, `409` if not `needs_review`) |
| `GET` | `/api/tenders/{tender_id}/evidence/{evidence_id}` | Serves user-uploaded evidence PDF inline |
| `GET` | `/api/tenders/{tender_id}/report.pdf` | Generates and downloads the ReportLab PDF readiness report (`attachment`) |

---

## Environment Variables & CLI Tools

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required in live mode)* | Google AI Studio API key for Gemini extraction & Vision OCR |
| `GEMINI_MODEL` | `gemini-3-flash-preview` | Primary Gemini model (falls back to `gemini-3.1-flash-lite`, `gemini-4-hydrogen` on 404/500/503/504) |
| `EXTRACTION_MODE` | `live` | Set to `mock` for instant offline deterministic fixture extraction |
| `TENDERMATE_DB` | `data/tendermate.db` | SQLite database path |
| `TENDERMATE_UPLOADS` | `data/uploads` | Local directory for uploaded tender & evidence PDFs |
| `TENDERMATE_PROFILE` | `data/company_profile.json` | Seed company profile JSON path |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL used by the Next.js frontend |

### Standalone CLI Utilities

```powershell
# Phase 1: Extract atomic requirements from a tender PDF
py extract_requirements.py samples/sample_1_bilingual_jkr_maintenance.pdf -o requirements.json

# Phase 1 (offline fixture mode without API key)
py extract_requirements.py samples/sample_1_bilingual_jkr_maintenance.pdf --mock-llm -o requirements.json

# Phase 2: Run deterministic rules engine on extracted requirements
py rules_engine.py requirements.json data/company_profile.json -o compliance_results.json

# Inspect raw text layer & test live Gemini Vision OCR on a specific PDF page
py scripts/inspect_page.py samples/sample_1_bilingual_jkr_maintenance.pdf 4 --live-ocr

# Regenerate synthetic test tender PDFs in /samples
py scripts/generate_sample_tenders.py
```

---

## Testing Guide

Run the full automated test suite (`26` tests across all 3 phases — runs completely offline in ~2.5s):

```powershell
py -m pytest -v
```

1. **[tests/test_phase1_extraction.py](tests/test_phase1_extraction.py) (`9` tests):**
   - PDF page text extraction & scanned/image-only page detection on `sample_1_bilingual_jkr_maintenance.pdf`
   - Non-PDF rejection, malformed JSON rejection (parser + mocked Gemini client), blank field rejection
   - Citation verifier (`UNCITED_ITEM`, `EXCERPT_NOT_VERIFIED_ON_PAGE`), `UNREADABLE_PAGE_SAFEGUARD`, Pass 1/Pass 2 deduplication, and end-to-end CLI output validation
2. **[tests/test_phase2_rules_engine.py](tests/test_phase2_rules_engine.py) (`12` tests):**
   - Match, gap, missing-evidence, and unconfirmed cases for all 6 deterministic rules (including the **G3-vs-G4 CIDB grade gap** and paid-up capital OR net worth edge cases)
   - `resolve_needs_review_with_evidence` guardrails (no evidence → unchanged; cannot override deterministic `gap`)
   - End-to-end evaluation against `requirements.json` and `data/company_profile.json`
3. **[tests/test_phase3_api.py](tests/test_phase3_api.py) (`5` tests):**
   - `GET /api/company`, non-PDF upload rejection (`415` / `400`), `POST .../resolve` without file (`400`), without name (`400`), with file + name (`200` → `matched_user_evidenced`), gap override rejection (`409`), and ReportLab PDF content verification (disclaimer + `"Rule-checked"` label)

Verify the Next.js production build:
```powershell
cd frontend
npm run build
```

---

## Troubleshooting

1. **`Python was not found` on Windows:**
   - The `python` alias points to the Microsoft Store stub. Use `py` (e.g., `py -m uvicorn api:app --reload --port 8000` and `py -m pytest -v`).
2. **Gemini `503 UNAVAILABLE` or `504 DEADLINE_EXCEEDED` during live demos:**
   - `extract_requirements.py` enforces a 45-second per-call timeout and automatically falls back across `gemini-3-flash-preview` → `gemini-3.1-flash-lite` → `gemini-4-hydrogen`.
   - For reliable live pitching, pre-upload your demo tenders beforehand (results are persisted in `data/tendermate.db`) or set `$env:EXTRACTION_MODE="mock"` as an offline fallback.
3. **Frontend shows `Cannot reach FastAPI backend at http://localhost:8000`:**
   - Ensure `py -m uvicorn api:app --reload --port 8000` is running in Terminal 1.
4. **Scanned page flagged `ocr_unavailable` in offline mode:**
   - Local `tesseract` is optional. In live mode (`GEMINI_API_KEY` set), **Gemini Vision OCR** automatically transcribes scanned pages.

---

## Privacy, Security & Anti-Hallucination Guardrails

- **No LLM Pass/Fail:** Gemini is strictly restricted to requirement extraction, Vision OCR, and plain-language explanation. All eligibility decisions come from deterministic code in `rules_engine.py`.
- **Prompt-Injection Defense:** Tender PDF content is wrapped inside `<UNTRUSTED_TENDER_DOCUMENT>` boundaries with explicit system instructions treating document text as data, never commands.
- **Hallucination & Citation Verification:** Malformed JSON is rejected; uncited requirements or excerpts not found on the cited page are flagged (`UNCITED_ITEM` / `EXCERPT_NOT_VERIFIED_ON_PAGE`) and forced into `Needs Review`.
- **Unreadable Page Safeguard:** Any page yielding `< 50` characters post-OCR emits an explicit `UNREADABLE_PAGE_SAFEGUARD` item so unreadable pages are never silently treated as cleared.
- **Secret Hygiene:** `.env` is excluded via `.gitignore`; API keys are read from environment variables and never committed.

---

## Known Limitations & Scope

- **Retroactive Rule Recomputation (Demo Trade-Off):** `GET /api/tenders/{id}` and `GET /api/tenders/{id}/report.pdf` re-run deterministic rules against the *current* `data/company_profile.json` on each read. While convenient for demoing profile edits without re-running the LLM, a production audit trail should snapshot the company profile at evaluation time so historical reports remain immutable.
- **Synthetic Test Samples vs Real Tenders:** `samples/sample_1..3` are synthetic Malaysian tender fixtures for development testing. Proving PRD Section 14.3 requires running on 2–3 real Malaysian tender PDFs.
- **Explicitly Out of MVP Scope:** Proposal drafting, DOCX/XLSX input or export, automated expiry reminder dashboards, multi-company workspaces, team roles/permissions, tender discovery, and ePerolehan integration.
