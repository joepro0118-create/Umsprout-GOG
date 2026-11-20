# TenderMate End-to-End & Extraction Quality Test Report

**Date**: 2026-11-20  
**Scope**: Real-tender E2E browser testing (R2), extraction quality & consistency evaluation (R3), and flow-blocking defect reporting (R4) across 3 openly published Malaysian tender/RFP PDFs.  
**Test Environment**:
- **Backend**: FastAPI (`py -m uvicorn api:app --reload --port 8000`) + SQLite (`data/tendermate.db`)
- **Frontend**: Next.js 16 dev server (`http://localhost:3000`)
- **Browser**: Headless Google Chrome (`channel="chrome"`) via Python Playwright (`1.65.2`)
- **Company Profile**: `COMP-001` (`Syarikat Kejuruteraan Aman Sdn. Bhd.`, `data/company_profile.json`, SHA256 `1DBC0F6740909A86E998B5D22623926BDABE6510236517B6FE045A680943494C`)

---

## 1. Executive Summary & Scope Compliance

TenderMate was evaluated end-to-end on three real Malaysian procurement PDFs totaling **45 pages** and **68 ground-truth requirements** (**32 disqualifying**).

- **End-to-End Browser Flow (R2)**: **Passed on all 3 real tenders** (`TND-024df56e`, `TND-768ebfff`, `TND-6818fd3f`) after applying one flow-blocking backend fix in `extract_requirements.py` (`429 RESOURCE_EXHAUSTED` fallback + accurate `model_used` tracking). Upload validation, 2-second polling, summary counts, citation PDF deep-links (`#page=N`), OCR low-quality banners (`MBI` p.20), evidence-gated `Needs review` resolution, `409` non-override enforcement on `Gap`/`User-evidenced` items, ReportLab PDF export (disclaimer + `Rule-checked`/`User-evidenced` labels + audit trail), and Company Profile parity against `GET /api/company` all functioned end-to-end.
- **Responsive & UI Checks (R2.6)**: Desktop (`1440x900`) and tablet (`1024x768`) had zero page-level horizontal overflow; mobile Review (`390x844`) had **1 Medium horizontal overflow bug** (`BUG-UI-01`, `scrollWidth 424 > innerWidth 390`) caused by `shrink-0` on the action button group, plus 3 Low layout/wrapping defects (`BUG-UI-02`..`04`). Per R4 scope boundaries, non-flow-blocking UI bugs were documented and not redesigned.
- **Extraction Quality & Consistency (R3)**: Combined Run 1 **full recall was 43.8% (14/32) on disqualifying items** and **36.8% (25/68) on all items** (**75.0% [24/32]** and **67.6% [46/68]** including partial matches), with **38 wrong/mislabelled items** and **4 duplicates**. Major defects included:
  1. `ThinkingLevel.MINIMAL` `400 INVALID_ARGUMENT` crash on `gemini-4-hydrogen` OCR (causing 10/14 scanned pages to fail OCR when `gemini-4-hydrogen` was requested, and failing p.20 in Run 1 and p.16/29 in Run 3).
  2. Hybrid/watermarked pages (`MBI` p.1, 2, 7–9) exceeding `MIN_READABLE_CHARS = 60` and bypassing OCR, silently losing critical image-only rejection clauses (`MBI-GT-02`, `MBI-GT-05`).
  3. False-positive `Gap` on subcontractor `CIDB E11` (`MBI` Run 1 `REQ-027`) while missing the true prime-contractor `Gap` (`MOF 221002`, `MBI-GT-03`).
  4. Severe cross-model `is_disqualifying` instability during `429`/`503`/`504` fallbacks (`29.4%` 3-way Jaccard on BNM; `72.4%` on MBI).
- **Scope & Integrity Compliance**:
  - `data/company_profile.json` SHA256 is unchanged: `1DBC0F6740909A86E998B5D22623926BDABE6510236517B6FE045A680943494C`.
  - `samples/real/` is listed in `.gitignore` and excluded from Git (`git status` confirms no real tender PDFs are tracked or staged).
  - Synthetic `sample_1/2/3` PDFs were not used in this evaluation.
  - No UI redesigns were performed; only the single flow-blocking `429` fallback bug in `extract_requirements.py` was fixed.

---

## 2. Tenders Tested (R1 & R4)

All 3 documents are openly published Malaysian tender/RFP notices (`samples/real/SOURCES.md`).

| Filename | Issuer / Agency | Source URL | Date Downloaded | Pages | Language | Text-Based vs Scanned Breakdown |
|---|---|---|---|---:|---|---|
| `Notis_Tender_RFX_4000054778.pdf` | Tenaga Nasional Berhad (TNB) — TNB Global Business Solutions | `https://www.tnb.com.my/assets/tender_price/Notis_Tender_RFX_4000054778.pdf` | Pre-existing (`2026-11-20`) | 3 | Malay | **Text-based (3/3)**: p.1 (`2,651` chars), p.2 (`2,797` chars), p.3 (`199` chars, sparse enquiry-contact spillover). 1 small logo image/page. |
| `BNM_Request_for_Proposal_OSS.pdf` | Bank Negara Malaysia (BNM) — Hospitality and Museum Dept | `https://www.bnm.gov.my/documents/20124/2493527/Request+for+Proposal+OSS.pdf` | `2026-11-20` | 13 | English | **Text-based (13/13)**: p.1–13 (`78`–`2,253` chars). Includes 2 low-text section dividers (`p.4 = 86` chars, `p.7 = 78` chars); 1 cover logo on p.1. |
| `MBI_462325MEJA.pdf` | Majlis Bandaraya Ipoh (MBI) — `S0175/26` (`E4/3/43/26`) | `https://myperolehan.mbi.gov.my/upload/BQ/462325MEJA.pdf` | `2026-11-20` | 29 | Malay / English | **Mixed (13 text-based + 16 scanned/hybrid)**: 11 clean text pages (`p.1, 3–6, 10–15`; `p.1` embeds a portal screenshot image), 2 hybrid text+image forms (`p.2 = 500` chars/5 imgs; `p.9 = 355` chars/4 imgs), 2 scanned pages with >100-char overlay (`p.7 = 122` chars; `p.8 = 108` chars), and **14 scanned pages (`p.16–29`)** with only a 37-char watermark (`NO SEBUTHARGA : S0175/26 / MEJA TAWARAN`). |

---

## 3. Code Fixes Made & Re-Verification (R4)

### 3.1 Single Flow-Blocking Bug Fixed (`extract_requirements.py`)
- **Pre-fix failure observed**: Uploading `samples/real/Notis_Tender_RFX_4000054778.pdf` (`TND-8ebb2fb6`, before fix) failed completely with `ClientError: 429 RESOURCE_EXHAUSTED` on `gemini-3-flash` (`ui_screenshots/real_tnb_rfx_4000054778/02b_failed_429_before_fix.png`), blocking all live PDF analysis.
- **Root cause**:
  1. `_generate_content_with_fallback` (`extract_requirements.py:172`) only retried/fell back on `exc.code in (404, 500, 503, 504)` and immediately re-raised `429` without falling back to `FALLBACK_MODELS` (`gemini-3.1-flash-lite`, `gemini-4-hydrogen`).
  2. `_ocr_with_gemini_vision`, `run_initial_extraction_pass`, and `run_coverage_pass` discarded the returned `used_model`, causing `ExtractionOutput.model_used` to hardcode the requested `model_name` even when fallback occurred.
- **Minimal fix applied** (committed in `c5a3567`):
  - `extract_requirements.py:158, 172`: Added `429` to fallback status tuple `(404, 429, 500, 503, 504)`.
  - `extract_requirements.py:192, 218–219, 233, 275–277, 375, 389–391, 402, 429–431, 809–831`: Added optional `used_models_out: Optional[list[str]] = None` propagation across OCR, Pass 1, and Pass 2, setting `ExtractionOutput.model_used` to `", ".join(dict.fromkeys(used_models))`.
