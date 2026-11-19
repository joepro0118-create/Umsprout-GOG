"""Print raw text-layer and OCR status for one PDF page.

Usage: py scripts/inspect_page.py <pdf_path> <page_number> [--live-ocr]
"""

from __future__ import annotations

import os
from pathlib import Path
import shutil
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
import pymupdf

from extract_requirements import DEFAULT_MODEL, MIN_READABLE_CHARS, _is_gibberish, _ocr_with_gemini_vision


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    pdf_path, page_num = Path(sys.argv[1]), int(sys.argv[2])
    live = "--live-ocr" in sys.argv
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    doc = pymupdf.open(str(pdf_path))
    page = doc[page_num - 1]
    raw = page.get_text("text") or ""
    print(f"File                : {pdf_path}")
    print(f"Page                : {page_num} of {doc.page_count}")
    print(f"Text-layer chars    : {len(raw.strip())}")
    print(f"Text-layer content  : {raw.strip()!r}")
    print(f"Embedded images     : {len(page.get_images())}")
    print(f"Needs OCR?          : {len(raw.strip()) < MIN_READABLE_CHARS or _is_gibberish(raw)}")
    print(f"Tesseract on PATH   : {shutil.which('tesseract') or 'NOT INSTALLED'}")

    if not live:
        print("Gemini Vision OCR   : not attempted (pass --live-ocr)")
        return 0

    load_dotenv()
    from google import genai
    from google.genai import types

    client = genai.Client(
        api_key=os.environ["GEMINI_API_KEY"],
        http_options=types.HttpOptions(timeout=90_000),
    )
    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    try:
        text, clean, note = _ocr_with_gemini_vision(page, client, model)
    except Exception as exc:
        print(f"Gemini Vision OCR   : FAILED - {type(exc).__name__}: {exc}")
        return 2
    print(f"Gemini Vision OCR   : {note}; clean={clean}; chars={len(text)}")
    print("----- OCR text -----")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
