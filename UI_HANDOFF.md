# TenderMate — Frontend UI Handoff Report

> **Purpose:** Complete technical and functional handoff so a designer/developer can redesign the TenderMate frontend without reading the codebase. All facts, JSON examples, enums, and data below come directly from the current codebase (`api.py`, `schema.py`, `rules_engine.py`, `report.py`, `data/company_profile.json`, `samples/live_sample_1.json`, `samples/live_compliance_1.json`, and `frontend/`).

---

## 1. Stack and Structure

### Frontend Stack
- **Framework:** Next.js `16.4.6` (App Router, Turbopack) + React `19.3.0` + React DOM `19.3.0`
- **Language:** TypeScript `^5` (`strict: true`, path alias `@/*` -> `./*`)
- **Styling:** Tailwind CSS `4.3.3` via `@tailwindcss/turbopack` (`4.3.3`), configured in `frontend/next.config.ts` and imported with `@import "tailwindcss";` in `frontend/app/globals.css`
- **Custom colours / design tokens:** None beyond default Tailwind v4 palette (`slate`, `emerald`, `blue`, `red`, `rose`, `amber`) and two CSS variables in `frontend/app/globals.css`:
  - `--background: #f8fafc` (`bg-slate-50`)
  - `--foreground: #0f172a` (`text-slate-900`)
  - Light mode only (dark mode media query was removed).
- **Component libraries:** None (pure HTML elements + Tailwind utility classes).
- **Icon set:** None (uses inline Unicode characters only: `✓`, `📎`, `✕`, `!`, `↗`, `→`, `·`).
- **Fonts:** Google Fonts loaded via `next/font/google` in `frontend/app/layout.tsx`:
  - `Geist` (`--font-geist-sans`) — primary UI font
  - `Geist_Mono` (`--font-geist-mono`) — IDs, codes, filenames, dates, rule expressions

### `frontend/` File Tree (excluding `node_modules/` and `.next/`)
```text
frontend/
├── .gitignore                        # Standard Next.js gitignore
├── AGENTS.md                         # Auto-generated Next.js 16 agent notice
├── README.md                         # Default create-next-app README (unused)
├── next-env.d.ts                     # Next.js TypeScript ambient declarations
├── next.config.ts                    # Next.js config enabling @tailwindcss/turbopack CSS loader
├── package.json                      # Dependencies & scripts (dev, build, start)
├── package-lock.json                 # Locked npm dependency tree
├── tsconfig.json                     # TypeScript config (strict, @/* alias)
├── app/
│   ├── favicon.ico                   # Default Next.js favicon
│   ├── globals.css                   # Tailwind v4 import + body background/foreground/font
│   ├── layout.tsx                    # Root HTML layout loading Geist + Geist_Mono fonts & metadata
│   └── page.tsx                      # Single-page workspace: header, disclaimer, tab switcher, upload, tender review, filters
├── components/
│   ├── CompanyProfileView.tsx        # Read-only Company Profile cards + Document Library table
│   └── RequirementCard.tsx           # Atomic requirement card, badges, audit trail, and "Mark as satisfied" upload form
├── lib/
│   └── types.ts                      # API_BASE, DISCLAIMER, STATUS_LABELS, TypeScript interfaces, formatDateTime helper
└── public/                           # Default create-next-app SVGs (file.svg, globe.svg, next.svg, vercel.svg, window.svg — unused)
```

### Frontend-to-Backend Communication
- **Base URL:** `process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000"` (`frontend/lib/types.ts`).
- **Transport:** Native browser `fetch()` directly to the FastAPI backend (`http://localhost:8000`). No Next.js API routes, no SWR/React Query, no WebSockets/SSE.
- **CORS:** FastAPI allows `http://localhost:3000` and `http://127.0.0.1:3000` (configurable via `CORS_ORIGINS` env var).
- **Polling:** Yes. While a selected tender has `tender.status === "processing"`, `page.tsx` polls `GET /api/tenders/{id}` every **2,000 ms** (`setTimeout`) until status becomes `"completed"` or `"failed"`, then refreshes `GET /api/tenders`.
- **Direct browser links (non-fetch):**
  - Source PDF & page citations: `<a href="${API_BASE}/api/tenders/${id}/pdf#page=${page}" target="_blank" rel="noopener noreferrer">`
  - Uploaded user evidence PDF: `<a href="${API_BASE}/api/tenders/${id}/evidence/${evidenceId}" target="_blank" rel="noopener noreferrer">`
  - PDF readiness report download: `<a href="${API_BASE}/api/tenders/${id}/report.pdf">`

---

## 2. API Contract

All endpoints live on the FastAPI backend (`api.py`).

### 1. `GET /api/company`
- **Request:** No body or query params.
- **Response (`200 OK`, `application/json`) — real payload from `data/company_profile.json`:**
```json
{
  "company_id": "COMP-001",
  "name": "Syarikat Kejuruteraan Aman Sdn. Bhd.",
  "registration_number": "201901024812 (1334141-K)",
  "confirmed_at": "2026-11-18T09:00:00+08:00",
  "contact": {
    "contact_person": "Ahmad Farhan bin Ismail",
    "email": "tender@kejuruteraanaman.com.my",
    "phone": "+603-7982 4410",
    "state": "Wilayah Persekutuan Kuala Lumpur"
  },
  "cidb": {
    "active": true,
    "registration_number": "0120190815-WP042188",
    "grade": "G3",
    "categories": ["B04", "M15", "CE21"],
    "valid_from": "2024-06-01",
    "valid_until": "2027-05-31",
    "evidence_document_id": "DOC-CIDB-001",
    "user_confirmed": true
  },
  "mof": {
    "active": true,
    "registration_number": "357-02284190",
    "codes": ["220401", "221001", "210101"],
    "valid_from": "2025-01-15",
    "valid_until": "2028-01-14",
    "evidence_document_id": "DOC-MOF-001",
    "user_confirmed": true
  },
  "bumiputera": {
    "status": true,
    "valid_from": "2025-01-15",
    "valid_until": "2028-01-14",
    "evidence_document_id": "DOC-BUMI-001",
    "user_confirmed": true
  },
  "status_flags": {
    "ssm_active": {
      "value": true,
      "evidence_document_id": "DOC-SSM-001",
      "user_confirmed": true
    }
  },
  "financials": {
    "paid_up_capital_rm": 250000.0,
    "net_worth_rm": null,
    "as_of": "2026-06-30",
    "evidence_document_id": "DOC-PUC-001",
    "user_confirmed": true
  },
  "documents": [
    {
      "id": "DOC-CIDB-001",
      "document_type": "cidb_certificate",
      "title": "Sijil Perakuan Pendaftaran Kontraktor (PPK) CIDB - Gred G3",
      "filename": "CIDB_PPK_G3_Aman_2024_2027.pdf",
      "storage_path": "company_docs/CIDB_PPK_G3_Aman_2024_2027.pdf",
      "valid_from": "2024-06-01",
      "valid_until": "2027-05-31",
      "user_confirmed": true,
      "notes": "Confirmed G3 with B04, M15, CE21."
    }
  ]
}
```
*(Note: `documents` contains 5 items in the real seed: `DOC-CIDB-001`, `DOC-MOF-001`, `DOC-BUMI-001`, `DOC-SSM-001`, `DOC-PUC-001`.)*