- **Re-verification**:
  - `py -m pytest -v`: **26 passed in 2.68s** (all unit and API tests green, zero regressions).
  - End-to-end browser & API pipeline re-verified on all 3 real PDFs (`TND-024df56e`, `TND-768ebfff`, `TND-6818fd3f`), where fallback actively rescued runs hitting `429`/`503`/`504` and accurately recorded `model_used`.

---

## 4. End-to-End Browser Flow & Responsive Check Results (R2)

### 4.1 Per-Tender Browser Flow Summary (Steps 1–5)

| Flow Check | TNB (`TND-024df56e`) | BNM (`TND-768ebfff`) | MBI (`TND-6818fd3f`) |
|---|---|---|---|
| **1. Non-PDF Upload Rejection** | Rejected clearly (`01_upload_non_pdf_rejected.png`) | Rejected clearly (`01_upload_non_pdf_rejected.png`) | Rejected clearly (`01_upload_non_pdf_rejected.png`) |
| **1. Valid PDF Upload, Polling & Recent Analyses** | Uploaded, polled (2s) -> `Completed` in `16.1s`; `0 disqualifying gaps · 12 need review` (`02_upload_processing.png`, `03_recent_analyses_completed.png`) | Uploaded, polled -> `Completed` in `96.5s`; `0 disqualifying gaps · 19 need review` (`02_upload_processing.png`, `03_recent_analyses_completed.png`) | Uploaded, polled -> `Completed` in `90.5s`; `1 disqualifying gap · 27 need review` (`02_upload_processing.png`, `03_recent_analyses_completed.png`) |
| **2. Summary Counts, Sorting, Citations, OCR Banner & `Uncited`** | Pre-resolve: `12` (`0 Gap, 12 Needs review`); post-resolve: `11 Needs review, 1 User-evidenced`. Table rows `12 == 12`, severity-sorted. `p.1` opened `#page=1` (`200 application/pdf`). `lowQualityPages=[]`, `Uncited=0` (`04_review_main.png`, `05_citation_new_tab.png`) | Pre-resolve: `19` (`0 Gap, 19 Needs review`); post-resolve: `18 Needs review, 1 User-evidenced`. Table rows `19 == 19`, severity-sorted. `p.1` opened `#page=1` (`200 application/pdf`). `lowQualityPages=[]`, `Uncited=0` (`04_review_main.png`, `05_citation_new_tab.png`) | Pre-resolve: `29` (`1 Gap, 27 Needs review, 1 Rule-checked`); post-resolve: `1 Gap, 26 Needs review, 1 User-evidenced, 1 Rule-checked`. Expanded `"Show 1 rule-checked item"` -> `29 == 29`, sorted `Gap -> Needs review -> User-evidenced -> Rule-checked`. `p.18` opened `#page=18`. **OCR banner shown**: `"Page 20 is a scanned image, read with OCR. Check REQ-029 against the original. View page 20 ↗"` (`Scanned · OCR` badge). `Uncited=0` (`04_review_main.png`, `05_citation_new_tab.png`) |
| **3. `Needs-review` Resolution (`REQ-001`)** | Confirm button disabled with no file (`06_needs_review_disabled.png`). Attached `evidence_dummy.pdf` + `Ahmad Farhan bin Ismail` -> `User-evidenced` (`EVID-a3e7aade · evidence_dummy.pdf`, timestamp, note) (`07_user_evidenced.png`) | Confirm button disabled with no file (`06_needs_review_disabled.png`). Attached `evidence_dummy.pdf` + `Ahmad Farhan bin Ismail` -> `User-evidenced` (`EVID-aeba69c4 · evidence_dummy.pdf`, timestamp, note) (`07_user_evidenced.png`) | Confirm button disabled with no file (`06_needs_review_disabled.png`). Attached `evidence_dummy.pdf` + `Ahmad Farhan bin Ismail` -> `User-evidenced` (`EVID-cc559b59 · evidence_dummy.pdf`, timestamp, note) (`07_user_evidenced.png`) |
| **3. `Gap` No-Override & HTTP `409` Check** | `0 Gap` rows in TNB (`08_gap_no_override.png`). Direct `POST .../REQ-001/resolve` (`matched_user_evidenced`) returned **HTTP `409`**: `"Only Needs Review items can be marked satisfied (current status: matched_user_evidenced). Rule-checked results and gaps cannot be overridden."` | `0 Gap` rows in BNM (`08_gap_no_override.png`). Direct `POST .../REQ-001/resolve` (`matched_user_evidenced`) returned **HTTP `409`** with the same guard message. | `REQ-027` (`Gap`) drawer showed `"Gaps come from rules and cannot be overridden."` with zero override controls (`08_gap_no_override.png`). Direct `POST .../REQ-027/resolve` returned **HTTP `409`**: `"Only Needs Review items can be marked satisfied (current status: gap). Rule-checked results and gaps cannot be overridden."` |
| **4. PDF Report Export (`pymupdf` verified)** | 4 pages; verbatim disclaimer (`"Preliminary readiness assessment — verify against the official tender documents."`), `Rule-checked`, `User-evidenced`, `Ahmad Farhan bin Ismail`, `EVID-a3e7aade`, audit trail verified (`09_exported_report_p1.png`, `09_exported_report_p2_audit.png`, `09_exported_report_p3_audit.png`) | 5 pages; verbatim disclaimer, `Rule-checked`, `User-evidenced`, `Ahmad Farhan bin Ismail`, `EVID-aeba69c4`, audit trail verified (`09_exported_report_p1.png`, `09_exported_report_p2_audit.png`, `09_exported_report_p5_audit.png`) | 7 pages; verbatim disclaimer, `Rule-checked`, `User-evidenced`, `Ahmad Farhan bin Ismail`, `EVID-cc559b59`, `RULE_CIDB_CATEGORY_MEMBERSHIP` + audit trail verified (`09_exported_report_p1.png`, `09_exported_report_p3_audit.png`, `09_exported_report_p7_audit.png`) |
| **5. Company Screen vs `GET /api/company`** | 100% match across company details, CIDB (`G3: B04, M15, CE21`), MOF (`220401, 221001, 210101`), Bumiputera, Paid-up capital (`RM 250,000`), and 5 document rows (`10_company_profile.png`) | 100% match (`10_company_profile.png`) | 100% match (`10_company_profile.png`) |

### 4.2 Responsive Measurements (R2.6)

Measurements were identical across all 3 tenders (`11_responsive_upload_*.png`..`16_responsive_review_*.png`):

| Screen & Viewport | `innerWidth` | `docScrollWidth` | Horizontal Overflow? | Clipped / Overflowing Elements | Mobile Nav Drawer |
|---|---:|---:|---|---|---|
| Upload `1440x900` | 1440 | 1440 | No | None | N/A (sidebar) |
| Upload `1024x768` | 1024 | 1024 | No | 1 minor flex-item overflow: `div.flex.items-start.gap-3` in 3-step explainer (`clientW: 96, scrollW: 105`) | N/A (sidebar) |
| Upload `390x844` | 390 | 390 | No | None | Open/close verified |
| Review `1440x900` | 1440 | 1440 | No | None | N/A (sidebar) |
| Review `1024x768` | 1024 | 1024 | No | None (`Requirement` text truncates via CSS ellipsis) | N/A (sidebar) |
| Review `390x844` | 390 | **424** | **YES (+34px)** | Review header action button row (`div.flex.flex-wrap.items-center.gap-2.shrink-0`, `right: 424`) + `Export PDF report` (`left: 288, right: 424`) | Open/close verified |

### 4.3 UI Bugs Found (Not Fixed — Non-Flow-Blocking per R4)

