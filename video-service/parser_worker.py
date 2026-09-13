import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

def extract_with_marker(pdf_path: str):
    """
    Extracts text from a PDF using the open-source `marker-pdf` library.
    Marker is highly capable of extracting markdown, tables, and LaTeX equations.
    """
    try:
        # type: ignore
        from marker.convert import convert_single_pdf  # type: ignore # noqa
        from marker.models import load_all_models  # type: ignore # noqa
        from marker.settings import settings  # type: ignore # noqa
        
        # Load models on demand.
        # But this is a clean way to integrate it as a worker.
        model_lst = load_all_models()
        result = convert_single_pdf(pdf_path, model_lst)
        # Handle different versions of marker-pdf safely (some return 2 items, some 3)
        full_text = result[0]
        
        # Marker returns a markdown string. We can split it into "pages" or chunks for compatibility
        # with the existing pipeline.
        chunks = [x.strip() for x in full_text.split("\n\n") if x.strip()]
        pages = [{"number": i, "text": chunk} for i, chunk in enumerate(chunks, 1)]
        return pages
        
    except ImportError:
        logger.error("marker-pdf is not installed. Please install it using `pip install marker-pdf`.")
        raise RuntimeError("Advanced PDF parsing requires marker-pdf. Fallback to basic extraction recommended.")
    except Exception as e:
        logger.error(f"Error extracting PDF with marker: {e}")
        raise RuntimeError(f"Advanced extraction failed: {e}")
