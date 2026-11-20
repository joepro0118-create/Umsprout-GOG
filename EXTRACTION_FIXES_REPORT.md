# TenderMate Extraction Reliability Fixes & Re-Evaluation Report

**Date**: 2026-11-20  
**Pinned Model**: `gemini-3-flash-preview` (`PROMPT_VERSION = "v2.0"`)  
**Company Profile**: `COMP-001` (`Syarikat Kejuruteraan Aman Sdn. Bhd.`, `data/company_profile.json`, unmodified, SHA256 `1DBC0F6740909A86E998B5D22623926BDABE6510236517B6FE045A680943494C`)

---

## 1. Executive Summary

All 9 extraction reliability, rule-targeting, UI/PDF, and free-tier budget fixes specified from `TEST_REPORT.md` have been implemented, unit-tested (**42 passed, 0 failed**), and re-evaluated on the 3 real Malaysian tender PDFs (`MBI_462325MEJA.pdf`, `Notis_Tender_RFX_4000054778.pdf`, `BNM_Request_for_Proposal_OSS.pdf`) using a single pinned model (`gemini-3-flash-preview`).

- **Disqualifying Recall (Combined Run 1)**:
  - **Full Match**: Improved from **14/32 (43.8%)** to **23/32 (71.9%)** (**+28.1 pp**; MBI jumped from **1/11 [9.1%]** to **8/11 [72.7%]**).
  - **Including Partial**: Improved from **24/32 (75.0%)** to **29/32 (90.6%)** (**+15.6 pp**; MBI reached **11/11 [100.0%]**).
  - **Extracted AND Correctly Flagged `is_disqualifying=True`**: Improved from **19/32 (59.4%)** to **29/32 (90.6%)** (**+31.2 pp**).
- **Tier B False Positives**: Reduced from **24** (`1` TNB + `5` BNM + `18` MBI) to **0** across all 4 re-evaluation runs.
- **Wrong / Mislabelled & Duplicated Items (Run 1)**: Reduced from **38 wrong/mislabelled** and **4 duplicates** to **0 wrong/mislabelled** and **0 duplicates** in Run 1 (`1` translated excerpt flagged `EXCERPT_NOT_VERIFIED_ON_PAGE` in MBI Run 2).
- **Headline Gap & Rule-Checked Accuracy**:
  - **MBI (`MBI_462325MEJA.pdf`)**: The false-positive `CIDB E11` subcontractor `Gap` is **eliminated** (`applies_to="subcontractor"` -> `Needs review`, `is_disqualifying=False`), and the true prime-bidder disqualifying **`Gap` on `MOF 221002 (MEMBERSIH KAWASAN)`** is **caught deterministically** (`RULE_MOF_CODE_MEMBERSHIP`, `p.2`) in both MBI Run 1 and MBI Run 2, alongside **2 `Rule-checked` matches** (`mof_active` via `DOC-MOF-001` and `ssm_active` via `DOC-SSM-001`).
  - **BNM (`BNM_Request_for_Proposal_OSS.pdf`)**: `Malaysian registered company` (`p.8`, Cl. 2.1(a)) now evaluates deterministically to **`Rule-checked`** (`RULE_STATUS_FLAG` -> `ssm_active == True`, `DOC-SSM-001`).
- **Free-Tier Quota Survival**: All 4 required runs (`MBI run 1`, `TNB run 1`, `BNM run 1`, `MBI run 2`) plus a full-cache verification pass completed without hitting quota exhaustion using **9 live API calls total** (`6` for MBI Run 1, `1` for TNB Run 1, `1` for BNM Run 1, `1` for MBI Run 2 with `19` cached OCR pages, and `0` live calls / `20` cache hits on full-cache verification).

---

## 2. Every Change Made (Files & Line Ranges)