---

### 2. `POST /api/tenders`
- **Request:** `multipart/form-data`
  - `file` (required): PDF file (`.pdf` extension, `%PDF` magic bytes, max `25 MB`)
  - `title` (optional `string`, defaults to filename stem)
- **Response (`202 Accepted`, `application/json`):**
```json
{
  "id": "TND-450f78bb",
  "status": "processing"
}
```

---

### 3. `GET /api/tenders`
- **Request:** No body or query params. Returns newest first (`ORDER BY created_at DESC`).
- **Response (`200 OK`, `application/json`):**
```json
[
  {
    "id": "TND-450f78bb",
    "title": "JKR Building Maintenance 2026",
    "filename": "sample_1_bilingual_jkr_maintenance.pdf",
    "status": "completed",
    "error": null,
    "created_at": "2026-11-19T16:03:16.643905+00:00",
    "completed_at": "2026-11-19T16:03:16.758496+00:00"
  }
]
```

---

### 4. `GET /api/tenders/{tender_id}`
- **Request:** Path param `tender_id` (e.g., `TND-450f78bb`).
- **Response (`200 OK`, `application/json`):**
  - When `tender.status` is `"processing"` or `"failed"`, `extraction` and `assessment` are both `null`.
  - When `tender.status === "completed"` — **real response trimmed to 3 items (`gap`, `matched_rule_verified`, `matched_user_evidenced`) with every field present:**