1. **`BUG-UI-01` (Medium) — Review header action buttons overflow horizontally at 390px mobile width (`scrollWidth: 424 > innerWidth: 390`)**
   - **Location**: `frontend/app/page.tsx:449` (`<div className="flex flex-wrap items-center gap-2 shrink-0">`)
   - **Steps to reproduce**: Open any completed tender's Review screen -> set viewport to `390x844` -> inspect `"Upload new tender"`, `"Source PDF ↗"`, and `"Export PDF report"`.
   - **Result**: `shrink-0` prevents the container from shrinking below its max-content width (`~410px`), pushing `"Export PDF report"` past the right edge (`right: 424px`) and triggering +34px horizontal scroll. (Buttons remain clickable.)
   - **Fix status**: Not fixed (non-flow-blocking per R4).
   - **Screenshots**: `ui_screenshots/real_tnb_rfx_4000054778/16_responsive_review_390.png`, `ui_screenshots/real_bnm_oss/16_responsive_review_390.png`, `ui_screenshots/real_mbi_s0175_26/16_responsive_review_390.png`.

2. **`BUG-UI-02` (Low) — Upload 3-step explainer column overflows flex container at 1024px (`scrollW: 105 > clientW: 96`)**
   - **Location**: `frontend/components/UploadZone.tsx:245-278`
   - **Steps to reproduce**: Open Upload view at `1024x768` -> inspect Step 1 (`"Every mandatory requirement..."`).
   - **Result**: Missing `min-w-0` on the inner text `<div>` causes `"requirement,"` (`105px`) to slightly exceed the `96px` column box without causing page-level overflow.
   - **Fix status**: Not fixed (non-flow-blocking per R4).
   - **Screenshot**: `ui_screenshots/real_tnb_rfx_4000054778/12_responsive_upload_1024.png`.

3. **`BUG-UI-03` (Low) — Exported PDF `Requirement inventory` table header wraps `"Page"` as `"Pag\ne"`**
   - **Location**: `report.py:194` (`colWidths=[16 * mm, 11 * mm, 13 * mm, 26 * mm, 80 * mm, 24 * mm]`)
   - **Steps to reproduce**: Export any tender PDF report -> view `Requirement inventory` table header on page 1.
   - **Result**: `11 * mm` column width is ~1–2mm too narrow for bold `"Page"`, wrapping `"e"` onto a second line.
   - **Fix status**: Not fixed (non-flow-blocking per R4).
   - **Screenshot**: `ui_screenshots/real_tnb_rfx_4000054778/09_exported_report_p1.png`.

4. **`BUG-UI-04` (Low / Dev-Only) — Next.js dev mode `"N"` badge overlaps sidebar footer company name and mobile table icon**
   - **Location**: Next.js 16 dev overlay bottom-left corner over `frontend/components/AppShell.tsx` footer (`Syarikat Kejuruteraan Aman Sdn. Bhd.`).
   - **Steps to reproduce**: Load Upload or mobile `390x844` Review screen while running `next dev`.
   - **Result**: Covers `"Bhd."` in desktop sidebar and the first row badge in mobile review; does not appear in production (`next start`).
   - **Fix status**: Not fixed (dev-only environmental artifact).
   - **Screenshot**: `ui_screenshots/real_tnb_rfx_4000054778/16_responsive_review_390.png`.

---

## 5. Extraction Quality & Ground-Truth Comparison (R3.1–R3.3)

### 5.1 Per-Tender Metrics Summary (Run 1 Baseline)

*(Note: `ground_truth_mbi.md` explicitly marks **11** of 35 items as `is_disqualifying=true`: `MBI-GT-01..05, 09, 10, 12, 13, 14, 16`; M3A `handoff.md` line 14 had a summary typo stating `9`, so the verified **11** from `ground_truth_mbi.md` is used below.)*

| Metric | TNB (`run1_tnb.json`) | BNM (`run1_bnm.json`) | MBI (`run1_mbi.json`) | Combined (3 Tenders) |
|---|---:|---:|---:|---:|
| Ground-Truth Items (Total / Disqualifying) | 11 / 9 | 22 / 12 | 35 / 11 | **68 / 32** |
| System Requirements Extracted | 12 | 19 | 29 (28 + 1 safeguard) | **60** |
| **Recall on Disqualifying GT (Full Match)** | **5/9 (55.6%)** | **8/12 (66.7%)** | **1/11 (9.1%)** | **14/32 (43.8%)** |
| **Recall on Disqualifying GT (Incl. Partial)** | **6/9 (66.7%)** | **10/12 (83.3%)** | **8/11 (72.7%)** | **24/32 (75.0%)** |
| Disqualifying GT Extracted **AND** `is_disq=true` | 6/9 (66.7%) | 5/12 (41.7%) | 8/11 (72.7%) | **19/32 (59.4%)** |
| **Recall on All GT Items (Full Match)** | **7/11 (63.6%)** | **12/22 (54.5%)** | **6/35 (17.1%)** | **25/68 (36.8%)** |
| **Recall on All GT Items (Incl. Partial)** | **8/11 (72.7%)** | **15/22 (68.2%)** | **23/35 (65.7%)** | **46/68 (67.6%)** |
| Wrong / Mislabelled System Items | 5 (`REQ-001, 004, 005, 006, 008`) | 11 (`REQ-001, 002, 008–011, 015–019`) | 22 (`REQ-001, 003–009, 012–017, 019–020, 023–028`) | **38** |
| Duplicated System Items | 2 (`REQ-009, 010`) | 2 (`REQ-011, 017`) | 0 (1 in Run 3) | **4** |
| Unreadable / OCR-Failed Safeguard Rows | 0 | 0 | 1 (`REQ-029`, p.20) | **1** |

---

### 5.2 Complete R3.2 Ground-Truth Comparison Tables (All 3 Tenders)

#### Tender 1: `Notis_Tender_RFX_4000054778.pdf` (TNB, Run 1: `12` reqs, `10` disq)

| your item | found by TenderMate? (yes/no/partial) | status given | correct page? | is_disqualifying correct? |
|---|---|---|---|---|
| `TNB-GT-01` (p.1, `disq=true`): Registered with KK/PKK/CIDB AND TNB | no | — | — | — |
| `TNB-GT-02` (p.1, `disq=true`): Passed TNB Pre-Qualification (*Soft Services*) | yes (`REQ-001`) | Needs review | yes (p.1) | yes (`true`) |
| `TNB-GT-03` (p.1, `disq=true`): Compulsory Briefing & Site Visit at BOTH sessions (23 Nov 2026: Session 1 Tanah Merah 9–11am AND Session 2 Pergau Jeli 3–5pm) | partial (`REQ-002`, `REQ-009`, `REQ-010`) | Needs review | yes (p.1) | yes (`true`) |
| `TNB-GT-04` (p.1, `disq=true`): Only cert holder may attend briefing; else `surat wakil kuasa` (+ cert copy if needed) | yes (`REQ-003`, `REQ-011`) | Needs review | yes (p.1) | yes (`REQ-003: true`; `REQ-011: false`) |
| `TNB-GT-05` (p.1, `disq=false`): Wear safety attire / PPE during site visit | yes (`REQ-004`) | Needs review | yes (p.1) | **no** (`Sys: true` vs `GT: false`) |
| `TNB-GT-06` (p.1–2, `disq=true`): Read & understand all details; errors/non-compliance may cause non-consideration | no | — | — | — |
| `TNB-GT-07` (p.2, `disq=true`): Follow all mandatory entry conditions; non-compliance causes rejection | no | — | — | — |
| `TNB-GT-08` (p.2, `disq=true`): Registered as TNB SUS Supplier (SCMS/SUS) | yes (`REQ-005`) | Needs review | yes (p.2) | yes (`true`) |
| `TNB-GT-09` (p.2, `disq=true`): All relevant certificates updated in SUS Portal to qualify | yes (`REQ-006`) | Needs review | yes (p.2) | yes (`true`) |
| `TNB-GT-10` (p.1–2, `disq=true`): Electronic submission (`e-Tender`) by 30 Nov 2026 5pm; manual/copy rejected | yes (`REQ-007` p.2, `REQ-008` p.1) | Needs review | yes (p.1, 2) | yes (`true`) |
| `TNB-GT-11` (p.2, `disq=false`): Existing suppliers claiming SST must email JKDM approval letter to `SST-Vendor@tnb.com.my` | yes (`REQ-012`) | Needs review | yes (p.2) | yes (`false`) |