| Fix # | File | Line Range | Description of Change |
|---|---|---|---|
| **1 (Hybrid OCR & Watermarks)** | `schema.py` | `40–47` | Added `"text+ocr"` to `PageExtractionMethod` literal. |
| **1 (Hybrid OCR & Watermarks)** | `extract_requirements.py` | `234–335`, `944–1128` | Added `strip_watermarks()` (removes `"MEJA TAWARAN"`, `"NO SEBUTHARGA : ..."`), `_meaningful_char_count()`, `_has_significant_images()` (triggers vision OCR when `image_count > 0` and image bounding box area >= 5% of page area, skipping tiny logos like TNB 0.6% and BNM 2.5%), and `merge_text_and_ocr()`. Updated `extract_pdf_pages()` to emit `extraction_method="text+ocr"` on hybrid pages and preserve `low_quality_pages` + unreadable safeguard for pages still illegible post-OCR. |
| **2 (One Pinned Model)** | `extract_requirements.py` | `43–55`, `598–707`, `1553–1660` | Removed silent multi-model fallback list. Pinned a single model per run (`DEFAULT_MODEL = "gemini-3-flash-preview"`, configurable via `GEMINI_MODEL` env var or `--model`). `_generate_content_pinned()` retries the **same** model with exponential backoff on `429`/`500`/`503`/`504` (respecting `retryDelay <= 120s`) and records the exact `model_used`. |
| **3 (`gemini-4-hydrogen` OCR Config)** | `extract_requirements.py` | `454–493` | Removed `ThinkingLevel.MINIMAL` from OCR calls. Added `_thinking_config_for_model()` and `build_generation_config_for_model()` using `ThinkingLevel.LOW` across supported models so `gemini-4-hydrogen` never fails with `400 INVALID_ARGUMENT`. |
| **4 (Deterministic Tier B)** | `schema.py` | `61–90`, `140–425`, `608–677` | Replaced LLM `is_disqualifying` decision with `has_rejection_language` + `rejection_quote` in `LLMRequirementItem`. Added `detect_rejection_language()` and `compute_is_disqualifying()` enforcing deterministic Tier B rules (`has_rejection_language`, mandatory prime-bidder eligibility registrations, compulsory briefings/site visits) and default non-disqualifying exclusions (post-award bonds/insurances, routine forms without rejection text, conditional `"jika berkaitan"` items, subcontractor items, commercial/KPI/IP/PPE terms). |
| **5 (`applies_to` & Subcontractors)** | `schema.py` | `48`, `69–72`, `273–291`, `630–637` | Added `AppliesTo = Literal["prime_bidder", "subcontractor", "conditional", "unknown"]` and `infer_applies_to()`. |
| **5 (`applies_to` & Subcontractors)** | `rules_engine.py` | `209–222`, `818–856` | Added `applies_to` to `_build_tender_condition()` and updated `evaluate_requirement()` so only `applies_to == "prime_bidder"` can evaluate to `gap`; `subcontractor`, `conditional`, and `unknown` items return `needs_review` with an explicit explanation naming `applies_to`. |
| **6 (Substantive Page Citations)** | `schema.py` | `428–519`, `555–577`, `679–707` | Added `resolve_substantive_page_citation()` and `_strip_checklist_note()` to re-point checklist citations (`Senarai Semak` p.3–4) to the substantive form/clause page when present in the PDF and append `[Also listed on checklist page N]` to `source_excerpt`. Updated `SYSTEM_INSTRUCTION` Rule 8. |
| **7 (Missing Rule Targets)** | `rules_engine.py` | `960–1109` | Added deterministic mappings in `evaluate_requirement()` for `status_flag` aliases (`ssm_active`, `ssm_registration`, `is_malaysian_registered`, `malaysian_registered_company` -> `profile.status_flags["ssm_active"]`; plus MOF/CIDB/Bumiputera aliases) and `date_validity` with `tender_closing_date` / `closing_date` / `submission_deadline` (routing credential checks to CIDB/MOF/Bumiputera and keeping pure submission deadlines as `needs_review`). Unmapped flags (e.g. `tcc_patuh`) remain `needs_review` without inventing company data. |
| **8 (Frontend & Report Width)** | `frontend/app/page.tsx` | `478` | Removed `shrink-0` from `<div className="flex flex-wrap items-center gap-2">` to eliminate the +34px horizontal overflow at 390px mobile width (`BUG-UI-01`). |
| **8 (Frontend & Report Width)** | `report.py` | `194` | Widened `Requirement inventory` table `Page` column from `11 * mm` to `13 * mm` (`[16 * mm, 13 * mm, 13 * mm, 26 * mm, 78 * mm, 24 * mm]`) so `"Page"` no longer wraps as `"Pag\ne"` (`BUG-UI-03`). |
| **9 (Free-Tier Budget Handling)** | `extract_requirements.py` | `49–118`, `496–941`, `1150–1236`, `1695–1760` | Added: (9a) disk cache under `data/llm_cache/` keyed by `(pdf_sha256, step_id, model_name, PROMPT_VERSION)`, `PROMPT_VERSION = "v2.0"`, and `--no-cache`; (9b) `QuotaExhaustedError` (`status="quota_exhausted"`) and checkpoint writer under `data/llm_cache/checkpoints/` when `retryDelay > 120s` or daily limit reached, resuming automatically from cached steps; (9c) `_ocr_batch_with_gemini_vision()` batching up to 4 page images per request with per-page cache and single-page fallback on parse failure; (9d) merged single-call extraction + coverage self-audit pass (`run_single_merged_extraction_pass`) and `LLMCallStats` logging (`live_calls` vs `cache_hits`); (9e) `RateLimiter` enforcing 5 requests/min (`12.0s` interval) on live calls. |
| **9a (Git Ignore)** | `.gitignore` | `13` | Added `data/llm_cache/` to `.gitignore`. |

---

## 3. Unit Tests Added (`tests/test_extraction_reliability_fixes.py`)

All **26 existing tests** across `tests/test_phase1_extraction.py`, `tests/test_phase2_rules_engine.py`, and `tests/test_phase3_api.py` continue to pass, and **16 new tests** (parameterized across 3 models = **42 total passing tests** in `3.18s`) were added in `tests/test_extraction_reliability_fixes.py`:

