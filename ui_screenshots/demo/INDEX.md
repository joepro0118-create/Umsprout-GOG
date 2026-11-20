# TenderMate Demo UI Screenshots Index

Captured from the production Next.js build (`localhost:3000`) backed by FastAPI (`127.0.0.1:8000`) in headless Chrome (`1440x900`, `deviceScaleFactor=2`, light mode; `390x844` for mobile).  
Demo tender: **MBI S0175/26 — Selenggaraan Pokok Teduhan** (`TND-92261513`, `MBI_462325MEJA.pdf`, 29 pages), extracted from disk cache (0 live Gemini calls; matches `eval_runs/after_mbi_run2.json`).

| File | Description & Key On-Screen Numbers |
|---|---|
| `01_upload_empty.png` | Upload screen with empty drop zone, disclaimer banner, and clean Recent analyses list showing `1` completed analysis (`TND-92261513`: `1 disqualifying gap · 17 need review`). |
| `02_upload_file_selected.png` | Upload screen with `MBI_462325MEJA.pdf` (`PDF · 2.58 MB`) selected in the drop zone and the `Analyse tender` button enabled. |
| `03_review_top.png` | Review screen header (`29 pages · Bahasa Malaysia and English`), disclaimer banner, summary panel (`1` Gaps / `1 Tier B disqualifying`, `17` Needs review / `6 Tier B mandatory`, `2` Rule-checked, `0` User-evidenced, `20 requirements` bar), and red callout (`1 disqualifying gap — Gap: Company is missing required MOF code 221002.`). |
| `04_review_table.png` | Requirements table with status tabs (`All 20`, `Gaps 1`, `Needs review 17`, `Rule-checked 2`, `User-evidenced 0`) sorted gaps first, showing `REQ-003` (MOF 221002) as `Gap` and the CIDB `E11` subcontractor clause (`p.18`) as `Needs review`. |
| `05_gap_expanded.png` | `REQ-003` (`p.2`, Tier B Gap) expanded with full audit trail: `RULE_MOF_CODE_MEMBERSHIP`, `['221002'] subset_of ['220401', '221001', '210101'] -> False`, evidence `MOF_Certificate_Aman_2025_2028.pdf`, and non-override notice. |
| `06_needs_review_expanded.png` | Tier B `Needs review` row (`REQ-001`, `p.1`) expanded with the evidence attestation form (`Attach supporting PDF · up to 25 MB`, `Attested by: Ahmad Farhan bin Ismail`, empty note, `Confirm and attach` button disabled). |
| `07_rule_checked_expanded.png` | Expanded `Rule-checked` group (`Showing 20 of 20 · sorted by severity`) showing `REQ-005` (`RULE_STATUS_FLAG`, `mof_active: True == True -> True`, `p.2`) and `REQ-010` (`RULE_STATUS_FLAG`, `ssm_active: True == True -> True`, `p.4`). |
| `08_company_profile.png` | Company profile screen for `Syarikat Kejuruteraan Aman Sdn. Bhd.` (`COMP-001`) showing confirmed credentials (`CIDB Grade G3`, `MOF 3 codes: 220401, 221001, 210101`, `Bumiputera Registered`, `Paid-up capital RM 250,000`) and `5 documents` in the Document library. |
| `09_citation_pdf_page.png` | Real citation link (`p.2` on `REQ-003`) opened in a new Chrome tab at page `2 / 29` of `MBI_462325MEJA.pdf`, displaying `NO. TENDER: S0175/26` and `KEMENTERIAN KEWANGAN : 221002 (MEMBERSIH KAWASAN)`. |
| `10_resolved_user_evidenced.png` | Review screen on the `User-evidenced 1` tab after attaching `Sample_Attendance_Slip_DEMO.pdf` to `REQ-001` (`Attested by: Ahmad Farhan bin Ismail`, note `Signed attendance slip (demo)`), updating summary counts to `1` Gaps, `16` Needs review, `2` Rule-checked, `1` User-evidenced. |
| `11_report_p1.png` | Exported PDF report (`TenderMate_Report_TND-92261513.pdf`) page 1 rendered at 150 dpi: disclaimer, metadata table, Summary (`20` total, `2` Rule-checked, `1` User-evidenced, `1` Gap / `1` Tier B disqualifying, `16` Needs Review), and Requirement inventory `REQ-001`–`REQ-011`. |
| `12_report_p2.png` | Exported PDF report page 2 rendered at 150 dpi: Requirement inventory `REQ-012` (`E11` = `Needs Review`)–`REQ-020` and `Rule-checked matches (2)` audit tables for `REQ-005` and `REQ-010` (`RULE_STATUS_FLAG`). |
| `13_mobile_review_390.png` | Mobile review screen (`390x844`) showing responsive header, disclaimer banner, action buttons, 2x2 summary grid (`1` Gaps, `17` Needs review, `2` Rule-checked, `0` User-evidenced), progress bar, red MOF 221002 gap callout, and status tabs. |
