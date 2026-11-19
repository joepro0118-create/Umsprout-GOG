"""Generate realistic Malaysian tender sample PDFs in /samples for Phase 1 testing."""

from __future__ import annotations

import io
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFont
import pymupdf
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"


def _styles():
    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "TenderTitle",
        parent=base["Heading1"],
        fontSize=14,
        leading=18,
        spaceAfter=8,
        textColor=colors.HexColor("#12355B"),
    )
    heading = ParagraphStyle(
        "TenderHeading",
        parent=base["Heading2"],
        fontSize=11,
        leading=14,
        spaceBefore=8,
        spaceAfter=4,
        textColor=colors.HexColor("#1B4965"),
    )
    body = ParagraphStyle(
        "TenderBody",
        parent=base["BodyText"],
        fontSize=9.5,
        leading=13.5,
        spaceAfter=6,
    )
    return title, heading, body


def _create_scanned_page_image() -> bytes:
    """Create a synthetic slightly noisy raster image simulating a scanned appendix page."""
    width, height = 1240, 1754  # ~150 DPI A4
    img = Image.new("RGB", (width, height), (246, 245, 240))
    draw = ImageDraw.Draw(img)

    try:
        font_hdr = ImageFont.truetype("arial.ttf", 34)
        font_body = ImageFont.truetype("arial.ttf", 24)
    except OSError:
        font_hdr = ImageFont.load_default()
        font_body = ImageFont.load_default()

    lines = [
        ("LAMPIRAN KHAS (DOKUMEN IMBASAN)", font_hdr, 140),
        ("KERAJAAN MALAYSIA - SYARAT KESELAMATAN TAPAK", font_body, 220),
        ("1. Lampiran Khas: Sijil Pematuhan Keselamatan &", font_body, 320),
        ("   Kesihatan Pekerjaan (OSHA / DOSH) yang masih", font_body, 360),
        ("   berkuat kuasa hendaklah dikemukakan bersama", font_body, 400),
        ("   dokumen tawaran.", font_body, 440),
        ("2. Kegagalan mengemukakan lampiran ini boleh", font_body, 520),
        ("   menyebabkan tawaran ditolak oleh jawatankuasa.", font_body, 560),
    ]
    for text, font, y in lines:
        draw.text((110, y), text, fill=(45, 45, 45), font=font)

    # Add light scan speckle noise and slight tilt
    rng = random.Random(42)
    for _ in range(1800):
        x = rng.randint(0, width - 1)
        y = rng.randint(0, height - 1)
        tone = rng.randint(170, 225)
        draw.point((x, y), fill=(tone, tone, tone))

    rotated = img.rotate(0.7, fillcolor=(244, 243, 238))
    buf = io.BytesIO()
    rotated.save(buf, format="PNG")
    return buf.getvalue()


