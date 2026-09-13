from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from pathlib import Path
import time


def make_slide_clip(image_path, audio_path):
    audio=AudioFileClip(audio_path)
    return ImageClip(image_path).set_duration(audio.duration).set_audio(audio)


def make_animated_scene_clip(frames_dir, audio_path, scene=None, duration=None):
    audio=AudioFileClip(audio_path)
    frame_paths=sorted(str(p) for p in Path(frames_dir).glob('frame_*.png'))
    if not frame_paths:
        # lazy fallback: one neutral frame is better than failing the whole job
        from visual import generate_visual_frames
        generate_visual_frames((scene or {}).get('title','Learnify'), scene or {}, frames_dir, audio.duration)
        frame_paths=sorted(str(p) for p in Path(frames_dir).glob('frame_*.png'))
    per=max(0.08,audio.duration/max(1,len(frame_paths)))
    clips=[ImageClip(p).set_duration(per) for p in frame_paths]
    video=concatenate_videoclips(clips,method='chain').set_duration(audio.duration).set_audio(audio)
    return video


def assemble_video(slide_clips, output_path):
    final=concatenate_videoclips(slide_clips,method='compose')
    output=Path(output_path); temp_audio=output.with_name(f'{output.stem}_temp_audio.mp4')
    try:
        final.write_videofile(str(output),fps=24,codec='libx264',audio_codec='aac',temp_audiofile=str(temp_audio),remove_temp=False,logger=None)
    finally:
        final.close()
    for _ in range(5):
        try:
            if temp_audio.exists(): temp_audio.unlink()
            break
        except PermissionError: time.sleep(0.5)