*TNB Notes*: `REQ-001`, `REQ-005`, `REQ-006` were mislabelled `category="mof_registration"` in Run 1; `REQ-009` (Session 1 only) and `REQ-010` duplicated `REQ-002` while omitting Session 2 (3–5pm Pergau, Jeli) across all 3 runs; `REQ-008` used unmapped `date_validity:tender_closing_date`.

#### Tender 2: `BNM_Request_for_Proposal_OSS.pdf` (BNM, Run 1: `19` reqs, `10` disq)

| your item | found by TenderMate? (yes/no/partial) | status given | correct page? | is_disqualifying correct? |
|---|---|---|---|---|
| `BNM-GT-01` (p.3, `disq=false`): Statutory & regulatory compliance (cl. 3(c)) | no | — | — | — |
| `BNM-GT-02` (p.5, `disq=false`): Supply 2 OSS categories for 4-year tenure (cl. 1.1) | no | — | — | — |
| `BNM-GT-03` (p.5, `disq=true`): Pricing inclusive of packaging & sample packaging methods submitted with tender | partial (`REQ-002`) | Needs review | yes (p.5) | **no** (`Sys: false` vs `GT: true`) |
| `BNM-GT-04` (p.6, `disq=false`): Monthly KPI >= 85% + penalty (cl. 1.2) & Delivery location Printing Room LB2 Block A (cl. 1.3) | partial (`REQ-015`) | Needs review | yes (p.6) | **no** (`Sys: true` vs `GT: false`) |
| `BNM-GT-05` (p.8, `disq=true`): Malaysian registered company (cl. 2.1(a)) | yes (`REQ-003`) | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-06` (p.8, `disq=true`): At least 3 years' OSS experience (cl. 2.1(b)) | yes (`REQ-004`) | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-07` (p.8, `disq=true`): 4 years positive net worth 2017–2020 or 4 yrs bank statements if sole prop (cl. 2.1(c)) | yes (`REQ-005`) | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-08` (p.8, `disq=true`): Declaration of no litigation/dispute (cl. 2.1(d)) | yes (`REQ-006`) | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-09` (p.8, `disq=true`): Supply ALL required items per Section 1.1 (cl. 2.1(e)) | yes (`REQ-007`) | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-10` (p.8, `disq=true`): Scrutinize documents; any non-compliance entitles BNM to disqualify (cl. 2.2(a)–(b)) | no | — | — | — |
| `BNM-GT-11` (p.9, `disq=false`): Fixed & firm price; omissions at tenderer's cost; binding documents (cl. 2.2(d), 2.2(f), 2.3(h)) | no | — | — | — |
| `BNM-GT-12` (p.9, `disq=false`): Comply with post-closing info/presentation requests (cl. 2.2(g)) | yes (`REQ-018`) | Needs review | yes (p.9) | **no** (`Sys: true` vs `GT: false`) |
| `BNM-GT-13` (p.9, `disq=true`): All instructions/terms/conditions/specs must be met to qualify (cl. 2.3(b)) | no | — | — | — |
| `BNM-GT-14` (p.9–10, `disq=true`): 3 separate envelopes (A, B, C) + proper sealing/labelling or rejection (cl. 2.3(c), 2.3(f), p.10 label) | partial (`REQ-008`) | Needs review | yes (p.9) | **no** (`Sys: false` vs `GT: true`) |
| `BNM-GT-15` (p.10, `disq=true`): Addressed to Director H&M; deposit in Tender Box 7 or 8, Sasana Kijang (cl. 2.3(d)) | yes (`REQ-009`) | Needs review | yes (p.10) | **no** (`Sys: false` vs `GT: true`) |
| `BNM-GT-16` (p.10, `disq=true`): Ban on fax, email, telex, telegram, or other means (cl. 2.3(e)) | yes (`REQ-010`) | Needs review | yes (p.10) | **no** (`Sys: false` vs `GT: true`) |
| `BNM-GT-17` (p.1, 10, `disq=true`): Closing date Friday 4 June 2021, 3:00 p.m.; late bids invalid (p.1 & cl. 2.3(h)) | yes (`REQ-001` p.1, `REQ-011` p.10) | Needs review | yes (p.1, 10) | **no** (`Sys: false` on both vs `GT: true`) |
| `BNM-GT-18` (p.11, `disq=false`): Withdrawal Declaration Form X, Attachment 4 if not participating (cl. 2.3(i)) | yes (`REQ-012`) | Needs review | yes (p.11) | yes (`false`) |
| `BNM-GT-19` (p.12, `disq=false`): Formal Service Agreement; non-negotiable liability & LD; no service/payment until signed (cl. 2.5(a)–(b)) | yes (`REQ-016`, `REQ-017`) | Needs review | yes (p.12) | **no** (`Sys: true` on both vs `GT: false`) |
| `BNM-GT-20` (p.12, `disq=false`): Declare current bank particulars in proposal (2.6(c)) + submit bank statement on award (2.6(b)) | yes (`REQ-014`, `REQ-013`) | Needs review | yes (p.12) | yes (`false`) |
| `BNM-GT-21` (p.11–12, `disq=false`): Confidentiality obligation (cl. 2.4(b)(ii), 2.7) | no | — | — | — |
| `BNM-GT-22` (p.13, `disq=false`): IP rights vest with Bank + third-party infringement indemnity (cl. 2.8) | yes (`REQ-019`) | Needs review | yes (p.13) | **no** (`Sys: true` vs `GT: false`) |

*BNM Notes*: Run 1 (`gemini-4-hydrogen, gemini-3.1-flash-lite`) got `is_disqualifying` wrong on **11 of 19** extracted rows (6 false negatives, 5 false positives), duplicated closing date (`REQ-001`/`REQ-011`), split Service Agreement (`REQ-016`/`REQ-017`), and left `BNM-GT-05` (`Malaysian registered company`) unstructured so it never matched `ssm_active`.

#### Tender 3: `MBI_462325MEJA.pdf` (MBI, Run 1: `29` reqs incl. 1 safeguard, `26` disq)

| your item | found by TenderMate? (yes/no/partial) | status given | correct page? | is_disqualifying correct? |
|---|---|---|---|---|
| `MBI-GT-01` (p.1, `disq=true`): Do NOT submit `Dokumen Meja Tawaran` (`DITOLAK DENGAN SERTA MERTA`); purchase online for serial no. on `Borang 1/91` | partial (`REQ-005` p.3) | Needs review | **no** (p.3 vs p.1) | yes (`true`) |
| `MBI-GT-02` (p.1 `[scanned]`, `disq=true`): Suppliers with MBI arrears (`tunggakan`) cannot buy tender | no | — | — | — |
| `MBI-GT-03` (p.2 `[scanned+text]`, `disq=true`): MOF code `221002 (MEMBERSIH KAWASAN)` / PKK `(TERBUKA)` | no | — | — | — |
| `MBI-GT-04` (p.2 `[scanned+text]`, `disq=true`): Tender box Tingkat 1 Bangunan MBI; closing `3 NOVEMBER 2026 JAM 12.00 TENGAHARI` | partial (`REQ-009` p.2) | Needs review | yes (p.2) | yes (`true`) |
| `MBI-GT-05` (p.2 `[scanned]`, `disq=true`): Red `MUSTAHAK` box: attach reg cert, 3m bank statements, 2yr experience with `Borang 1/91` or `AKAN DITOLAK` | no | — | — | — |
| `MBI-GT-06` (p.2 `[scanned]`, `disq=false`): Fill Bahagian B carefully; ban on `'liquid paper'`; initial corrections | no | — | — | — |
| `MBI-GT-07` (p.3–4, `disq=false`): Arrange per `Senarai Semak` and bind in one single volume (`satu jilid`) | no | — | — | — |
| `MBI-GT-08` (p.3, `disq=false`): Mandatory Forms Checklist (Bahagian A, Items 1–13) | partial (`REQ-005..008, 012..017`) | Needs review | yes (p.3) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-09` (p.4, `disq=true`): SSM certificate + Business & Owner info on yellow paper | partial (`REQ-018`) | Needs review | yes (p.4) | yes (`true`) |
| `MBI-GT-10` (p.4, `disq=true`): MOF Registration Certificate on yellow paper | partial (`REQ-002`) | **Rule-checked** | yes (p.4) | yes (`true`) |
| `MBI-GT-11` (p.4, `disq=false`): MOF Bumiputera & Manufacturer (`Pembuat`) certs *(Jika Berkaitan)*, yellow paper | partial (`REQ-019`, `REQ-020`) | Needs review | yes (p.4) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-12` (p.4, 29, `disq=true`): LHDN TCC `PATUH`, MyTax scannable, yellow paper (mandatory cl. 7.1 p.29) | partial (`REQ-003`) | Needs review | yes (p.4) | yes (`true`) |
| `MBI-GT-13` (p.4, `disq=true`): Bank-certified 3-month bank statements on pink paper | partial (`REQ-021`) | Needs review | yes (p.4) | yes (`true`) |
| `MBI-GT-14` (p.4, `disq=true`): Government Agency CPCs (Last 2 years ONLY) | yes (`REQ-022`) | Needs review | yes (p.4) | yes (`true`) |
| `MBI-GT-15` (p.4, `disq=false`): Checklist Company Confirmation (`Pengesahan Oleh Syarikat`) | no | — | — | — |
| `MBI-GT-16` (p.5–6, `disq=true`): `Surat Akuan Pembida` (Integrity Pact) & `Surat Perwakilan Kuasa` (breach = disqualification) | partial (`REQ-006` p.3) | Needs review | **no** (p.3 vs p.5–6) | yes (`true`) |
| `MBI-GT-17` (p.7–9 `[scanned/hybrid]`, `disq=false`): `Borang Kontrak (AM) 9/93 & 10/93` | partial (`REQ-012` p.3) | Needs review | **no** (p.3 vs p.7–9) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-18` (p.10, 3, `disq=false`): `Borang Sebut Harga` filled (price, 3 weeks, signatures, seal) on blue paper | partial (`REQ-013` p.3) | Needs review | **no** (p.3 vs p.10) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-19` (p.11, `disq=false`): Beneficial Ownership Declaration (`Pemunya Benefisial`) | yes (`REQ-007` p.3) | Needs review | **no** (p.3 vs p.11) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-20` (p.12, `disq=false`): Anti-Trafficking & Forced Labor Declaration | yes (`REQ-008` p.3) | Needs review | **no** (p.3 vs p.12) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-21` (p.13–14, `disq=false`): Official Secrets Act 1972 (`Lampiran E` & `Lampiran F`) | yes (`REQ-014`, `REQ-015` p.3) | Needs review | **no** (p.3 vs p.13–14) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-22` (p.15, `disq=false`): `Borang Kontrak (AM) 2/91` — past 2 years & ongoing works list | partial (`REQ-016` p.3) | Needs review | **no** (p.3 vs p.15) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-23` (p.16 `[scanned]`, `disq=false`): `Maklumat Harga Indikatif Jabatan` (`RM 256,000.00`) | no | — | — | — |
| `MBI-GT-24` (p.17–18 `[scanned]`, `disq=false`): Compulsory Pre-Tender Site Visit | yes (`REQ-001` p.17) | Needs review | yes (p.17) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-25` (p.17 `[scanned]`, `disq=false`): BQ pricing completeness, no unauthorized alterations, firm price | no | — | — | — |
| `MBI-GT-26` (p.17, 19, 28 `[scanned]`, `disq=false`): Post-Award Performance Bond (2.5% >= RM200k) & Insurances (Works, Public Liability, CAR unlimited, SOCSO 10%) | partial (`REQ-004` p.19; `REQ-023..026` p.17) | Needs review | yes (p.17, 19) | **no** (`Sys: true` on all 5 vs `GT: false`) |
| `MBI-GT-27` (p.18 `[scanned]`, `disq=false`): CIDB Levy 0.125% for Works > RM500,000 | yes (`REQ-011`) | Needs review | yes (p.18) | yes (`false`) |
| `MBI-GT-28` (p.18 `[scanned]`, `disq=false`): Statutory regulations & CIDB `E11` electrical **sub-contractor** | partial (`REQ-027`) | **Gap** *(false!)* | yes (p.18) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-29` (p.18, 22 `[scanned]`, `disq=false`): MBI `Fi Perkhidmatan` (0.80%/0.40%) mandatory before SST (>RM50,001) | partial (`REQ-010`) | Needs review | yes (p.18) | yes (`false`) |
| `MBI-GT-30` (p.19–22, 3 `[scanned]`, `disq=false`): `Senarai Kuantiti (BQ)` completion & green paper rule | partial (`REQ-017` p.3) | Needs review | **no** (p.3 vs p.19–22) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-31` (p.26 `[scanned]`, `disq=false`): Forestry Dept Tree Waste Disposal Permit & dump receipts | partial (`REQ-028`) | Needs review | yes (p.26) | **no** (`Sys: true` vs `GT: false`) |
| `MBI-GT-32` (p.27 `[scanned]`, `disq=false`): DOSH machinery compliance, 6 mandatory PPE items, safety plan, tree-trunk ban | no | — | — | — |
| `MBI-GT-33` (p.28 `[scanned]`, `disq=false`): 90-day quotation validity period | no | — | — | — |
| `MBI-GT-34` (p.29 `[scanned]`, `disq=false`): 7-day JKDM/SST registration letter after signing SST | no | — | — | — |
| `MBI-GT-35` (p.29 `[scanned]`, `disq=false`): Working hours 8am–7pm & zero-cost delay mitigation | no | — | — | — |