1. `test_strip_watermarks_and_merge_text_and_ocr` (Fix 1)
2. `test_significant_image_detection_skips_tiny_logos_and_triggers_hybrid_ocr` (Fix 1)
3. `test_pinned_model_retries_same_model_and_never_switches` (Fix 2)
4. `test_pinned_model_fails_clearly_without_switching_when_retries_exhausted` (Fix 2)
5. `test_request_config_valid_for_each_supported_model[gemini-3-flash-preview]` (Fix 3)
6. `test_request_config_valid_for_each_supported_model[gemini-3.1-flash-lite]` (Fix 3)
7. `test_request_config_valid_for_each_supported_model[gemini-4-hydrogen]` (Fix 3)
8. `test_deterministic_tier_b_on_real_clauses_from_test_report` (Fix 4 — tests 18 real clauses from `TEST_REPORT.md` §5.4)
9. `test_mbi_e11_subcontractor_clause_produces_needs_review_not_gap` (Fix 5)
10. `test_checklist_citation_upgraded_to_substantive_page` (Fix 6)
11. `test_missing_rule_targets_ssm_aliases_and_tender_closing_date` (Fix 7)
12. `test_disk_cache_hit_makes_no_api_call_and_no_cache_flag_bypasses` (Fix 9a)
13. `test_checkpoint_and_resume_on_quota_exhausted` (Fix 9b)
14. `test_batch_ocr_falls_back_to_single_page_when_unparseable` (Fix 9c)
15. `test_rate_limiter_enforces_5_rpm_spacing` (Fix 9e)
16. `test_fix8_frontend_shrink0_removed_and_report_page_col_widened` (Fix 8)

---

## 4. Before vs. After Re-Evaluation Results

### 4.1 Per-Tender & Combined Summary Table (Baseline Run 1 vs. After-Fixes Run 1 & MBI Run 2)

| Metric | TNB Before (`run1_tnb`) | TNB After (`after_tnb_run1`) | BNM Before (`run1_bnm`) | BNM After (`after_bnm_run1`) | MBI Before (`run1_mbi`) | MBI After R1 (`after_mbi_run1`) | MBI After R2 (`after_mbi_run2`) | **Combined Before (3 Tenders)** | **Combined After R1 (3 Tenders)** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Ground-Truth Items (Total / Disq)** | 11 / 9 | 11 / 9 | 22 / 12 | 22 / 12 | 35 / 11 | 35 / 11 | 35 / 11 | **68 / 32** | **68 / 32** |
| **Actual `model_used`** | Mixed (`3.1-lite, 3-flash`) | **`gemini-3-flash-preview`** | Mixed (`4-hydrogen, 3.1-lite`) | **`gemini-3-flash-preview`** | `gemini-3.1-flash-lite` | **`gemini-3-flash-preview`** | **`gemini-3-flash-preview`** | Mixed (3 models) | **Pinned `gemini-3-flash-preview`** |
| **Live API Calls / Cache Hits** | 2 / 0 | **1 / 0** | 2+ / 0 | **1 / 0** | 16+ / 0 | **6 / 0** | **1 / 19** *(0/20 full cache)* | ~20+ / 0 | **8 / 0** *(+1/19 on MBI R2)* |
| **Failed OCR Pages (`low_quality_pages`)** | `[]` (0) | **`[]` (0)** | `[]` (0) | **`[]` (0)** | `[20]` (1) | **`[]` (0)** | **`[]` (0)** | **1 page** | **0 pages** |
| **System Reqs Extracted** | 12 | 10 | 19 | 14 | 29 (28+1) | 22 | 20 | **60** | **46** |
| **Disq GT Recall (Full Match)** | 5/9 (55.6%) | **7/9 (77.8%)** | 8/12 (66.7%) | **8/12 (66.7%)** | 1/11 (9.1%) | **8/11 (72.7%)** | **7/11 (63.6%)** | **14/32 (43.8%)** | **23/32 (71.9%)** |
| **Disq GT Recall (Incl. Partial)** | 6/9 (66.7%) | **8/9 (88.9%)** | 10/12 (83.3%) | **10/12 (83.3%)** | 8/11 (72.7%) | **11/11 (100.0%)** | **10/11 (90.9%)** | **24/32 (75.0%)** | **29/32 (90.6%)** |
| **Disq GT Extracted AND `is_disq=true`** | 6/9 (66.7%) | **8/9 (88.9%)** | 5/12 (41.7%) | **10/12 (83.3%)** | 8/11 (72.7%) | **11/11 (100.0%)** | **10/11 (90.9%)** | **19/32 (59.4%)** | **29/32 (90.6%)** |
| **All GT Recall (Full / Incl. Partial)** | 7/11 / 8/11 | **9/11 / 10/11** | 12/22 / 15/22 | **11/22 / 14/22** | 6/35 / 23/35 | **18/35 / 21/35** | **18/35 / 21/35** | **25/68 / 46/68** | **38/68 (55.9%) / 45/68 (66.2%)** |
| **Tier B (`is_disq`) False Positives** | 1 | **0** | 5 | **0** | 18 | **0** | **0** | **24** | **0** |
| **Wrong / Mislabelled System Items** | 5 | **0** | 11 | **0** | 22 | **0** | **1** *(translated excerpt)* | **38** | **0** *(Run 1)* |
| **Duplicated System Items** | 2 | **0** | 2 | **0** | 0 | **0** | **0** | **4** | **0** |
| **Headline `Rule-checked` / `Gap` / `Needs review`** | `0 / 0 / 12` | **`0 / 0 / 10`** | `0 / 0 / 19` | **`1 (SSM) / 0 / 13`** | `1 / 1 (false E11) / 27` | **`2 (MOF, SSM) / 1 (real MOF 221002) / 19`** | **`2 (MOF, SSM) / 1 (real MOF 221002) / 17`** | `1 / 1 (false) / 58` | **`3 / 1 (real) / 42`** |

