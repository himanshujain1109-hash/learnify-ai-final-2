import asyncio
import json
from pathlib import Path
from extract import extract_document
from script_gen import generate_curriculum
from tts import generate_audio
from visual import generate_visual_frames
from assemble import make_animated_scene_clip, assemble_video


def run_pipeline(input_path: str, job_dir: str, options=None):
    options = options or {}
    print("\n[VIDEO] New 3D Educational Classroom Studio pipeline started")
    print(f"[VIDEO] Source document: {Path(input_path).name}")
    
    job = Path(job_dir)
    assets = job / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    slides_dir = job / "slides"

    # Extract pages and render high-res original slides if PDF
    pages = extract_document(input_path, output_slides_dir=str(slides_dir))
    if not pages:
        raise ValueError("No readable pages/slides were found in the uploaded file.")
    
    full_text = "\n\n".join(p.get("text", "").strip() for p in pages if p.get("text", "").strip()).strip()
    if not full_text:
        raise ValueError("Could not extract readable text from document.")

    scenes = generate_curriculum(full_text, options, total_slides=len(pages))
    if not scenes:
        raise ValueError("Failed to generate educational video scenes.")
    print(f"[VIDEO] Masterclass lesson plan generated with {len(scenes)} scenes")
    
    # Associate slide images with scenes
    for idx, scene in enumerate(scenes):
        slide_num = scene.get("sourceSlide")
        if slide_num and isinstance(slide_num, int) and 1 <= slide_num <= len(pages):
            matched = pages[slide_num - 1]
            if matched.get("image_path") and Path(matched["image_path"]).exists():
                scene["slide_image_path"] = matched["image_path"]
        elif idx < len(pages) and pages[idx].get("image_path") and Path(pages[idx]["image_path"]).exists():
            scene["slide_image_path"] = pages[idx]["image_path"]

    (job / "metadata.json").write_text(
        json.dumps({"totalPages": len(pages), "totalScenes": len(scenes), "scenes": scenes}, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    clips = []
    print("[VIDEO] Studio visual rendering started with 3D Teacher Avatar")
    
    for index, scene in enumerate(scenes):
        narration = str(scene.get("narration", "")).strip()
        audio_path = assets / f"scene_{index+1}.wav"
        frames_dir = assets / f"scene_{index+1}_frames"
        language = options.get("language", "English")
        voice_hint = options.get("voice", "default")
        pace = options.get("pace", "1.0")
        
        asyncio.run(generate_audio(narration, str(audio_path), voice_hint, language, pace))
        print(f"[VIDEO] Narration generated for scene {index+1}")
        
        from moviepy.editor import AudioFileClip
        audio_dur = AudioFileClip(str(audio_path)).duration
        generate_visual_frames((scene or {}).get('title', 'Learnify'), scene or {}, str(frames_dir), audio_dur)
        print(f"[VIDEO] 3D Teacher Studio frames generated for scene {index+1}")
        
        clips.append(make_animated_scene_clip(str(frames_dir), str(audio_path), scene, duration=None))

    output_path = job / "output.mp4"
    print("[VIDEO] Final video assembly started")
    try:
        assemble_video(clips, str(output_path))
    finally:
        for clip in clips:
            try:
                if clip.audio:
                    clip.audio.close()
                clip.close()
            except Exception:
                pass
            
    print(f"[VIDEO] Final video created successfully: {output_path}")
    return str(output_path)