---

### 5.3 Pages Handled Badly by OCR or Text Extraction (R3.3)

| PDF | Page(s) | `pymupdf` Chars / Imgs | Pipeline `extraction_method` | Exact Extraction / OCR Failure |
|---|---|---|---|---|
| **MBI** | **p.1** | `936` chars, `1` img | `text` (OCR skipped) | Embedded portal screenshot (`PEMBEKAL TIDAK BOLEH MEMBELI... TUNGGAKAN`) is invisible because `936 >= MIN_READABLE_CHARS (60)`. |
| **MBI** | **p.2** | `500` chars, `5` imgs | `text` (OCR skipped) | **Severe hybrid trap**: Only dynamic values (`S0175/26`, `221002`, `3 NOVEMBER 2026`, `3 MINGGU`) are text; labels (`KEMENTERIAN KEWANGAN :`), Tender Box location, `JAM 12.00 TENGAHARI`, red `MUSTAHAK` rejection box (`MBI-GT-05`), and `liquid paper` ban (`MBI-GT-06`) are inside 5 images and skipped. Caused Run 1 to miss `MOF 221002`. |
| **MBI** | **p.3, 4, 11, 15** | `1,358–2,364` chars, `0` imgs | `text` | `pymupdf` appends diagonal `MEJA TAWARAN` watermark at page end, while `pdfplumber` splits watermark letters into table cells and words (e.g., `meWlalui` on p.4). |
| **MBI** | **p.7, 8** | `122` / `108` chars, `3` / `1` imgs | `text` (OCR skipped) | **Threshold trap**: Header/watermark overlay exceeds 60 chars, skipping OCR and losing scanned `Borang Kontrak (AM) 9/93` (`Form of Schedule`, Performance Bond Cl. 15, signatures). |
| **MBI** | **p.9** | `355` chars, `4` imgs | `text` (OCR skipped) | Title overlay (`355 >= 60`) skips OCR; scanned `Borang Kontrak (AM) 10/93` (`Form of Tender`, signature blocks) is invisible. |
| **MBI** | **p.16–29** | `37` chars each, `2–5` imgs | `ocr_gemini_vision` / `ocr_unavailable` | 37-char watermark (`NO SEBUTHARGA : S0175/26 / MEJA TAWARAN`) triggers OCR, **but**: (a) `gemini-4-hydrogen` rejects `ThinkingLevel.MINIMAL` (`400 INVALID_ARGUMENT`), crashing OCR on **p.20** (Run 1), **p.16 & p.29** (Run 3), and **10/14 pages** (`16–21, 23, 26, 28–29`) in `run_mbi_gemini_4_hydrogen.json`; (b) green-paper BQ scans (`p.19–22`) + diagonal `MEJA TAWARAN` watermark contributed to missed clauses on p.16 (`RM256k`), p.17 (BQ rules), p.27 (DOSH/PPE), p.28 (90d validity), and p.29 (JKDM 7d letter). |
| **BNM** | **p.5** | `2,253` chars, `0` imgs | `text` | `pymupdf` wraps narrow table columns (`No. \| Category \| Scope \| Frequency`) word-per-line; Run 1 missed `BNM-GT-02`. |
| **BNM** | **p.10** | `1,556` chars, `0` imgs | `text` | `Sample label for envelope` box is extracted out of visual reading order at the bottom of p.10 after cl. 2.3(h). |
| **TNB** | **p.1–3** | `2,651 / 2,797 / 199` chars | `text` | Clean text extraction (`lowQualityPages=[]`), yet the LLM still omitted Session 2 briefing details (`p.1`) and general rejection bullets (`p.1–2`) in all 3 runs. |