---

### 4.2 Item-by-Item Ground-Truth Comparison Tables (After Fixes)

#### Tender 1: `Notis_Tender_RFX_4000054778.pdf` (`eval_runs/after_tnb_run1.json`)

| Ground-Truth Item | Before (`run1_tnb`) | After (`after_tnb_run1`) | Status Given | Correct Page? | `is_disqualifying` Correct? |
|---|---|---|---|---|---|
| `TNB-GT-01` (p.1, `disq=true`): Registered with KK/PKK/CIDB AND TNB | no | no | — | — | — |
| `TNB-GT-02` (p.1, `disq=true`): Passed TNB Pre-Qualification (*Soft Services*) | yes (`REQ-001`, mislabelled `mof_registration`) | **yes (`REQ-001`, `cat=other`)** | Needs review | yes (p.1) | yes (`true`) |
| `TNB-GT-03` (p.1, `disq=true`): Compulsory Briefing & Site Visit at BOTH sessions (Session 1 Tanah Merah 9am AND Session 2 Pergau Jeli 3pm) | partial (`REQ-002, 009, 010` — omitted Session 2 & duplicated) | **yes (`REQ-002` — includes BOTH Session 1 and Session 2, 0 duplicates)** | Needs review | yes (p.1) | yes (`true`) |
| `TNB-GT-04` (p.1, `disq=true`): Only cert holder may attend; else `surat wakil kuasa` | yes (`REQ-003, 011`) | **yes (`REQ-003`)** | Needs review | yes (p.1) | yes (`true`) |
| `TNB-GT-05` (p.1, `disq=false`): Wear safety attire / PPE during site visit | yes (`REQ-004`, wrong `disq=true`) | **yes (`REQ-004`)** | Needs review | yes (p.1) | **yes (`false`)** |
| `TNB-GT-06` (p.1–2, `disq=true`): Read & understand all details; errors/non-compliance may cause non-consideration | no | **yes (`REQ-006`)** | Needs review | yes (p.1) | yes (`true`) |
| `TNB-GT-07` (p.2, `disq=true`): Follow all mandatory entry conditions; non-compliance causes rejection | no | **partial** (quoted in `REQ-001` `rejection_quote`) | Needs review | yes (p.1–2) | yes (`true`) |
| `TNB-GT-08` (p.2, `disq=true`): Registered as TNB SUS Supplier | yes (`REQ-005`, mislabelled `mof_registration`) | **yes (`REQ-007`, `cat=other`)** | Needs review | yes (p.2) | yes (`true`) |
| `TNB-GT-09` (p.2, `disq=true`): All relevant certificates updated in SUS Portal | yes (`REQ-006`, mislabelled `mof_registration`) | **yes (`REQ-008`, `cat=mandatory_documents`)** | Needs review | yes (p.2) | yes (`true`) |
| `TNB-GT-10` (p.1–2, `disq=true`): Electronic submission (`e-Tender`) by 30 Nov 2026 5pm; manual/copy rejected | yes (`REQ-007` p.2, `REQ-008` p.1) | **yes (`REQ-005` p.1, `REQ-009` p.2)** | Needs review | yes (p.1, 2) | yes (`true`) |
| `TNB-GT-11` (p.2, `disq=false`): Existing suppliers claiming SST must email JKDM approval letter | yes (`REQ-012`) | **yes (`REQ-010`, `applies_to=conditional`)** | Needs review | yes (p.2) | yes (`false`) |

#### Tender 2: `BNM_Request_for_Proposal_OSS.pdf` (`eval_runs/after_bnm_run1.json`)

