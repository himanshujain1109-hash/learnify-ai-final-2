import re
from pathlib import Path
import pymupdf as fitz
from pptx import Presentation


def _clean_slide_text(text: str) -> str:
    """Filter out boilerplate course metadata (instructor affiliations, slide counters, copyright)."""
    lines = []
    for line in text.splitlines():
        l_strip = line.strip()
        if not l_strip:
            continue
        # Skip pure page numbers or slide counts
        if re.match(r"^(?:slide|page)?\s*\d+\s*(?:/\s*\d+)?$", l_strip, re.I):
            continue
        # Skip common academic boilerplate
        if re.search(r"\b(all rights reserved|copyright|nptel|coursera|dept of|department of|professor|prof\.|iit |university)\b", l_strip, re.I) and len(l_strip) < 60:
            continue
        lines.append(l_strip)
    return "\n".join(lines).strip()


def extract_document(path: str, output_slides_dir: str = None):
    """Return a list of slide/page dictionaries from PPTX, PDF, or TXT, and optionally save slide images."""
    p = Path(path)
    suffix = p.suffix.lower()
    slides_dir = Path(output_slides_dir) if output_slides_dir else None
    if slides_dir:
        slides_dir.mkdir(parents=True, exist_ok=True)

    if suffix == ".pptx":
        prs = Presentation(path)
        pages = []
        for i, slide in enumerate(prs.slides, 1):
            parts = []
            for shape in slide.shapes:
                if getattr(shape, "has_text_frame", False):
                    text = shape.text_frame.text.strip()
                    if text:
                        parts.append(text)
            clean_content = _clean_slide_text("\n".join(parts))
            pages.append({
                "number": i,
                "text": clean_content or "\n".join(parts).strip(),
                "raw_text": "\n".join(parts).strip(),
                "image_path": None
            })
        return pages

    if suffix == ".pdf":
        doc = fitz.open(path)
        pages = []
        for i, page in enumerate(doc, 1):
            raw_text = page.get_text("text").strip()
            clean_content = _clean_slide_text(raw_text)
            image_path = None
            if slides_dir:
                slide_file = slides_dir / f"slide_{i}.png"
                try:
                    pix = page.get_pixmap(dpi=150)
                    pix.save(str(slide_file))
                    image_path = str(slide_file)
                except Exception as img_err:
                    print(f"[extract] Could not save slide image for page {i}: {img_err}")

            pages.append({
                "number": i,
                "text": clean_content or raw_text,
                "raw_text": raw_text,
                "image_path": image_path
            })
        doc.close()
        return pages

    if suffix == ".txt":
        text = Path(path).read_text(encoding="utf-8", errors="ignore")
        chunks = [x.strip() for x in text.split("\f") if x.strip()]
        if not chunks:
            chunks = [text.strip()]
        return [{"number": i, "text": chunk, "raw_text": chunk, "image_path": None} for i, chunk in enumerate(chunks, 1)]

    raise ValueError("Only PPTX, PDF and TXT files are supported.")