---

### 5.4 Missed or Mislabelled Requirement Types with Exact Clause Text & Page (R4)

1. **TNB Missed Eligibility (`TNB-GT-01`, p.1 — missed in all 3 runs)**:
   - Exact clause: `"Tender adalah dipelawa dari kontraktor yang berdaftar dengan Kementerian Kewangan (KK)/Pusat Khidmat Kontraktor (PKK)/Lembaga Pembangunan Industri Pembinaan Malaysia (CIDB) dan Tenaga Nasional Berhad (TNB) untuk kerja-kerja berikut:"`
2. **TNB Partial Site Visit — Session 2 Omitted (`TNB-GT-03`, p.1 — omitted in all 3 runs)**:
   - Exact clause: `"• TAKLIMAT TENDER & LAWATAN TAPAK – SESI 2 • Tarikh: 23 November 2026 (Isnin) • Masa: 3.00 Petang – 5.00 Petang • Tempat: Dewan Kelab Kilat, Kuarters TNB Basecamp Pergau, 17600 Jeli, Kelantan"` (Run 1 also duplicated Session 1 into `REQ-009` and `REQ-010`).
3. **TNB Missed General Rejection Clauses (`TNB-GT-06` p.1–2, `TNB-GT-07` p.2 — missed in all 3 runs)**:
   - Exact clause (`TNB-GT-06`): `"• Petender dikehendaki membaca dan memahami keseluruhan butir-butir yang terkandung di dalam dokumen tender sebelum mengisikannya. Petender yang membuat kesilapan dan tidak mematuhi mana-mana klausa dalam dokumen tender boleh menyebabkan tawaran mereka tidak akan dipertimbangkan."`
   - Exact clause (`TNB-GT-07`): `"• Petender dikehendaki mengikuti syarat-syarat mandatori ini untuk memasuki tender dan ketidakpatuhan akan menyebabkan penyertaan tender ini ditolak."`
4. **TNB Mislabelled `category` & `is_disqualifying` (Run 1)**:
   - `TNB-GT-02, 08, 09` (`"LULUS PRA KELAYAKAN..."`, `"Supplier Self-Service (SUS Supplier)"`, `"Portal SUS"`, p.1–2) were tagged `category="mof_registration"` instead of TNB-specific registration.
   - `TNB-GT-05` (`"• Petender dikehendaki memakai pakaian keselamatan (PPE) semasa lawatan tapak diadakan."`, p.1) was marked `is_disqualifying=true` despite having no disqualification penalty.
5. **BNM Missed General Disqualification & Qualification Gate (`BNM-GT-10` p.8, `BNM-GT-13` p.9 — missed in all 3 runs)**:
   - Exact clause (`BNM-GT-10`, p.8): `"2.2 b) Disqualification – any non-compliance by the Tenderers on any requirements stipulated in this document shall entitle BNM, at its sole discretion, to disqualify the Tenderers."`
   - Exact clause (`BNM-GT-13`, p.9): `"2.3 b) All instructions, terms and conditions and specifications of services shall be met by Tenderers in order to qualify for selection of services as well as successful appointment of the Tenderer by the Bank."`
6. **BNM `is_disqualifying` False Negatives & False Positives (Run 1: 11/19 wrong)**:
   - False negatives (`false` vs `true`): `BNM-GT-03` p.5 (`"Sample packaging method for (i) and (ii) above to be submitted together with tender documents"`), `BNM-GT-14` p.9–10 (`"premature opening (and therefore rejection)"`), `BNM-GT-15` p.10 (`"Tender Box 7 or Tender Box 8"`), `BNM-GT-16` p.10 (`"submitted by facsimile, e-mail, telex, telegram or any other means will NOT be considered or accepted"`), `BNM-GT-17` p.1/10 (`"received after the closing date and time shall be invalid and will not be considered"`).
   - False positives (`true` vs `false`): `BNM-GT-04` p.6 (`"minimum Key Performance Indicator (KPI) of at least 85%"`), `BNM-GT-12` p.9 (`"clarification purposes, after the closing date"`), `BNM-GT-19` p.12 (`"enter into a service agreement..."` & `"No payment shall be payable..."`), `BNM-GT-22` p.13 (`"intellectual property rights... shall vest with the Bank"`).
7. **MBI Missed Image-Only Arrears Block (`MBI-GT-02`, p.1 — missed in all 4 MBI runs)**:
   - Exact clause: `"1. PEMBEKAL TIDAK BOLEH MEMBELI TENDER/SEBUTHARGA SEKIRANYA MEMPUNYAI TUNGGAKAN DENGAN MAJLIS. SILA SELESAIKAN TUNGGAKAN TERLEBIH DAHULU"`
8. **MBI Missed Red `MUSTAHAK` Rejection Box, Closing Time/Box & `Liquid Paper` Ban (`MBI-GT-04, 05, 06`, p.2 — missed in all 4 MBI runs)**:
   - Exact clause (`MBI-GT-05`): `"MUSTAHAK: SILA LAMPIRKAN BERSAMA BORANG TENDER / SEBUTHARGA INI DENGAN SALINAN SIJIL PENDAFTARAN, PENYATA BANK ( 3 BULAN TERKINI ) DAN PENGALAMAN KERJA ( 2 TAHUN TERAKHIR ). KEGAGALAN MENGEMUKAKAN ITEM-ITEM TERSEBUT MENYEBABKAN DOKUMEN TENDER/SEBUTHARGA TUAN INI AKAN DITOLAK."`
   - Exact clause (`MBI-GT-04`): `"Borang ini hendaklah dimasukkan ke dalam Peti Tender di Tingkat 1 , Unit Ukur Bahan dan Perolehan , Bangunan MBI"` / `"JAM 12.00 TENGAHARI."`
   - Exact clause (`MBI-GT-06`): `"diberi amaran supaya tidak menggunakan 'liquid paper' untuk memadamkan kesilapan angka..."`