| Ground-Truth Item | Before (`run1_bnm`) | After (`after_bnm_run1`) | Status Given | Correct Page? | `is_disqualifying` Correct? |
|---|---|---|---|---|---|
| `BNM-GT-01` (p.3, `disq=false`): Statutory & regulatory compliance (cl. 3(c)) | no | no | — | — | — |
| `BNM-GT-02` (p.5, `disq=false`): Supply 2 OSS categories for 4-year tenure (cl. 1.1) | no | no | — | — | — |
| `BNM-GT-03` (p.5, `disq=true`): Packaging pricing & sample packaging submitted with tender | partial (`REQ-002`, wrong `disq=false`) | **partial (`REQ-006`)** | Needs review | yes (p.5) | **yes (`true`)** |
| `BNM-GT-04` (p.6, `disq=false`): Monthly KPI >= 85% & Delivery location | partial (`REQ-015`, wrong `disq=true`) | **partial (`REQ-014`)** | Needs review | yes (p.6) | **yes (`false`)** |
| `BNM-GT-05` (p.8, `disq=true`): Malaysian registered company (cl. 2.1(a)) | yes (`REQ-003`, unstructured `Needs review`) | **yes (`REQ-001`, mapped to `ssm_active`)** | **`Rule-checked`** | yes (p.8) | yes (`true`) |
| `BNM-GT-06` (p.8, `disq=true`): At least 3 years' OSS experience (cl. 2.1(b)) | yes (`REQ-004`) | **yes (`REQ-002`)** | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-07` (p.8, `disq=true`): 4 years positive net worth 2017–2020 (cl. 2.1(c)) | yes (`REQ-005`) | **yes (`REQ-003`)** | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-08` (p.8, `disq=true`): Declaration of no litigation/dispute (cl. 2.1(d)) | yes (`REQ-006`) | **yes (`REQ-004`)** | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-09` (p.8, `disq=true`): Supply ALL required items per Section 1.1 (cl. 2.1(e)) | yes (`REQ-007`) | **yes (`REQ-005`)** | Needs review | yes (p.8) | yes (`true`) |
| `BNM-GT-10` (p.8, `disq=true`): Disqualification clause 2.2(b) | no | no | — | — | — |
| `BNM-GT-11` (p.9, `disq=false`): Fixed & firm price (cl. 2.2(d), 2.2(f)) | no | no | — | — | — |
| `BNM-GT-12` (p.9, `disq=false`): Post-closing clarification presentation (cl. 2.2(g)) | yes (`REQ-018`, wrong `disq=true`) | no | — | — | — |
| `BNM-GT-13` (p.9, `disq=true`): All instructions/specs met to qualify (cl. 2.3(b)) | no | no | — | — | — |
| `BNM-GT-14` (p.9–10, `disq=true`): 3 separate envelopes (A, B, C) + proper sealing/labelling or rejection | partial (`REQ-008`, wrong `disq=false`) | **yes (`REQ-007`, includes cl. 2.3(f) rejection quote)** | Needs review | yes (p.9) | **yes (`true`)** |
| `BNM-GT-15` (p.10, `disq=true`): Deposit in Tender Box 7 or 8, Sasana Kijang | yes (`REQ-009`, wrong `disq=false`) | **partial (`REQ-009`)** | Needs review | yes (p.10) | **yes (`true`)** |
| `BNM-GT-16` (p.10, `disq=true`): Ban on fax, email, telex, telegram, or other means | yes (`REQ-010`, wrong `disq=false`) | **yes (`REQ-009`)** | Needs review | yes (p.10) | **yes (`true`)** |
| `BNM-GT-17` (p.1, 10, `disq=true`): Closing date Friday 4 June 2021, 3:00 p.m.; late bids invalid | yes (`REQ-001, 011` duplicated, wrong `disq=false`) | **yes (`REQ-008`, single deduplicated row)** | Needs review | yes (p.10) | **yes (`true`)** |
| `BNM-GT-18` (p.11, `disq=false`): Withdrawal Declaration Form X (cl. 2.3(i)) | yes (`REQ-012`) | **yes (`REQ-010`, `applies_to=conditional`)** | Needs review | yes (p.11) | yes (`false`) |
| `BNM-GT-19` (p.12, `disq=false`): Formal Service Agreement & non-negotiable liability/LD | yes (`REQ-016, 017` duplicated, wrong `disq=true`) | **yes (`REQ-011`, single row)** | Needs review | yes (p.12) | **yes (`false`)** |
| `BNM-GT-20` (p.12, `disq=false`): Declare bank particulars & submit bank statement for e-payment | yes (`REQ-013, 014`) | **yes (`REQ-012, 013`)** | Needs review | yes (p.12) | yes (`false`) |
| `BNM-GT-21` (p.11–12, `disq=false`): Confidentiality obligation | no | no | — | — | — |
| `BNM-GT-22` (p.13, `disq=false`): IP rights & indemnity | yes (`REQ-019`, wrong `disq=true`) | no | — | — | — |

#### Tender 3: `MBI_462325MEJA.pdf` (`eval_runs/after_mbi_run1.json` & `after_mbi_run2.json`)