```json
{
  "tender": {
    "id": "TND-450f78bb",
    "title": "JKR Building Maintenance 2026",
    "filename": "sample_1_bilingual_jkr_maintenance.pdf",
    "status": "completed",
    "error": null,
    "created_at": "2026-11-19T16:03:16.643905+00:00",
    "completed_at": "2026-11-19T16:03:16.758496+00:00"
  },
  "extraction": {
    "tender_file": "uploads/tenders/TND-450f78bb/sample_1_bilingual_jkr_maintenance.pdf",
    "extracted_at": "2026-11-19T16:03:16.756044+00:00",
    "model_used": "mock-llm-offline",
    "page_count": 4,
    "low_quality_pages": [4],
    "pages_info": [
      {
        "page_number": 1,
        "char_count": 685,
        "image_count": 0,
        "extraction_method": "text",
        "low_quality": false,
        "quality_notes": null
      },
      {
        "page_number": 4,
        "char_count": 0,
        "image_count": 1,
        "extraction_method": "ocr_unavailable",
        "low_quality": true,
        "quality_notes": "Scanned or low-text page (0 chars); Tesseract not available and LLM OCR unavailable/disabled."
      }
    ],
    "summary": {
      "total_requirements": 16,
      "tier_a_mandatory_count": 15,
      "tier_b_disqualifying_count": 14,
      "informational_count": 0,
      "review_required_count": 7,
      "initial_pass_count": 10,
      "coverage_pass_added_count": 5,
      "uncited_or_flagged_count": 1,
      "low_quality_page_count": 1
    },
    "requirements": [
      {
        "id": "REQ-001",
        "original_text": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
        "language": "ms",
        "mandatory_status": "mandatory",
        "category": "cidb_registration",
        "is_disqualifying": true,
        "structured_condition": {
          "rule_type": "cidb_grade",
          "field": "cidb_grade",
          "operator": ">=",
          "value": "G4",
          "reference_date": null
        },
        "explanation": "Contractor must hold CIDB Grade G4 or higher.",
        "source_page": 1,
        "source_excerpt": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
        "confidence": "high",
        "review_required": false,
        "extraction_pass": "initial",
        "validation_flags": []
      },
      {
        "id": "REQ-002",
        "original_text": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
        "language": "ms",
        "mandatory_status": "mandatory",
        "category": "cidb_registration",
        "is_disqualifying": true,
        "structured_condition": {
          "rule_type": "cidb_category",
          "field": "cidb_categories",
          "operator": "contains",
          "value": "B04",
          "reference_date": null
        },
        "explanation": "Contractor must hold CIDB specialization/category B04.",
        "source_page": 1,
        "source_excerpt": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
        "confidence": "high",
        "review_required": false,
        "extraction_pass": "initial",
        "validation_flags": []
      },
      {
        "id": "REQ-007",
        "original_text": "Taklimat Tender & Lawatan Tapak DIWAJIBKAN pada 25 November 2026 jam 10.00 pagi di Pejabat JKR Wilayah Persekutuan.",
        "language": "ms",
        "mandatory_status": "mandatory",
        "category": "site_briefing",
        "is_disqualifying": true,
        "structured_condition": {
          "rule_type": "non_structured",
          "field": "site_briefing_attendance",
          "operator": "requires_evidence",
          "value": "site_briefing_attendance_slip",
          "reference_date": null
        },
        "explanation": "Compulsory tender briefing / site visit attendance requires uploaded proof.",
        "source_page": 2,
        "source_excerpt": "Taklimat Tender & Lawatan Tapak DIWAJIBKAN pada 25 November 2026 jam 10.00 pagi di Pejabat JKR Wilayah Persekutuan.",
        "confidence": "high",
        "review_required": true,
        "extraction_pass": "initial",
        "validation_flags": []
      }
    ]
  },
  "assessment": {
    "tender_file": "uploads/tenders/TND-450f78bb/sample_1_bilingual_jkr_maintenance.pdf",
    "company_id": "COMP-001",
    "company_name": "Syarikat Kejuruteraan Aman Sdn. Bhd.",
    "evaluated_at": "2026-11-19T16:03:16.789725+00:00",
    "summary": {
      "total_requirements": 16,
      "matched_rule_verified": 8,
      "matched_user_evidenced": 1,
      "gap": 1,
      "needs_review": 6,
      "not_applicable": 0,
      "disqualifying_gaps": 1
    },
    "results": [
      {
        "requirement_id": "REQ-001",
        "status": "gap",
        "is_disqualifying": true,
        "rule_id": "RULE_CIDB_GRADE_THRESHOLD",
        "inputs": {
          "company_cidb_grade": "G3",
          "required_cidb_grade": "G4",
          "operator": ">=",
          "user_confirmed": true
        },
        "comparison": {
          "operator": ">=",
          "company_grade": "G3",
          "company_rank": 3,
          "required_grade": "G4",
          "required_rank": 4,
          "passed": false,
          "expression": "G3 (rank 3) >= G4 (rank 4) -> False"
        },
        "tender_condition": {
          "original_text": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
          "language": "ms",
          "category": "cidb_registration",
          "mandatory_status": "mandatory",
          "source_page": 1,
          "source_excerpt": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
          "structured_condition": {
            "rule_type": "cidb_grade",
            "field": "cidb_grade",
            "operator": ">=",
            "value": "G4",
            "reference_date": null
          }
        },
        "company_evidence": {
          "document_id": "DOC-CIDB-001",
          "document_type": "cidb_certificate",
          "title": "Sijil Perakuan Pendaftaran Kontraktor (PPK) CIDB - Gred G3",
          "filename": "CIDB_PPK_G3_Aman_2024_2027.pdf",
          "storage_path": "company_docs/CIDB_PPK_G3_Aman_2024_2027.pdf",
          "valid_from": "2024-06-01",
          "valid_until": "2027-05-31",
          "user_confirmed": true
        },
        "missing_evidence_marker": null,
        "user_resolution": null,
        "explanation": "Gap: Company CIDB grade G3 does not satisfy tender requirement >= G4."
      },
      {
        "requirement_id": "REQ-002",
        "status": "matched_rule_verified",
        "is_disqualifying": true,
        "rule_id": "RULE_CIDB_CATEGORY_MEMBERSHIP",
        "inputs": {
          "company_cidb_categories": ["B04", "M15", "CE21"],
          "required_cidb_categories": ["B04"],
          "user_confirmed": true
        },
        "comparison": {
          "operator": "contains",
          "required": ["B04"],
          "actual": ["B04", "M15", "CE21"],
          "missing": [],
          "passed": true,
          "expression": "['B04'] subset_of ['B04', 'M15', 'CE21'] -> True"
        },
        "tender_condition": {
          "original_text": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
          "language": "ms",
          "category": "cidb_registration",
          "mandatory_status": "mandatory",
          "source_page": 1,
          "source_excerpt": "Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
          "structured_condition": {
            "rule_type": "cidb_category",
            "field": "cidb_categories",
            "operator": "contains",
            "value": "B04",
            "reference_date": null
          }
        },
        "company_evidence": {
          "document_id": "DOC-CIDB-001",
          "document_type": "cidb_certificate",
          "title": "Sijil Perakuan Pendaftaran Kontraktor (PPK) CIDB - Gred G3",
          "filename": "CIDB_PPK_G3_Aman_2024_2027.pdf",
          "storage_path": "company_docs/CIDB_PPK_G3_Aman_2024_2027.pdf",
          "valid_from": "2024-06-01",
          "valid_until": "2027-05-31",
          "user_confirmed": true
        },
        "missing_evidence_marker": null,
        "user_resolution": null,
        "explanation": "Company holds required CIDB category B04."
      },
      {
        "requirement_id": "REQ-007",
        "status": "matched_user_evidenced",
        "is_disqualifying": true,
        "rule_id": null,
        "inputs": {},
        "comparison": {
          "evaluated": false,
          "reason": "Non-structured, conditional, or review-flagged requirement requires human review and evidence attachment."
        },
        "tender_condition": {
          "original_text": "Taklimat Tender & Lawatan Tapak DIWAJIBKAN pada 25 November 2026 jam 10.00 pagi di Pejabat JKR Wilayah Persekutuan.",
          "language": "ms",
          "category": "site_briefing",
          "mandatory_status": "mandatory",
          "source_page": 2,
          "source_excerpt": "Taklimat Tender & Lawatan Tapak DIWAJIBKAN pada 25 November 2026 jam 10.00 pagi di Pejabat JKR Wilayah Persekutuan.",
          "structured_condition": {
            "rule_type": "non_structured",
            "field": "site_briefing_attendance",
            "operator": "requires_evidence",
            "value": "site_briefing_attendance_slip",
            "reference_date": null
          }
        },
        "company_evidence": null,
        "missing_evidence_marker": null,
        "user_resolution": {
          "evidence_document_id": "EVID-5eda5055",
          "evidence_filename": "Briefing_Slip.pdf",
          "attested_by": "Ahmad Farhan bin Ismail",
          "attested_at": "2026-11-19T16:03:16.778336+00:00",
          "note": "Signed JKR attendance slip"
        },
        "explanation": "User-evidenced match attested by Ahmad Farhan bin Ismail with attached file 'Briefing_Slip.pdf'."
      }
    ]
  }
}
```

---

### 5. `POST /api/tenders/{tender_id}/requirements/{requirement_id}/resolve`
- **Request:** `multipart/form-data`
  - `file` (required): PDF evidence file (`.pdf` + `%PDF` header, max `25 MB`)
  - `attested_by` (required `string`, non-blank)
  - `note` (optional `string`, default `""`)
