# TenderMate Demo Video — TODO & Verification Checklist

## 1. Completed

- Team name on the end card (`demo-video/src/scenes/Scene8Close.tsx`) is set to **`Built by GOG`**.
- Voiceover audio (`demo-video/public/voiceover.mp3`) is added and aligned to each scene's start time across the 120-second timeline.

## 2. Optional Real Screen Recordings (`demo-video/public/clips/`)

All required screenshots from `ui_screenshots/demo/` are present and wired into Scenes 3–7, so no placeholder cards are currently shown. If you want live motion instead of static screenshots, record real app footage and drop the files into `demo-video/public/clips/` (the project detects them automatically with no code edits needed):

- `demo-video/public/clips/scene3_upload.mp4` — Dragging/selecting `MBI_462325MEJA.pdf` and clicking `Analyse tender` (~16s).
- `demo-video/public/clips/scene4_review.mp4` — Scrolling the review summary, red MOF 221002 gap, expanded audit trail (`REQ-003`), and expanded `Rule-checked` matches (`REQ-005`, `REQ-010`) (~27s).
- `demo-video/public/clips/scene5_citation.mp4` — Clicking the `p.2` citation link on `REQ-003` so the browser opens `MBI_462325MEJA.pdf` directly on page 2 (~13s).
- `demo-video/public/clips/scene6_resolve.mp4` — Expanding `REQ-001`, attaching `Sample_Attendance_Slip_DEMO.pdf`, confirming attestation, and viewing the `User-evidenced 1` tab (~15s).
- `demo-video/public/clips/scene7_export.mp4` — Clicking `Export PDF report` and scrolling through pages 1–2 of `TenderMate_Report_TND-92261513.pdf` with the disclaimer visible (~12s).

## 3. Audio Files (`demo-video/public/`)

- `demo-video/public/voiceover.mp3` — Included and synced to all 8 scenes.
- `demo-video/public/music.mp3` — Included (original royalty-free calm ambient bed, mixed at 12% volume with 1.5s fade-in and 2.5s fade-out). Replace this file anytime to swap tracks.

## 4. Items Not Verified Automatically

- **Team size & Remotion license eligibility**: Confirm your team headcount is 3 or fewer individuals, and confirm you are not acting on behalf of an educational institution without written permission from Remotion (`https://www.remotion.dev/docs/license/faq`). Also check whether H.264/AAC codec patent requirements apply to your distribution context.
- **Voiceover timing sync**: Once `voiceover.mp3` is added, preview in Remotion Studio and adjust `SCENE_DURATIONS_SEC` in `demo-video/src/config.ts` if any spoken paragraph runs slightly faster or slower than its scene slot.
- **Screen recording duration alignment**: If you add clips to `demo-video/public/clips/`, verify each clip is at least as long as its scene duration in `demo-video/src/config.ts` (or update `SCENE_DURATIONS_SEC` to match).
- **Run-to-run extraction count note**: `ui_screenshots/demo/INDEX.md` (which matches `after_mbi_run2.json`) shows `20` extracted requirements (`1` Gap, `17` Needs review, `2` Rule-checked), whereas `eval_runs/after_mbi_run1.json` extracted `22` requirements (`1` Gap, `19` Needs review, `2` Rule-checked). The video uses `20` to match the real on-screen UI screenshots exactly.