| Ground-Truth Item | Before (`run1_mbi`) | After Run 1 (`after_mbi_run1`) | After Run 2 (`after_mbi_run2`) | Status Given | Correct Page? | `is_disqualifying` Correct? |
|---|---|---|---|---|---|---|
| `MBI-GT-01` (p.1, `disq=true`): Do NOT submit `Dokumen Meja Tawaran` (`DITOLAK DENGAN SERTA MERTA`) | partial (`REQ-005` wrong p.3) | **yes (`REQ-002` p.1)** | **yes (`REQ-002` p.1)** | Needs review | **yes (p.1)** | yes (`true`) |
| `MBI-GT-02` (p.1 `[scanned]`, `disq=true`): MBI arrears (`tunggakan`) purchase block | no | **yes (`REQ-001` p.1 via `text+ocr`)** | **yes (`REQ-001` p.1)** | Needs review | **yes (p.1)** | yes (`true`) |
| `MBI-GT-03` (p.2 `[scanned+text]`, `disq=true`): **MOF code `221002 (MEMBERSIH KAWASAN)`** | no | **yes (`REQ-003` p.2 via `text+ocr`)** | **yes (`REQ-003` p.2)** | **`Gap` (real!)** | **yes (p.2)** | yes (`true`) |
| `MBI-GT-04` (p.2 `[scanned+text]`, `disq=true`): Closing `3 NOVEMBER 2026 JAM 12.00 TENGAHARI` | partial (`REQ-009` missing time) | **yes (`REQ-004` p.2 incl. `12.00 TENGAHARI`)** | **yes (`REQ-004` p.2)** | Needs review | **yes (p.2)** | yes (`true`) |
| `MBI-GT-05` (p.2 `[scanned]`, `disq=true`): Red `MUSTAHAK` rejection box (reg cert, 3m bank statements, 2yr experience or `AKAN DITOLAK`) | no | **yes (`REQ-005, 006, 007`)** | **yes (`REQ-005, 006, 007`)** | `Rule-checked` (`REQ-005`) / Needs review | **yes (p.2, 15)** | yes (`true`) |
| `MBI-GT-06` (p.2 `[scanned]`, `disq=false`): Ban on `'liquid paper'`; initial corrections | no | **yes (`REQ-008` p.2 via `text+ocr`)** | **yes (`REQ-008` p.2)** | Needs review | **yes (p.2)** | yes (`false`) |
| `MBI-GT-07` (p.3–4, `disq=false`): Bind in one single volume (`satu jilid`) | no | **yes (`REQ-009` p.3)** | **yes (`REQ-009` p.3)** | Needs review | **yes (p.3)** | yes (`false`) |
| `MBI-GT-09` (p.4, `disq=true`): SSM certificate + Business & Owner info on yellow paper | partial (`REQ-018`, `Needs review`) | **yes (`REQ-010` p.4, `ssm_active`)** | **yes (`REQ-010` p.4, `ssm_active`)** | **`Rule-checked`** | **yes (p.4)** | yes (`true`) |
| `MBI-GT-10` (p.4, `disq=true`): MOF Registration Certificate | partial (`REQ-002` p.4) | **partial (`REQ-005` p.2, `mof_active`)** | **partial (`REQ-005` p.2, `mof_active`)** | **`Rule-checked`** | yes (p.2) | yes (`true`) |
| `MBI-GT-11` (p.4, `disq=false`): MOF Bumiputera & Manufacturer certs *(Jika Berkaitan)* | partial (`REQ-019, 020`, wrong `disq=true`) | **partial (`REQ-011` p.4, `applies_to=conditional`)** | no | Needs review | **yes (p.4)** | **yes (`false`)** |
| `MBI-GT-12` (p.4, 29, `disq=true`): LHDN TCC `PATUH`, MyTax scannable (`tidak layak untuk dipertimbangkan`) | partial (`REQ-003` p.4) | **yes (`REQ-012` p.29)** | **yes (`REQ-011` p.29)** | Needs review | **yes (p.29)** | yes (`true`) |
| `MBI-GT-13` (p.4, `disq=true`): 3-month bank statements | partial (`REQ-021` p.4) | **partial (`REQ-006` p.2)** | **partial (`REQ-006` p.2)** | Needs review | yes (p.2) | yes (`true`) |
| `MBI-GT-14` (p.4, `disq=true`): Last 2 years work experience / CPCs | yes (`REQ-022` p.4) | **partial (`REQ-007` p.15)** | **partial (`REQ-007` p.15)** | Needs review | yes (p.15) | yes (`true`) |
| `MBI-GT-16` (p.5–6, `disq=true`): `Surat Akuan Pembida` (`Hilang kelayakan`) | partial (`REQ-006` wrong p.3) | **yes (`REQ-013` substantive p.5)** | no | Needs review | **yes (p.5)** | yes (`true`) |
| `MBI-GT-22` (p.15, `disq=false`): `Borang Kontrak (AM) 2/91` — 2-year work experience form | partial (`REQ-016` wrong p.3, wrong `disq=true`) | **partial (`REQ-007` upgraded from p.2/3 to substantive p.15)** | **partial (`REQ-007` p.15)** | Needs review | **yes (p.15)** | — |
| `MBI-GT-24` (p.17–18 `[scanned]`, `disq=false`): Pre-tender site inspection before pricing BQ | yes (`REQ-001` p.17, wrong `disq=true`) | **yes (`REQ-014` p.17)** | no | Needs review | **yes (p.17)** | **yes (`false`)** |
| `MBI-GT-26` (p.17, 19, 28 `[scanned]`, `disq=false`): Post-Award Performance Bond (2.5% >= RM200k) | partial (`REQ-004, 023..026`, wrong `disq=true`) | **partial (`REQ-015` p.28)** | **partial (`REQ-015` p.28)** | Needs review | **yes (p.28)** | **yes (`false`)** |
| `MBI-GT-27` (p.18 `[scanned]`, `disq=false`): CIDB Levy 0.125% for Works > RM500,000 | yes (`REQ-011` p.18) | **yes (`REQ-017` p.18, `applies_to=conditional`)** | **yes (`REQ-013` p.18, translated excerpt flag)** | Needs review | **yes (p.18)** | yes (`false`) |
| `MBI-GT-28` (p.18 `[scanned]`, `disq=false`): **CIDB `E11` electrical sub-contractor** | partial (`REQ-027`, **false `Gap`**, wrong `disq=true`) | **yes (`REQ-016` p.18, `applies_to=subcontractor`)** | **yes (`REQ-012` p.18, `applies_to=subcontractor`)** | **`Needs review` (false Gap gone!)** | **yes (p.18)** | **yes (`false`)** |
| `MBI-GT-29` (p.18, 22 `[scanned]`, `disq=false`): MBI `Fi Perkhidmatan` (>RM50,001) | partial (`REQ-010` p.18) | **yes (`REQ-018` p.18, `applies_to=conditional`)** | **yes (`REQ-014` p.18)** | Needs review | **yes (p.18)** | yes (`false`) |
| `MBI-GT-31` (p.26 `[scanned]`, `disq=false`): Forestry Dept Tree Waste Disposal Permit | partial (`REQ-028` p.26, wrong `disq=true`) | **yes (`REQ-019` p.26)** | **yes (`REQ-016` p.26)** | Needs review | **yes (p.26)** | **yes (`false`)** |
| `MBI-GT-32` (p.27 `[scanned]`, `disq=false`): 6 mandatory PPE items & DOSH safety | no | **yes (`REQ-020` p.27)** | **yes (`REQ-017` p.27)** | Needs review | **yes (p.27)** | yes (`false`) |
| `MBI-GT-33` (p.28 `[scanned]`, `disq=false`): 90-day quotation validity period | no | **yes (`REQ-021` p.28)** | **yes (`REQ-018` p.28)** | Needs review | **yes (p.28)** | yes (`false`) |
| `MBI-GT-34` (p.29 `[scanned]`, `disq=false`): 7-day JKDM/SST registration letter after SST | no | no | **yes (`REQ-020` p.29, `applies_to=conditional`)** | Needs review | **yes (p.29)** | yes (`false`) |
| `MBI-GT-35` (p.29 `[scanned]`, `disq=false`): Working hours 8am–7pm | no | **yes (`REQ-022` p.29)** | **yes (`REQ-019` p.29)** | Needs review | **yes (p.29)** | yes (`false`) |