- **Response (`200 OK`, `application/json`):** Returns the updated `ComplianceResult` object (identical shape to the `REQ-007` item above, with `status: "matched_user_evidenced"` and populated `user_resolution`).

---

### 6. Binary / PDF Endpoints
| Method | Path | Response Content-Type | Headers / Behaviour |
|---|---|---|---|
| `GET` | `/api/tenders/{tender_id}/pdf` | `application/pdf` | `Content-Disposition: inline`. Supports browser `#page=N` fragment links. |
| `GET` | `/api/tenders/{tender_id}/evidence/{evidence_id}` | `application/pdf` | `Content-Disposition: inline`. Opens user-uploaded evidence PDF. |
| `GET` | `/api/tenders/{tender_id}/report.pdf` | `application/pdf` | `Content-Disposition: attachment; filename="TenderMate_Report_{tender_id}.pdf"`. Triggers PDF download. |

---

### 7. Error Responses the UI Must Handle
FastAPI returns JSON `{ "detail": "<message>" }` for all `HTTPException` responses:

| HTTP Status | Trigger | Actual Response Body |
|---|---|---|
| `400` | Upload tender with no file | `{"detail": "Tender document: a PDF file upload is required."}` |
| `400` | Resolve with no evidence file | `{"detail": "Evidence: a PDF file upload is required."}` |
| `400` | Resolve with blank `attested_by` | `{"detail": "Name of the person attesting is required."}` |
| `404` | Unknown tender / requirement / evidence ID | `{"detail": "Tender not found."}` / `"Requirement not found."` / `"Evidence not found."` |
| `409` | Resolve or report while tender not completed | `{"detail": "Tender analysis is not completed."}` |
| `409` | Resolve an item whose status is NOT `needs_review` | `{"detail": "Only Needs Review items can be marked satisfied (current status: gap). Rule-checked results and gaps cannot be overridden."}` |
| `413` | File larger than 25 MB | `{"detail": "Tender document: file exceeds 25 MB limit."}` (or `"Evidence: ..."`) |
| `415` | Non-PDF upload (DOCX/XLSX/image/etc.) | `{"detail": "Tender document: only PDF files are supported in the MVP (DOCX/XLSX/images are not accepted)."}` |
| `500` / network error | Unhandled backend exception or backend offline | FastAPI returns plain text `"Internal Server Error"` (not JSON) on unhandled `500`; network failure throws `TypeError` in `fetch()`. **Note:** Current UI calls `await resp.json()` before checking `resp.ok` on upload/resolve, so a non-JSON `500` falls into the `catch` block and shows `"Network error..."`. |

---

## 3. Data Model

### `ExtractedRequirement` (from `schema.py`)
| Field | Type | Example Value |
|---|---|---|
| `id` | `string` | `"REQ-001"` |
| `original_text` | `string` (non-blank, verbatim BM/EN) | `"Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas..."` |
| `language` | `"ms" \| "en" \| "mixed"` | `"ms"` |
| `mandatory_status` | `"mandatory" \| "conditional" \| "informational"` | `"mandatory"` |
| `category` | `RequirementCategory` (see enum below) | `"cidb_registration"` |
| `is_disqualifying` | `boolean` | `true` (Tier B disqualifying) |
| `structured_condition` | `StructuredCondition \| null` | `{"rule_type": "cidb_grade", "field": "cidb_grade", "operator": ">=", "value": "G4", "reference_date": null}` |
| `explanation` | `string` | `"Contractor must hold CIDB Grade G4 or higher."` |
| `source_page` | `number \| null` (1-based) | `1` |
| `source_excerpt` | `string` | `"Kontraktor hendaklah berdaftar dengan CIDB Gred G4..."` |
| `confidence` | `"high" \| "medium" \| "low"` | `"high"` |
| `review_required` | `boolean` | `false` |
| `extraction_pass` | `"initial" \| "coverage" \| "system_safeguard"` | `"initial"` |
| `validation_flags` | `string[]` | `[]` or `["LOW_QUALITY_SOURCE_PAGE", "UNREADABLE_PAGE_SAFEGUARD"]`, `["UNCITED_ITEM"]`, `["EXCERPT_NOT_VERIFIED_ON_PAGE"]` |

### `ComplianceResult` (from `rules_engine.py`)
| Field | Type | Example / Notes |
|---|---|---|
| `requirement_id` | `string` | `"REQ-001"` (joins to `extraction.requirements[].id`) |
| `status` | `ComplianceStatus` | `"gap"` |
| `is_disqualifying` | `boolean` | `true` |
| `rule_id` | `string \| null` | `"RULE_CIDB_GRADE_THRESHOLD"`, `"RULE_CIDB_CATEGORY_MEMBERSHIP"`, `"RULE_MOF_CODE_MEMBERSHIP"`, `"RULE_STATUS_FLAG"`, `"RULE_DATE_VALIDITY"`, `"RULE_PAID_UP_CAPITAL_THRESHOLD"`, or `null` |
| `inputs` | `Record<string, unknown>` | `{"company_cidb_grade": "G3", "required_cidb_grade": "G4", "operator": ">=", "user_confirmed": true}` |
| `comparison` | `Record<string, unknown>` | `{"operator": ">=", "company_grade": "G3", "company_rank": 3, "required_grade": "G4", "required_rank": 4, "passed": false, "expression": "G3 (rank 3) >= G4 (rank 4) -> False"}` (or `{"evaluated": false, "reason": "..."}`) |
| `tender_condition` | `object` | `{ original_text, language, category, mandatory_status, source_page, source_excerpt, structured_condition }` |
| `company_evidence` | `object \| null` | `{ document_id, document_type, title, filename, storage_path, valid_from, valid_until, user_confirmed }` |
| `missing_evidence_marker` | `object \| null` | `{"missing": true, "expected_document_type": "cidb_certificate", "reason": "Supporting CIDB certificate evidence is missing."}` |
| `user_resolution` | `object \| null` | `{"evidence_document_id": "EVID-5eda5055", "evidence_filename": "Briefing_Slip.pdf", "attested_by": "Ahmad Farhan bin Ismail", "attested_at": "2026-11-19T16:03:16.778336+00:00", "note": "Signed JKR attendance slip"}` |
| `explanation` | `string` | `"Gap: Company CIDB grade G3 does not satisfy tender requirement >= G4."` |

