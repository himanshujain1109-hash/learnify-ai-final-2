import os
import sys
import uuid
import asyncio
from pathlib import Path
from threading import Thread

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from main_pipeline import run_pipeline

# --------------------------------------------------
# WINDOWS ASYNCIO CONNECTION RESET SUPPRESSION
# Fixes [WinError 10054] caused by browser abruptly closing
# TCP socket during HTTP 206 Partial Content video streaming
# --------------------------------------------------
if sys.platform == "win32":
    try:
        from asyncio.proactor_events import _ProactorBasePipeTransport

        _orig_call_connection_lost = _ProactorBasePipeTransport._call_connection_lost

        def _silence_connection_lost(self, exc):
            try:
                _orig_call_connection_lost(self, exc)
            except (ConnectionResetError, OSError):
                # Remote client disconnected abruptly (normal for browser video seeking/buffering)
                if getattr(self, "_protocol", None) is not None:
                    try:
                        self._protocol.connection_lost(exc)
                    except Exception:
                        pass
                self._write_fut = None
                self._read_fut = None
                self._loop = None

        _ProactorBasePipeTransport._call_connection_lost = _silence_connection_lost
    except Exception:
        pass


BASE_DIR = Path(__file__).resolve().parent
JOBS_DIR = BASE_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pptx", ".pdf", ".txt"}
MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "20"))

app = FastAPI(title="Learnify Notes to Video")


# --------------------------------------------------
# CORS
# --------------------------------------------------

FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

# Accept comma-separated production origins and local development origins.
# FastAPI's CORS middleware otherwise rejects localhost when FRONTEND_URL is
# omitted, which makes the local video page look like an upload failure.
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in FRONTEND_URL.split(",")
    if origin.strip()
]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def setup_windows_asyncio_exception_handler():
    """Silence harmless Windows WinError 10054 connection resets from client disconnects."""
    try:
        loop = asyncio.get_running_loop()
        default_handler = loop.get_exception_handler()

        def custom_exception_handler(loop, context):
            exc = context.get("exception")
            msg = str(context.get("message", ""))
            handle = str(context.get("handle", ""))
            # Suppress WinError 10054 (forcibly closed by remote host) and aborted connection errors
            if isinstance(exc, (ConnectionResetError, OSError)) or "10054" in msg or "10054" in str(exc):
                return
            if "_call_connection_lost" in handle or "_ProactorBasePipeTransport" in handle:
                return
            if default_handler:
                default_handler(loop, context)
            else:
                loop.default_exception_handler(context)

        loop.set_exception_handler(custom_exception_handler)
    except Exception:
        pass


# --------------------------------------------------
# STATUS HELPERS
# --------------------------------------------------

def write_status(job_dir: Path, status: str, message: str = ""):
    (job_dir / "status.txt").write_text(
        f"{status}\n{message}",
        encoding="utf-8",
    )


def read_status(job_dir: Path):
    status_file = job_dir / "status.txt"

    if not status_file.exists():
        return {
            "status": "unknown",
            "message": "",
        }

    lines = status_file.read_text(
        encoding="utf-8"
    ).splitlines()

    return {
        "status": lines[0] if lines else "unknown",
        "message": "\n".join(lines[1:]),
    }


# --------------------------------------------------
# VIDEO PROCESSING
# --------------------------------------------------

def process_job(job_id: str, input_path: str, options=None):
    job_dir = JOBS_DIR / job_id

    try:
        write_status(
            job_dir,
            "processing",
            "Extracting material and generating the learning video...",
        )

        import importlib
        import extract
        import visual
        import script_gen
        import tts
        import main_pipeline
        try:
            importlib.reload(extract)
            importlib.reload(visual)
            importlib.reload(script_gen)
            importlib.reload(tts)
            importlib.reload(main_pipeline)
        except Exception as rel_err:
            print(f"[server] Note on module reload: {rel_err}")

        output_path = main_pipeline.run_pipeline(
            input_path,
            str(job_dir),
            options or {},
        )

        (job_dir / "video_path.txt").write_text(
            output_path,
            encoding="utf-8",
        )

        write_status(
            job_dir,
            "done",
            "Your learning video is ready.",
        )

    except Exception as exc:
        write_status(
            job_dir,
            "error",
            f"{type(exc).__name__}: {exc}",
        )


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Learnify Notes to Video",
        "message": "Python service is running",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "learnify-notes-to-video",
    }