*(Remaining non-disqualifying MBI items `MBI-GT-08, 15, 17–21, 23, 25, 30` — routine contract/statutory forms `Borang 9/93, 10/93`, `Borang Sebut Harga`, `Pemunya Benefisial`, `Pemerdagangan Orang`, `Lampiran E & F`, `Harga Indikatif RM256k`, `BQ` — were not emitted as separate rows by the single-pass extractor; see Section 6.)*

---

## 5. Free-Tier API Call Budget, OCR Coverage & MBI 2-Run Consistency

### 5.1 API Call Counts Per Run (`data/llm_cache/`)

| Run Order | Output File | Pinned Model | Live API Calls | Cache Hits | Steps Executed | Runtime |
|---|---|---|---:|---:|---|---:|
| **1. MBI Run 1** | `eval_runs/after_mbi_run1.json` | `gemini-3-flash-preview` | **6** | **0** | 5 batch OCR calls (19 pages in batches of 4: `[1,2,7,8]`, `[9,16,17,18]`, `[19,20,21,22]`, `[23,24,25,26]`, `[27,28,29]`) + 1 merged extraction pass | `87.6s` |
| **2. TNB Run 1** | `eval_runs/after_tnb_run1.json` | `gemini-3-flash-preview` | **1** | **0** | 0 OCR calls (0.6% header logos skipped) + 1 merged extraction pass | `20.8s` |
| **3. BNM Run 1** | `eval_runs/after_bnm_run1.json` | `gemini-3-flash-preview` | **1** | **0** | 0 OCR calls (2.5% cover logo & 0-image divider pages skipped) + 1 merged extraction pass | `15.1s` |
| **4a. MBI Cache Check** | *(In-memory cache verification)* | `gemini-3-flash-preview` | **0** | **20** | 19 per-page OCR cache hits + 1 extraction pass cache hit | `3.7s` |
| **4b. MBI Run 2** | `eval_runs/after_mbi_run2.json` | `gemini-3-flash-preview` | **1** | **19** | 19 per-page OCR cache hits (`0` live OCR calls) + 1 fresh live extraction pass | `22.9s` |

### 5.2 Pages That Still Failed OCR
- **0 pages failed OCR across all 4 runs** (`low_quality_pages = []` on MBI Run 1, TNB Run 1, BNM Run 1, and MBI Run 2).
- On MBI, all 5 hybrid/overlay pages (`p.1, 2, 7, 8, 9`) and all 14 pure scanned pages (`p.16–29`) were transcribed cleanly by batch Gemini Vision OCR after removing `ThinkingLevel.MINIMAL`.