### All Enum Values & UI Meanings
- **`ComplianceStatus` (`result.status`)**:
  - `matched_rule_verified` -> UI & PDF label: **`Rule-checked`** (deterministic rule passed using user-confirmed company data & linked evidence)
  - `matched_user_evidenced` -> UI & PDF label: **`User-evidenced`** (user attestation with uploaded PDF evidence; **must be visually distinct** from Rule-checked)
  - `gap` -> UI & PDF label: **`Gap`** (deterministic rule failed or required evidence missing; cannot be overridden)
  - `needs_review` -> UI & PDF label: **`Needs Review`** (non-structured, conditional, unconfirmed, ambiguous, or unreadable page; eligible for "Mark as satisfied" with PDF upload)
  - `not_applicable` -> UI & PDF label: **`Not Applicable`** (only when explicitly confirmed inapplicable; not currently emitted automatically)
- **`RequirementCategory` (`requirement.category`)**:
  - `mof_registration`, `cidb_registration`, `bumiputera_status`, `site_briefing`, `performance_bond`, `mandatory_documents`, `financial_technical_experience`, `submission_instructions`, `other`
  - UI currently formats these by replacing `_` with space (e.g. `cidb registration`).
- **`MandatoryStatus` (`requirement.mandatory_status`)**:
  - `mandatory`, `conditional`, `informational`
- **`TenderMeta.status` (analysis status)**:
  - `processing` (background extraction running; UI polls every 2s)
  - `completed` (extraction & assessment available; Export PDF enabled)
  - `failed` (extraction threw an exception; `tender.error` displays reason)
- **Tier B (Disqualifying) representation**:
  - Boolean `is_disqualifying: true` on both `ExtractedRequirement` and `ComplianceResult`, plus aggregate count `assessment.summary.disqualifying_gaps` (number of items where `status === "gap" && is_disqualifying === true`).
- **Company Profile & Document Library shape**:
  - Top-level: `company_id`, `name`, `registration_number`, `confirmed_at`, `contact` (`contact_person`, `email`, `phone`, `state`), `cidb`, `mof`, `bumiputera`, `status_flags` (returned by API, not currently rendered in UI), `financials` (`paid_up_capital_rm`, `net_worth_rm`, `as_of`, `evidence_document_id`, `user_confirmed`), and `documents[]` (`id`, `document_type`, `title`, `filename`, `storage_path`, `valid_from`, `valid_until`, `user_confirmed`, `notes`).

---

## 4. Current Screens and Components

The entire app is a single route (`/`) with a top header, persistent disclaimer bar, and a 2-tab switcher (`Tender Upload & Review` | `Company Profile & Library`).

### Header & Disclaimer Banner (`frontend/app/page.tsx`)
- **Shows:** App title `"TenderMate"`, subtitle showing `profile.name` (or fallback `"Malaysian SME Tender Readiness Assistant"`), segmented tab switcher (`bg-slate-100`, active tab `bg-white text-slate-900 shadow-xs`), and a full-width amber disclaimer bar (`bg-amber-50 border-t border-amber-200 text-amber-900 text-xs font-medium text-center`) displaying verbatim:
  `"Preliminary readiness assessment — verify against the official tender documents."`
- **Error banner (global):** If `/api/company` or `/api/tenders` fails on mount, displays a red alert box (`bg-red-50 border-red-200 text-red-800`) telling the user to start `uvicorn`.

### View 1: Tender Upload & Review (`frontend/app/page.tsx`)
1. **Upload Tender PDF card (left 2/3 on `md:` grid):**
   - Data: local form state (`uploadFile`, `uploadTitle`, `uploading`, `uploadError`).
   - Interactive elements: `<input type="file" accept=".pdf,application/pdf">`, optional `<input type="text">` for title, submit button `"Analyze Tender PDF"` (changes to `"Uploading..."` and disables while uploading).
   - States: idle, validation error (`"Select a PDF tender document to upload."`), server error (`data.detail`), uploading.
2. **Analyses list card (right 1/3 on `md:` grid):**
   - Data: `tenders: TenderMeta[]`.
   - Interactive elements: scrollable list (`max-h-36`) of buttons selecting a tender (`selectedId`). Active item is `bg-slate-900 text-white`; inactive is `bg-slate-50 text-slate-800`.
   - States: empty (`"No tenders uploaded yet. Upload a PDF to begin."`), populated.
3. **Active Tender Header & Summary Strip (`detail` non-null):**
   - Shows: tender title, ID, inline PDF link (`{filename} ↗`), page count, extraction `model_used`, `evaluated_at` timestamp, and **`Export PDF Report`** button (`bg-blue-700 text-white`, shown only when `status === "completed"`).
   - States:
     - `processing`: blue info box (`bg-blue-50 border-blue-200 text-blue-800`): `"Extracting requirements and running deterministic checks... This page updates automatically."`
     - `failed`: red error box (`bg-red-50 border-red-200 text-red-800`) showing `detail.tender.error`.
     - `completed` with `low_quality_pages.length > 0`: amber warning box (`bg-amber-50 border-amber-300 text-amber-900`) listing the affected page numbers.
     - `completed` summary strip (5 cards in `grid-cols-2 sm:grid-cols-5`):
       - **Total** (`bg-slate-50 border-slate-200`)
       - **Rule-checked** (`bg-emerald-50 border-emerald-200 text-emerald-700`)
       - **User-evidenced** (`bg-blue-50 border-dashed border-blue-300 text-blue-700`)
       - **Gap (`N` Tier B)** (`bg-red-50 border-red-200 text-red-700`)
       - **Needs Review** (`bg-amber-50 border-amber-200 text-amber-800`)
4. **Filter Bar:**
   - Status filter pills (`All`, `Gap`, `Needs Review`, `Rule-checked`, `User-evidenced` — note: `Not Applicable` has no filter pill).
   - Checkbox: `"Tier B disqualifying only"`.