# --------------------------------------------------
# CREATE VIDEO JOB
# --------------------------------------------------

@app.post("/api/video/jobs")
async def create_video_job(
    file: UploadFile = None,
    text: str = Form(None),
    language: str = Form("English"),
    level: str = Form("College"),
    style: str = Form("Teacher"),
    duration: str = Form("5"),
    voice: str = Form("default"),
    pace: str = Form("1.0"),
):
    if not file and not text:
        raise HTTPException(
            status_code=400,
            detail="You must provide either a file or text.",
        )

    job_id = uuid.uuid4().hex
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    if file:
        filename = file.filename or ""
        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Only PPTX, PDF and TXT files are supported.",
            )
        file_data = await file.read()
        if len(file_data) > MAX_FILE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File is too large. Maximum size is {MAX_FILE_MB} MB.",
            )
        safe_filename = Path(filename).name
        input_path = job_dir / safe_filename
        input_path.write_bytes(file_data)
    else:
        # Use provided text directly
        input_path = job_dir / "input.txt"
        input_path.write_text(text, encoding="utf-8")

    write_status(
        job_dir,
        "queued",
        "Your material has been uploaded and queued.",
    )

    options = {
        "language": language,
        "level": level,
        "style": style,
        "duration": duration,
        "voice": voice,
        "pace": pace,
    }

    worker = Thread(
        target=process_job,
        args=(
            job_id,
            str(input_path),
            options,
        ),
        daemon=True,
    )

    worker.start()

    return {
        "job_id": job_id,
        "status": "queued",
    }


# --------------------------------------------------
# CHECK JOB STATUS
# --------------------------------------------------

@app.get("/api/video/jobs/{job_id}")
def get_job_status(job_id: str):

    job_dir = JOBS_DIR / job_id

    if not job_dir.exists():
        raise HTTPException(
            status_code=404,
            detail="Video job not found.",
        )

    result = read_status(job_dir)

    response = {
        "job_id": job_id,
        "status": result["status"],
        "message": result["message"],
    }

    if result["status"] == "done":
        response["video_url"] = (
            f"/api/video/jobs/{job_id}/video"
        )
        metadata_path = job_dir / "metadata.json"
        if metadata_path.exists():
            try:
                import json
                response["metadata"] = json.loads(metadata_path.read_text("utf-8"))
            except Exception:
                pass

    return response


# --------------------------------------------------
# GET VIDEO
# --------------------------------------------------

@app.get("/api/video/jobs/{job_id}/video")
def get_video(job_id: str):

    video_path = (
        JOBS_DIR /
        job_id /
        "output.mp4"
    )

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Video is not ready yet.",
        )

    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=f"learnify-{job_id}.mp4",
        content_disposition_type="inline",
        headers={
            "Accept-Ranges": "bytes",
        },
    )


# --------------------------------------------------
# EXTRACT TEXT (OCR)
# --------------------------------------------------

@app.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_file"
    extension = Path(filename).suffix.lower()
    
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PPTX, PDF and TXT files are supported.",
        )
        
    file_data = await file.read()
    if len(file_data) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum size is {MAX_FILE_MB} MB.",
        )
        
    temp_id = uuid.uuid4().hex
    temp_dir = JOBS_DIR / f"temp_{temp_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        temp_path = temp_dir / Path(filename).name
        temp_path.write_bytes(file_data)
        
        from extract import extract_document
        pages = extract_document(str(temp_path))
        if not pages:
            return {"text": ""}
            
        full_text = "\n\n".join(p.get("text", "").strip() for p in pages if p.get("text", "").strip()).strip()
        return {"text": full_text}
    finally:
        import shutil
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