9. **MBI Missed `MOF 221002` in Run 1 (`MBI-GT-03`, p.2)**:
   - Exact clause: `"KEMENTERIAN KEWANGAN : 221002 (MEMBERSIH KAWASAN)"` (missed completely in Run 1 because label `"KEMENTERIAN KEWANGAN :"` is inside an image; caught as `Gap` in Runs 2 & 3).
10. **MBI False `Gap` on Subcontractor `CIDB E11` (`MBI-GT-28` / `REQ-027`, p.18 — Run 1)**:
    - Exact clause: `"9.3 PENENDER PERLU MELANTIK SUB-KONTRAKTOR YANG AKAN MELAKUKAN KERJA-KERJA MEMBEKAL DAN MEMASANG, PENDAWAIAN DAN ALAT KELENGKAPAN ELEKTRIK YANG MEMPUNYAI PENGKHUSUSAN KOD BIDANG CIDB E11(KERJA AM ELEKTRIK)"` — Run 1 set `cidb_category=E11` with `review_required=false`, flagging a false `Gap` against the prime bidder's CIDB profile (`B04, M15, CE21`).
11. **MBI Checklist `p.3` Mis-Citations & Omitted `Surat Perwakilan Kuasa` (`MBI-GT-01, 16, 17–22, 30`)**:
    - 10 form requirements cited `p.3` (`Senarai Semak`) instead of actual form pages (`p.1–2, 5–15, 19–22`), losing `Surat Perwakilan Kuasa` (`p.5–6`: `"Bersama ini dilampirkan Surat Perwakilan Kuasa bagi saya mewakili syarikat..."` / `"2.1 Hilang kelayakan untuk dinilai dan dilantik"`), paper-color rules (yellow/pink/blue/green), and `Dokumen Meja Tawaran` rejection (`p.1`: `"DITOLAK DENGAN SERTA MERTA"`).
12. **MBI Conditional `Jika Berkaitan` Mislabelled Disqualifying (`MBI-GT-11`, p.4)**:
    - Exact clause: `"Salinan Sijil Akuan Bumiputera... (Jika Berkaitan)"` / `"Salinan Sijil Akuan Pembuat... (Jika Berkaitan)"` — flagged `is_disqualifying=true` despite `(Jika Berkaitan)` on an `(TERBUKA)` tender.
13. **MBI Scanned Specification Clauses Missed in Run 1 (`MBI-GT-23, 25, 32, 33, 34, 35`, p.16–29)**:
    - Included `HARGA INDIKATIF : RM 256,000.00` (p.16), BQ alteration ban (p.17), DOSH & 6 mandatory PPE items (p.27), 90-day validity (p.28), and JKDM 7-day registration letter (`p.29 cl. 6.1–6.3`, missed in all 4 MBI runs).
14. **Schema Prompt Root Cause for Systematic `is_disqualifying` Over-Flagging**:
    - `extract_requirements.py:57` defines `LLMRequirementItem.is_disqualifying` as: `"True for Tier B disqualifying conditions: eligibility criteria, performance bonds, compulsory site briefings, or mandatory forms/declarations."` This forces the LLM to tag post-award Performance Bonds (`MBI-GT-26`), site visits without rejection text (`MBI-GT-24`), and routine declaration forms (`MBI-GT-17..22`) as disqualifying (`18` false positives in MBI Run 1).

---

## 6. 3-Run Disqualifying-Item Consistency (R3.4) & `gemini-4-hydrogen` Comparison (R3.5)

### 6.1 3-Run Consistency Across All 3 Tenders (R3.4)

| Tender | Run | Actual `model_used` | Duration (ms) | Total Reqs | Disq Reqs | `Rule-checked` / `Gap` / `Needs review` | `low_quality_pages` | 3-Way Concept Jaccard |
|---|---|---|---:|---:|---:|---|---|---|
| **TNB** | Run 1 | `gemini-3.1-flash-lite, gemini-3-flash-preview` | 16,000.7 | 12 | 10 | `0 / 0 / 12` | `[]` | **9/11 (81.8%)** |
| **TNB** | Run 2 | `gemini-3-flash-preview` | 13,947.4 | 13 | 10 | `0 / 0 / 13` | `[]` | *(R2 == R3 100%)* |
| **TNB** | Run 3 | `gemini-3-flash-preview` | 13,149.1 | 13 | 10 | `0 / 0 / 13` | `[]` | |
| **BNM** | Run 1 | `gemini-4-hydrogen, gemini-3.1-flash-lite` | 94,607.7 | 19 | 10 | `0 / 0 / 19` | `[]` | **5/17 (29.4%)** |
| **BNM** | Run 2 | `gemini-3-flash-preview` | 14,830.9 | 15 | 12 | `0 / 0 / 15` | `[]` | *(R2 == R3 100%)* |
| **BNM** | Run 3 | `gemini-3-flash-preview` | 15,014.0 | 15 | 12 | `0 / 0 / 15` | `[]` | |
| **MBI** | Run 1 | `gemini-3.1-flash-lite` | 90,045.8 | 29 | 26 | `1 / 1 / 27` | `[20]` | **21/29 (72.4%)** |
| **MBI** | Run 2 | `gemini-3.1-flash-lite, gemini-3-flash-preview` | 350,975.4* | 27 | 25 | `0 / 1 / 26` | `[]` | *(All 3 differed)* |
| **MBI** | Run 3 | `gemini-3.1-flash-lite` | 342,339.9* | 28 | 24 | `0 / 1 / 27` | `[16, 29]` | |

*\*MBI Run 2 & Run 3 each logged 1 retry (15s backoff) after Attempt 1 failed with `504 DEADLINE_EXCEEDED` -> `503` -> `gemini-4-hydrogen` fallback. During MBI Run 2, `gemini-3-flash-preview` hit its 20 req/day free-tier limit (`429`), routing Run 3 via `gemini-3.1-flash-lite`.*

- **Exact Diffs Between Runs**:
  - **TNB**: Runs 2 & 3 were byte-identical (`13` reqs, `10` disq). Run 1 differed on 2 items: `PPE` flipped `true -> false` in Runs 2/3, and Runs 2/3 split `surat wakil kuasa` into duplicate `REQ-012`.
  - **BNM**: Runs 2 & 3 were byte-identical (`15` reqs, `12` disq). Run 1 diverged on **12 items**: 7 flipped `false -> true` in Runs 2/3 (closing date, packaging samples, 3 envelopes, Tender Box 7/8, fax/email ban, bank particulars, bank statement on award) and 5 flipped `true -> false/omitted` (85% KPI, Service Agreement, no payment until signed, clarification presentation, IP indemnity).
  - **MBI**: All 3 runs differed on **8 disqualifying concepts** (`MOF 221002` absent in R1 / `Gap` in R2–3; `MOF Registration Cert` `Rule-checked` in R1 / absent in R2–3; `MOF Bumiputera/Pembuat` & `BQ` in R1 only; `Borang Sebut Harga` absent in R3; `Dokumen Meja Tawaran` rejection in R2 only; `6 PPE items` in R2–3 only; `Performance Bond 2.5%` duplicated on p.17 & p.19 in R3). Crucially, deterministic assessment flipped from `1 Rule-checked + CIDB E11 Gap` (Run 1) to `0 Rule-checked + MOF 221002 Gap` (Runs 2 & 3).