5. **Requirement Review List (`RequirementCard.tsx`):**
   - Empty filter state: `"No requirements match the current filter."`
   - Each card has a 4px left accent border (`border-l-red-500` for Gap, `border-l-emerald-500` for Rule-checked, `border-l-blue-500` for User-evidenced, `border-l-amber-400` for Needs Review).
   - **Header row:** `REQ-xxx` mono ID, clickable `Page N ↗` link (or red `Uncited` badge if `source_page === null`), category tag (`bg-slate-100 text-slate-600`), **`Tier B · Disqualifying`** badge (`bg-rose-100 text-rose-800 ring-1 ring-rose-300`), and status badge:
     - `Rule-checked`: solid `bg-emerald-600 text-white` (`✓ Rule-checked`)
     - `User-evidenced`: dashed outline `border border-dashed border-blue-600 bg-blue-50 text-blue-800` (`📎 User-evidenced`)
     - `Gap`: solid `bg-red-600 text-white` (`✕ Gap`)
     - `Needs Review`: soft `bg-amber-100 text-amber-900 ring-1 ring-amber-300` (`! Needs Review`)
     - `Not Applicable`: `bg-slate-100 text-slate-600`
   - **Body:** Quoted `original_text` (verbatim BM/EN), `requirement.explanation`, and amber `Extraction flags: ...` line if `validation_flags` is non-empty.
   - **Audit trail box (`bg-slate-50 border-slate-200`):**
     - `Rule-checked` / `Gap`: shows `Rule` (`rule_id`), `Comparison` (`comparison.expression || comparison.reason`), `Company evidence` (`title (document_id · filename)`) OR red bold `MISSING EVIDENCE — {reason}`, plus `result.explanation`.
     - `User-evidenced`: shows `"User attestation with attached evidence (not rule-verified)"`, clickable evidence reference link (`{evidence_document_id} — {evidence_filename} ↗`), `Attested by` + `When`, and optional `Note`.
     - `Needs Review`: shows `result.explanation` + `"Mark as satisfied"` toggle button (`bg-slate-900 text-white`).
   - **Inline "Mark as satisfied" Form (expanded inside Needs Review card):**
     - Required PDF `<input type="file" accept=".pdf,application/pdf">`, required `Attested by` text input (pre-filled with `profile.contact.contact_person` or `"Tender Executive"`), optional `Note` text input, inline red error message box, and `"Confirm & Attach Evidence"` button (`bg-blue-700 text-white`).

### View 2: Company Profile & Document Library (`frontend/components/CompanyProfileView.tsx`)
- **Shows:** Read-only company header (name, reg no., ID, `confirmed_at`, note `"Edit via data/company_profile.json"`), 2x2 grid of credential cards (**CIDB Registration**, **MOF Registration**, **Bumiputera Status**, **Financials (Paid-up Capital)** — each with a green `User-confirmed` or amber `Unconfirmed` pill), and a read-only **Company Document Library** table (`Ref ID`, `Document` title + mono filename, `Type`, `Validity`, `Confirmation`).
- **Interactive elements:** None (purely read-only).
- **States:** Loading (`"Loading company profile..."` in `page.tsx`), populated.

---

## 5. Behaviour and Rules the UI Must Respect

1. **"Mark as satisfied" eligibility & guardrails:**
   - **Allowed ONLY on `needs_review`.**
   - **`matched_rule_verified`, `matched_user_evidenced`, `gap`, and `not_applicable`** MUST NOT be overridable; calling `/resolve` on them returns HTTP `409`.
   - **No file upload = no status change.** Both client validation and server (`400`) reject resolving without an attached PDF file (`.pdf` + `%PDF` header) and a non-blank `attested_by` name.
   - Resolving must record and display **who** (`attested_by`), **when** (`attested_at`), and **evidence reference** (`evidence_document_id` + `evidence_filename`).
2. **Processing & failed states:**
   - Upload returns `202` immediately (`status: "processing"`). UI must poll `GET /api/tenders/{id}` until `"completed"` or `"failed"`.
   - While `"processing"` or `"failed"`, `extraction` and `assessment` are `null`, and Export PDF is hidden/disabled (`409` if called).
   - On `"failed"`, UI must surface `tender.error` verbatim and never pretend extraction succeeded.
3. **Page citations & PDF links:**
   - Source-page citations link to `${API_BASE}/api/tenders/${tenderId}/pdf#page=${source_page}` and open in a **new tab** (`target="_blank" rel="noopener noreferrer"`). Backend serves with `Content-Disposition: inline`.
   - If `source_page` is `null`, display an `"Uncited"` warning instead of a broken link.
4. **Low-quality / OCR pages:**
   - If `extraction.low_quality_pages` is non-empty, display a prominent warning banner listing the page numbers.
   - Any requirement with `validation_flags` (e.g. `LOW_QUALITY_SOURCE_PAGE`, `UNREADABLE_PAGE_SAFEGUARD`, `UNCITED_ITEM`, `EXCERPT_NOT_VERIFIED_ON_PAGE`) must surface those flags visibly.
5. **Verbatim required text & labels:**
   - Disclaimer (must appear verbatim in UI and PDF):
     **`Preliminary readiness assessment — verify against the official tender documents.`**
   - Status labels (API enum stays `matched_rule_verified` / `matched_user_evidenced`):
     - `matched_rule_verified` -> **`Rule-checked`**
     - `matched_user_evidenced` -> **`User-evidenced`** (and visually distinct from `Rule-checked`, clearly indicated as user attestation, not rule-verified)
     - `gap` -> **`Gap`**
     - `needs_review` -> **`Needs Review`**
     - `not_applicable` -> **`Not Applicable`**
   - `original_text` must **never** be translated or paraphrased by the UI — render verbatim in its original BM/English/mixed language.

---

## 6. Real Demo Data