### 5.3 MBI 2-Run Consistency (`after_mbi_run1.json` vs `after_mbi_run2.json`)
- **Deterministic Compliance Assessment Parity**: **100% identical** between Run 1 and Run 2:
  - `1 Disqualifying Gap`: `REQ-003` (`MOF 221002 (MEMBERSIH KAWASAN)` on `p.2`).
  - `2 Rule-checked`: `REQ-005` (`mof_active == True`, `DOC-MOF-001`) and `REQ-010` (`ssm_active == True`, `DOC-SSM-001`).
  - `0 False Gaps`: `CIDB E11` subcontractor clause (`p.18`) is `applies_to="subcontractor"`, `is_disqualifying=False`, `status="needs_review"` in both runs.
- **Disqualifying Concept Consistency (Jaccard)**: **9/10 (90.0%)** (up from **72.4%** across 3 runs before fixes, where Run 1 vs Run 2 flipped between a false `CIDB E11` Gap and `MOF 221002` Gap). The 9 core disqualifying items (`REQ-001..007, 010, 012` in Run 1 vs `REQ-001..007, 010, 011` in Run 2) matched in status, page, and `is_disqualifying=True`; only `Surat Akuan Pembida` (`p.5`) appeared in Run 1 (`REQ-013`) and was omitted in Run 2.
- **All-Item Concept Consistency (Jaccard)**: **19/23 (82.6%)** (`19` shared concepts across `22` items in Run 1 and `20` items in Run 2).

---

## 6. Remaining Failures & What to Check by Hand

### 6.1 Remaining Extraction Limitations (Honest Accounting)
1. **Omission of some non-disqualifying routine form rows in single-pass MBI extraction**: Merging Pass 1 and Pass 2 into a single extraction call reduced MBI live API calls from 21 to 6 and raised disqualifying recall from `9.1%` to `72.7%` (`100%` incl. partial), but the model prioritized eligibility/rejection/specification clauses and omitted several non-disqualifying routine forms (`Borang 9/93 & 10/93` p.7–9, `Borang Sebut Harga` p.10, `Pemunya Benefisial` p.11, `Pemerdagangan Orang` p.12, `Lampiran E & F` p.13–14, `Harga Indikatif RM256k` p.16, `Senarai Kuantiti BQ` p.19–22). Running with `--two-pass` when quota permits recovers additional form rows via `run_coverage_pass`.
2. **Occasional cross-language paraphrase on bilingual scanned pages (`after_mbi_run2.json` `REQ-013`)**: In MBI Run 1, Clause 8 on scanned page 18 (`"for all Works exceeding RM 500,000.00..."`) was quoted verbatim in English (`REQ-017`, 0 flags). In MBI Run 2, the LLM translated that one English clause into Malay (`REQ-013`), which our citation verifier caught and flagged with `EXCERPT_NOT_VERIFIED_ON_PAGE`.
3. **Opening invitation sentence on TNB (`TNB-GT-01`) and general boilerplate clauses on BNM (`BNM-GT-01, 02, 10–13, 21, 22`)**: On TNB p.1, the model extracted the specific TNB pre-qualification (`TNB-GT-02`) and SUS supplier (`TNB-GT-08`) requirements rather than the generic preamble sentence (`TNB-GT-01`). On BNM, the model extracted all 5 mandatory criteria in Section 2.1 (`BNM-GT-05..09`) and all concrete submission rules (`BNM-GT-03, 14–20`) but skipped general legal/commercial boilerplate clauses (Disqualification cl. 2.2(b), Fixed price cl. 2.2(d), Confidentiality cl. 2.7, IP rights cl. 2.8).

### 6.2 What You Should Check by Hand
1. **Inspect `eval_runs/after_mbi_run1.json` (`REQ-001`..`REQ-008`, `REQ-010`, `REQ-016`)**:
   - Confirm `REQ-001` (`p.1`) extracted the embedded portal screenshot arrears rule (`PEMBEKAL TIDAK BOLEH MEMBELI... TUNGGAKAN`) via `text+ocr`.
   - Confirm `REQ-003` (`p.2`) caught **`MOF 221002 (MEMBERSIH KAWASAN)`** as a disqualifying **`Gap`** (`RULE_MOF_CODE_MEMBERSHIP`).
   - Confirm `REQ-016` (`p.18`, `CIDB E11` electrical subcontractor) has `applies_to: "subcontractor"`, `is_disqualifying: false`, and `status: "needs_review"`.
2. **Inspect `eval_runs/after_bnm_run1.json` (`REQ-001`)**:
   - Confirm `"Malaysian registered company"` (`p.8`) is now **`matched_rule_verified` (`Rule-checked`)** against `ssm_active` (`DOC-SSM-001`), and that non-disqualifying post-award items (`REQ-010..014`: Form X withdrawal, Service Agreement, E-payment, 85% KPI) all have `is_disqualifying: false`.
3. **Inspect `eval_runs/after_tnb_run1.json` (`REQ-002` & `REQ-004`)**:
   - Confirm `REQ-002` (`p.1`) includes **both** Session 1 (Tanah Merah) and Session 2 (Basecamp Pergau, Jeli) in a single non-duplicated requirement, and `REQ-004` (PPE attire during site visit) has `is_disqualifying: false`.
4. **Run the test suite**:
   - Execute `py -m pytest -v` and confirm all **42 tests** pass.