---

### 6.2 `gemini-4-hydrogen` vs Current Model Comparison (`MBI_462325MEJA.pdf`, R3.5)

- **Crash & Fallback Reality**: Requesting `model_name="gemini-4-hydrogen"` resulted in **0 successful calls on `gemini-4-hydrogen`** (`actual model_used: "gemini-3.1-flash-lite"`, duration `114.6s`):
  1. `_ocr_with_gemini_vision` (`extract_requirements.py:212–214`) passes `ThinkingLevel.MINIMAL`, which `gemini-4-hydrogen` **rejects with HTTP `400 INVALID_ARGUMENT`**. Because `400` is not in `_generate_content_with_fallback`'s retry tuple `(404, 429, 500, 503, 504)`, **10 of 14 scanned pages (`16, 17, 18, 19, 20, 21, 23, 26, 28, 29`) crashed OCR immediately** and emitted 10 `UNREADABLE_PAGE_SAFEGUARD` rows.
  2. The remaining 4 OCR pages (`22, 24, 25, 27`) and Pass 1/2 (`ThinkingLevel.LOW`) hit `429` (5 RPM limit), `503`, or `504` on `gemini-4-hydrogen` and fell back to `gemini-3.1-flash-lite`.

| Metric (`MBI_462325MEJA.pdf`) | Run 1 Baseline (`run1_mbi.json`) | Runs 2 & 3 Baseline | `gemini-4-hydrogen` Run (`run_mbi_gemini_4_hydrogen.json`) |
|---|---|---|---|
| Requested -> Actual `model_used` | `gemini-3-flash-preview` -> `gemini-3.1-flash-lite` | `gemini-3.1-flash-lite, gemini-3-flash-preview` / `gemini-3.1-flash-lite` | `gemini-4-hydrogen` -> **`gemini-3.1-flash-lite`** |
| Duration | `90.0s` | `351.0s` / `342.3s` | `114.6s` |
| `low_quality_pages` (OCR crashed) | `[20]` (1 page) | `[]` / `[16, 29]` (2 pages) | **`[16, 17, 18, 19, 20, 21, 23, 26, 28, 29]` (10 pages)** |
| Total Reqs (Extracted + Safeguard) | `29` (`28 + 1`) | `27` (`27 + 0`) / `28` (`26 + 2`) | **`35` (`25 + 10`)** |
| `Rule-checked` / `Gap` / `Needs review` | `1 (mof_active) / 1 (E11) / 27` | `0 / 1 (221002) / 26–27` | `1 (mof_active) / 1 (221002) / 33` |
| Disq GT Recall (Full / Incl. Partial) | `1/11 (9.1%)` / `8/11 (72.7%)` | — | `2/11 (18.2%)` / `9/11 (81.8%)` |
| All GT Recall (Full / Incl. Partial) | `6/35 (17.1%)` / **`23/35 (65.7%)`** | — | `5/35 (14.3%)` / **`17/35 (48.6%)`** |
| Key Trade-offs | Missed `MOF 221002`; false `E11` Gap | Caught `MOF 221002` & PPE | Caught `MOF 221002`, `satu jilid`, DOSH/PPE; **lost 10 scanned pages** (site visit, bond, insurances, `E11`, `Fi Perkhidmatan`, forestry permit, 90d validity, JKDM 7d, working hours) |

---

## 7. Top 5 Things to Fix Before a Demo (Ordered by Risk) (R4)

1. **[#1 — Highest Risk] Fix `ThinkingLevel.MINIMAL` `400 INVALID_ARGUMENT` Crash on `gemini-4-hydrogen` OCR**
   - **Location**: `extract_requirements.py:172, 212–214`
   - **Root Cause & Impact**: `_ocr_with_gemini_vision` hardcodes `ThinkingLevel.MINIMAL`, which `gemini-4-hydrogen` rejects with HTTP `400` (excluded from fallback). Whenever primary OCR falls back to `gemini-4-hydrogen`, scanned pages crash to `ocr_unavailable` (broke MBI p.20 in Run 1, p.16/29 in Run 3, and 10/14 pages in R3.5).
   - **Recommended Fix**: Omit `thinking_config` (or map `ThinkingLevel.LOW` per model) in `_ocr_with_gemini_vision`, and allow fallback on model-specific `400` parameter errors.

2. **[#2 — High Risk] Fix Hybrid/Watermarked Page OCR Bypass (`MIN_READABLE_CHARS = 60`)**
   - **Location**: `extract_requirements.py:44, 260`
   - **Root Cause & Impact**: `needs_ocr = len(raw_text) < 60 or _is_gibberish(raw_text)` ignores `image_count` and watermark/header overlays. MBI p.1 (`936` chars), p.2 (`500` chars), p.7 (`122`), p.8 (`108`), and p.9 (`355`) skipped OCR completely, hiding `MBI-GT-02` (arrears block), `MBI-GT-05` (red `MUSTAHAK` rejection box), `JAM 12.00 TENGAHARI`, and causing Run 1 to miss `MOF 221002`.
   - **Recommended Fix**: Trigger vision extraction/OCR when `image_count > 0` and image area/count indicates embedded forms/tables (not small header logos), and strip repeating watermark strings before measuring text density.

3. **[#3 — High Risk] Prevent Subcontractor/Conditional Requirements from Triggering False Prime-Contractor `Gap`s**
   - **Location**: `extract_requirements.py:47–80`, `schema.py`, `rules_engine.py:380–443`
   - **Root Cause & Impact**: Clause 9.3 (`MBI` p.18) requires appointing an electrical *sub-contractor* holding `CIDB E11`. Run 1 emitted `cidb_category=E11` with `review_required=false`, flagging a false-positive disqualifying `Gap` against the prime contractor's profile while missing `MOF 221002`.
   - **Recommended Fix**: Add a `subject_entity` / `applies_to` field (`prime_bidder` vs `subcontractor` vs `conditional`) in extraction schema and instruct `rules_engine.py` to route non-prime/conditional items to `needs_review` instead of `gap`.

4. **[#4 — Medium-High Risk] Fix `is_disqualifying` Prompt Bias & Cross-Model Fallback Instability**
   - **Location**: `extract_requirements.py:39–43, 56–58`
   - **Root Cause & Impact**: `LLMRequirementItem.is_disqualifying` field description explicitly instructs the LLM to mark *all* performance bonds, compulsory site briefings, and mandatory forms/declarations as `is_disqualifying=True` even without rejection wording (producing 18 false positives on MBI), and fallback across `gemini-3-flash-preview` / `gemini-3.1-flash-lite` / `gemini-4-hydrogen` yielded `29.4%` 3-way Jaccard on BNM.
   - **Recommended Fix**: Narrow `is_disqualifying` schema guidance strictly to explicit rejection/ineligibility/pre-qualification gates, map missing rule targets (`date_validity:tender_closing_date`, `status_flag:tcc_status`, `is_malaysian_registered`), and prompt forms to cite their substantive page rather than checklist summaries.

5. **[#5 — Medium Risk] Fix Mobile (`390px`) Review Header Horizontal Overflow (`BUG-UI-01`)**
   - **Location**: `frontend/app/page.tsx:449`
   - **Root Cause & Impact**: `shrink-0` on `<div className="flex flex-wrap items-center gap-2 shrink-0">` prevents flex-wrapping within 390px viewports (`scrollWidth: 424 > innerWidth: 390`), pushing `"Export PDF report"` past the right screen edge on mobile demos. Also widen `report.py:194` `Page` column (`11*mm` -> `13*mm`) to stop `"Pag\ne"` wrapping (`BUG-UI-03`).
   - **Recommended Fix**: Remove `shrink-0` (or apply `sm:shrink-0`) on `frontend/app/page.tsx:449`.