### Live Gemini Run on `samples/sample_1_bilingual_jkr_maintenance.pdf` (`samples/live_sample_1.json` + `samples/live_compliance_1.json`)
- **Status counts (18 total):** `matched_rule_verified` (Rule-checked): **7** | `matched_user_evidenced` (User-evidenced): **0** | `gap`: **1** (Tier B disqualifying gaps: **1**) | `needs_review`: **10** | `not_applicable`: **0**
- **Language mix:** **12 Bahasa Malaysia (`ms`)**, **4 English (`en`)**, **2 mixed (`mixed`)**.

| ID | Category | Status | Tier B | Page | Lang | 1-Line Summary |
|---|---|---|---:|---:|---|---|
| `REQ-001` | `cidb_registration` | `gap` | Yes | 1 | `ms` | Contractor must be registered with CIDB minimum grade G4 (company has G3). |
| `REQ-002` | `cidb_registration` | `matched_rule_verified` | Yes | 1 | `ms` | Contractor must hold CIDB category B04. |
| `REQ-003` | `cidb_registration` | `matched_rule_verified` | Yes | 1 | `ms` | Contractor must hold CIDB category M15. |
| `REQ-004` | `cidb_registration` | `matched_rule_verified` | Yes | 1 | `ms` | CIDB registration must be valid until tender closing date 15 Dec 2026. |
| `REQ-005` | `mof_registration` | `matched_rule_verified` | Yes | 1 | `ms` | Company must be registered with MOF under code 220401. |
| `REQ-006` | `mof_registration` | `matched_rule_verified` | Yes | 1 | `ms` | Company must be registered with MOF under code 221001. |
| `REQ-007` | `bumiputera_status` | `matched_rule_verified` | Yes | 1 | `ms` | Company must have valid Bumiputera status registration. |
| `REQ-008` | `site_briefing` | `needs_review` | Yes | 2 | `ms` | Compulsory tender briefing & site visit on 25 Nov 2026. |
| `REQ-009` | `performance_bond` | `needs_review` | Yes | 2 | `en` | Performance bond of 5% of contract value within 14 days of LOA. |
| `REQ-010` | `financial_technical_experience` | `matched_rule_verified` | No | 2 | `en` | Minimum paid-up capital or net worth of RM 150,000 (company has RM 250,000). |
| `REQ-011` | `financial_technical_experience` | `needs_review` | No | 2 | `en` | At least 2 similar Government/GLC maintenance contracts in last 5 years. |
| `REQ-012` | `mandatory_documents` | `needs_review` | Yes | 3 | `ms` | Mandatory signed & stamped Borang Tender JKR 203B. |
| `REQ-013` | `mandatory_documents` | `needs_review` | Yes | 3 | `mixed` | Mandatory Integrity Declaration (Surat Akuan Pembida). |
| `REQ-014` | `mandatory_documents` | `needs_review` | Yes | 3 | `ms` | Copies of bank statements for the last 3 months. |
| `REQ-015` | `mandatory_documents` | `needs_review` | Yes | 4 | `ms` | Valid OSHA/DOSH safety compliance certificate (extracted via Vision OCR from scanned Page 4). |
| `REQ-016` | `submission_instructions` | `needs_review` | No | 1 | `mixed` | Tender submission deadline 15 Dec 2026 at 12:00 PM. |
| `REQ-017` | `financial_technical_experience` | `needs_review` | Yes | 2 | `en` | RM 150,000 financial threshold must be proven via audited accounts or certified bank statements. |
| `REQ-018` | `mandatory_documents` | `needs_review` | Yes | 3 | `ms` | Submission of CIDB and MOF registration certificate copies from checklist. |

*(Note: In offline mock mode — `requirements.json` + `compliance_results.json` — there are **16 total**: **8** `matched_rule_verified`, **0** `matched_user_evidenced`, **1** `gap`, **7** `needs_review`, including `REQ-016` on Page 4 as an `UNREADABLE_PAGE_SAFEGUARD` item when OCR is unavailable.)*

### Longest Strings (for Layout / Overflow Testing)
- **Longest `original_text` (live run, 125 chars, `REQ-009`):**
  `"The successful tenderer shall submit a Performance Bond of 5% of total contract value within 14 days of Letter of Acceptance."`
- **Longest `original_text` (offline compound clause, 163 chars, `REQ-001`):**
  `"Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&E (M15), dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026."`
- **Longest `company_evidence` display string (133 chars, `REQ-010`):**
  `"SSM Return of Allotment of Shares (Section 78) - Paid-up Capital RM 250,000 (DOC-PUC-001 - SSM_Section78_PaidUpCapital_Aman_2026.pdf)"`
- **Longest `comparison.expression` string (100 chars, `REQ-010`):**
  `"paid_up_capital RM 250,000.00 >= RM 150,000.00 -> True; OR net_worth unknown >= RM 150,000.00 -> False"`

---

## 7. Screenshots

**Not captured.** No headless browser automation tool (Playwright or Selenium) is installed in this environment, and `data/tendermate.db` currently has `0` tenders stored (`[]`), so `/ui_screenshots/` was not created.

Once both servers are running (`py -m uvicorn api:app --reload --port 8000` and `npm run dev` in `frontend/`) and `samples/sample_1_bilingual_jkr_maintenance.pdf` is uploaded, capture these 6 screenshots into `/ui_screenshots/`:
1. `01_upload_empty.png` — Initial upload view with empty analyses list.
2. `02_tender_review_full.png` — Full-page populated tender review with summary strip, filters, and cards.
3. `03_needs_review_expanded.png` — A `Needs Review` card with the inline "Mark as satisfied" form expanded.
4. `04_gap_card.png` — `REQ-001` G3-vs-G4 `Gap` card showing `Rule`, `Comparison`, and `Company evidence`.
5. `05_tier_b_card.png` — A `Tier B · Disqualifying` card (e.g., `REQ-001` or `REQ-008` site briefing).
6. `06_company_profile.png` — Read-only Company Profile & Document Library tab.

---

## 8. Known UI Problems