def build_sample_1_bilingual(out_path: Path) -> None:
    """4-page bilingual JKR facility maintenance tender with table + scanned page 4."""
    title_st, head_st, body_st = _styles()
    tmp_path = out_path.with_suffix(".tmp.pdf")
    doc = SimpleDocTemplate(
        str(tmp_path),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    story = [
        Paragraph("KENYATAAN TENDER / INVITATION TO TENDER", title_st),
        Paragraph("No. Tender: JKR/WP/FM/2026/014 — Perkhidmatan Penyelenggaraan Bangunan Kerajaan", body_st),
        Paragraph("Tarikh Tutup Tender / Closing Date: 15 Disember 2026, jam 12.00 tengah hari", body_st),
        Spacer(1, 6),
        Paragraph("BAHAGIAN A: SYARAT KELAYAKAN WAJIB (MANDATORY ELIGIBILITY)", head_st),
        Paragraph(
            "1. Kontraktor hendaklah berdaftar dengan CIDB Gred G4 atau ke atas, Kategori B (B04) dan M&amp;E (M15), "
            "dan sijil masih sah sehingga tarikh tutup tender 15 Disember 2026.",
            body_st,
        ),
        Paragraph(
            "2. Syarikat juga wajib berdaftar dengan Kementerian Kewangan Malaysia (MOF) di bawah kod bidang "
            "220401 dan 221001 serta bertaraf Bumiputera yang masih berkuat kuasa.",
            body_st,
        ),
        Paragraph(
            "3. Tender yang tidak memenuhi mana-mana syarat pendaftaran di atas akan ditolak secara automatik.",
            body_st,
        ),
        PageBreak(),
        Paragraph("BAHAGIAN B: TAKLIMAT TAPAK &amp; SYARAT KEWANGAN / TECHNICAL TERMS", head_st),
        Paragraph(
            "4. Taklimat Tender &amp; Lawatan Tapak DIWAJIBKAN pada 25 November 2026 jam 10.00 pagi di Pejabat JKR Wilayah Persekutuan.",
            body_st,
        ),
        Paragraph(
            "5. The successful tenderer shall submit a Performance Bond of 5% of total contract value within 14 days of Letter of Acceptance.",
            body_st,
        ),
        Paragraph(
            "6. Financial requirement: Minimum paid-up capital / net worth of RM 150,000 as evidenced by audited accounts or certified bank statements.",
            body_st,
        ),
        Paragraph(
            "7. Technical experience: At least 2 similar facility maintenance contracts completed in the last 5 years with Government or GLC agencies.",
            body_st,
        ),
        PageBreak(),
        Paragraph("BAHAGIAN C: SENARAI SEMAK DOKUMEN WAJIB / MANDATORY SUBMISSION CHECKLIST", head_st),
        Paragraph("Sila pastikan dokumen berikut disertakan dalam sampul tawaran:", body_st),
        Spacer(1, 4),
    ]

    table_data = [
        ["Bil", "Dokumen Wajib / Mandatory Document", "Status"],
        ["1", "Borang Tender JKR 203B (Ditandatangani & Cop Rasmi)", "Wajib / Mandatory"],
        ["2", "Surat Akuan Pembida (Integrity Declaration)", "Wajib / Mandatory"],
        ["3", "Salinan Penyata Bank 3 Bulan Terakhir", "Wajib / Mandatory"],
        ["4", "Salinan Sijil Perakuan Pendaftaran CIDB & MOF", "Wajib / Mandatory"],
    ]
    tbl = Table(table_data, colWidths=[18 * mm, 108 * mm, 42 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B4965")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(tbl)
    doc.build(story)

    # Append Page 4 as an image-only scanned page using PyMuPDF
    pdf_doc = pymupdf.open(str(tmp_path))
    scan_page = pdf_doc.new_page(width=595, height=842)
    scan_img_bytes = _create_scanned_page_image()
    scan_page.insert_image(scan_page.rect, stream=scan_img_bytes)
    pdf_doc.save(str(out_path))
    pdf_doc.close()
    tmp_path.unlink(missing_ok=True)


def build_sample_2_english(out_path: Path) -> None:
    """2-page English-only IT & M&E facility tender."""
    title_st, head_st, body_st = _styles()
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    story = [
        Paragraph("REQUEST FOR TENDER: SMART CAMPUS M&amp;E AND IT INFRASTRUCTURE UPGRADE", title_st),
        Paragraph("Tender Reference: UMT/PROC/2026/088 | Closing Date: 30 November 2026 (12:00 PM)", body_st),
        Spacer(1, 6),
        Paragraph("Section 1: Eligibility Criteria", head_st),
        Paragraph(
            "1.1 Bidders must hold a valid CIDB Grade G3 or above registration in category ME (ME02) valid on the tender closing date of 30 November 2026.",
            body_st,
        ),
        Paragraph(
            "1.2 Bidders must be actively registered with Ministry of Finance (MOF) under codes 210101 and 210104.",
            body_st,
        ),
        Paragraph(
            "1.3 Compulsory Site Briefing attendance is mandatory on 12 November 2026 at 9:30 AM at the Campus Facilities Office.",
            body_st,
        ),
        PageBreak(),
        Paragraph("Section 2: Financial &amp; Mandatory Submission Forms", head_st),
        Paragraph(
            "2.1 A Performance Bond equivalent to 5% of the contract sum shall be furnished upon award.",
            body_st,
        ),
        Paragraph(
            "2.2 Bidders must have completed at least 2 M&E or structured cabling projects within the past 3 years.",
            body_st,
        ),
        Spacer(1, 6),
    ]

    tbl = Table(
        [
            ["Item", "Mandatory Form", "Requirement"],
            ["A", "Form of Tender (Appendix A)", "Signed and stamped by authorized director"],
            ["B", "Integrity Pact Declaration", "Mandatory anti-corruption declaration"],
        ],
        colWidths=[20 * mm, 70 * mm, 78 * mm],
    )
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C3E50")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(tbl)
    doc.build(story)


def build_sample_3_bm_edge_cases(out_path: Path) -> None:
    """2-page BM tender with conflicting dates, conditional Bumiputera, and ambiguous clauses."""
    title_st, head_st, body_st = _styles()
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    story = [
        Paragraph("NOTIS TENDER KERJA-KERJA PENAIKTARAFAN SISTEM PEMBENTUNGAN", title_st),
        Paragraph("No. Rujukan: PBT/Kej/2027/003 | Tarikh Tutup: 10 Januari 2027", body_st),
        Spacer(1, 6),
        Paragraph("1. Syarat Kelayakan Kontraktor", head_st),
        Paragraph(
            "1.1 Kontraktor hendaklah berdaftar dengan CIDB Gred G5 atau ke atas, Kategori CE (CE21), dan sijil hendaklah sah pada tarikh tutup tender.",
            body_st,
        ),
        Paragraph(
            "1.2 Syarikat hendaklah bertaraf Bumiputera sekiranya nilai tawaran melebihi RM 500,000 atau melibatkan kerjasama usaha sama (JV).",
            body_st,
        ),
        PageBreak(),
        Paragraph("2. Catatan Tambahan &amp; Percanggahan Tarikh (Untuk Semakan)", head_st),
        Paragraph(
            "2.1 Tarikh Tutup Asal: 5 Januari 2027 (tertakluk kepada pindaan rasmi dalam adendum sekiranya ada).",
            body_st,
        ),
        Paragraph(
            "2.2 Pengalaman kerja yang setara serta keupayaan kewangan adalah tertakluk kepada budi bicara jawatankuasa penilaian tender.",
            body_st,
        ),
        Paragraph(
            "2.3 Bon Pelaksanaan sebanyak 5% daripada nilai kontrak perlu dikemukakan sebelum kerja dimulakan.",
            body_st,
        ),
    ]
    doc.build(story)


def main() -> None:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    targets = [
        (SAMPLES_DIR / "sample_1_bilingual_jkr_maintenance.pdf", build_sample_1_bilingual),
        (SAMPLES_DIR / "sample_2_english_it_facility.pdf", build_sample_2_english),
        (SAMPLES_DIR / "sample_3_bm_construction_edge_cases.pdf", build_sample_3_bm_edge_cases),
    ]
    for path, builder in targets:
        builder(path)
        print(f"Generated: {path}")


if __name__ == "__main__":
    main()