1. **Non-JSON `500` handling bug:** On `POST /api/tenders` and `POST .../resolve`, the UI runs `await resp.json()` before checking `resp.ok`. If FastAPI returns a plain-text `500 Internal Server Error`, `resp.json()` throws and displays a misleading `"Network error..."` message.
2. **File input doesn't visually clear after upload:** In `page.tsx`, `setUploadFile(null)` resets React state, but the uncontrolled `<input type="file">` keeps showing the previous filename in the browser until another file is chosen.
3. **No `Not Applicable` filter pill:** `ComplianceStatus` includes `not_applicable`, and the summary/PDF support it, but the filter bar only has `All`, `Gap`, `Needs Review`, `Rule-checked`, and `User-evidenced`.
4. **No initial loading state on Tender Review tab:** When the page first loads, there is no skeleton/spinner while `GET /api/tenders` or `GET /api/tenders/{id}` is in flight; it briefly shows `"No tenders uploaded yet"` before data arrives.
5. **No clear visual distinction between `Rule-checked` and `User-evidenced` beyond badge border/colour:** Both sit in the same flat list; long lists of 16–50+ atomic requirements have no grouping by status or priority (Gaps aren't pinned to the top by default).
6. **Raw `inputs` JSON and `source_excerpt` are hidden:** The API returns `result.inputs` and `requirement.source_excerpt`, but `RequirementCard.tsx` only displays `comparison.expression` and `original_text` (not `inputs` or `source_excerpt`).
7. **Long monospace strings can overflow on narrow screens:** `comparison.expression` (`100` chars) and evidence filenames (`SSM_Section78_PaidUpCapital_Aman_2026.pdf`) inside `<code>` tags have no `break-all` / `break-words` wrapping rules, risking horizontal overflow on mobile.
8. **`status_flags` (SSM Active) omitted from Company Profile UI:** `GET /api/company` returns `status_flags.ssm_active`, but `CompanyProfileView.tsx` only renders CIDB, MOF, Bumiputera, and Financials.
9. **No delete / re-run / cancel action on failed tenders:** A failed tender stays in the Analyses list (`max-h-36`) permanently with no way to dismiss or retry it from the UI.
10. **Emoji/Unicode icons (`✓`, `📎`, `✕`, `!`):** Rendering varies across OS/browsers and looks prototype-grade compared to crisp SVG icons.
11. **Retroactive recomputation not indicated in UI:** Editing `data/company_profile.json` retroactively changes rule results on previously uploaded tenders when reopened, with no UI indicator that results reflect the *current* profile rather than a historical snapshot.
12. **Accessibility gaps:** Custom tab switcher lacks `role="tablist"` / `role="tab"` / `aria-selected`; status filter pills lack `aria-pressed`; no `aria-live="polite"` region for polling/status transitions.

---

## 9. Constraints

### Must NOT Break
- **API contract & URLs:** Keep `NEXT_PUBLIC_API_URL` (`http://localhost:8000` fallback) and all existing FastAPI endpoints (`/api/company`, `/api/tenders`, `/api/tenders/{id}`, `/api/tenders/{id}/pdf`, `/api/tenders/{id}/requirements/{req_id}/resolve`, `/api/tenders/{id}/evidence/{evidence_id}`, `/api/tenders/{id}/report.pdf`).
- **Status enum contract:** Backend enum MUST stay `matched_rule_verified` and `matched_user_evidenced`; UI displays **`Rule-checked`** and **`User-evidenced`**.
- **Evidence-required resolution rule:** Never allow "Mark as satisfied" without a PDF upload + `attested_by` name, and never offer override controls on `gap` or `matched_rule_verified`.
- **Disclaimer & verbatim original text:** Keep `"Preliminary readiness assessment — verify against the official tender documents."` verbatim, and never alter/translate `original_text`.
- **Build setup:** Must build cleanly with `npm run build` under Next.js `16.4.6` + React `19.3.0` + Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`). Keep `frontend/next.config.ts` compatible with Tailwind v4 Turbopack loader.
- **Hard MVP scope boundaries:** No auth/roles, no proposal drafting, no DOCX/XLSX upload or export, no expiry alerts, no multi-company switcher, no chatbot/general summarizer.

### Responsive / Viewport Requirement
- **PRD Section 1:** `"Primary Platform: Web Application (Responsive)"`. It is **not desktop-only** — it must remain usable on mobile/tablet as well as desktop (though primary SME tender review happens on desktop/laptop).

### In PRD v1.2 but NOT Built in Current UI
- Single-user sign-in / authentication screen (PRD 5.1 — skipped for pre-seeded hackathon demo).
- Editable Company Profile form & company document upload/metadata confirmation UI (PRD 5.2, 5.8, 5.9 — demo uses pre-seeded read-only `data/company_profile.json`).
- Ability to mark an item `Not Applicable` with confirmation (PRD 5.11 — status exists in enum/PDF, no UI control).
- Inline embedded PDF viewer side-by-side with requirements (current UI opens source PDF in a new tab via `#page=N`).
- **Explicitly Future / Out of MVP (do NOT design for MVP):** Proposal drafting, DOCX/XLSX import/export, expiry alert dashboard, team roles, multi-company workspaces, tender discovery, ePerolehan integration.

---

## Questions to Answer Before Redesigning

1. **Default ordering & grouping:** Should requirements default to severity order (**Gaps → Needs Review → User-evidenced → Rule-checked**), grouped into collapsible sections, or stay in document/extraction order (`REQ-001`..`REQ-018`)?
2. **Source PDF viewing:** Is opening `#page=N` in a new browser tab sufficient for the hackathon demo, or should we plan a split-pane / slide-over PDF preview drawer on desktop?
3. **Brand visual direction:** Do you have a specific brand palette, logo, or typography preference for TenderMate (e.g., corporate navy/teal Malaysian gov-tech vs clean modern SaaS), or should the designer define it from scratch?
4. **Card density for long tenders:** Real Malaysian tenders can have 40–80 atomic requirements. Should the list default to a compact scannable table/accordion (expanding audit trails on click) instead of full expanded cards?
5. **Bilingual UX:** Should UI chrome (headings, buttons, filters) remain English-only while keeping extracted `original_text` verbatim in BM/English, or do you want a BM/English UI toggle later?
6. **Pre-loaded demo state:** For the live hackathon pitch, should the landing screen open directly onto a pre-analyzed real tender (with Upload tucked into a button/modal) rather than an empty upload form?
