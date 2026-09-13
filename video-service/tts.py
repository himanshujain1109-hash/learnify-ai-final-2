import asyncio, wave, os
from pathlib import Path


def _write_silent_wav(text, output_path):
    duration=max(1.5,min(120.0,len(text or '')/13.0)); rate=22050
    with wave.open(str(output_path),'wb') as a:
        a.setnchannels(1); a.setsampwidth(2); a.setframerate(rate); a.writeframes(b'\x00\x00'*int(duration*rate))


def _pyttsx3(text, output, voice_hint=None, rate=165):
    import pyttsx3
    engine=pyttsx3.init(); engine.setProperty('rate',rate)
    if voice_hint and voice_hint!='default':
        for voice in engine.getProperty('voices'):
            if voice_hint.lower() in f'{voice.id} {voice.name}'.lower(): engine.setProperty('voice',voice.id); break
    engine.save_to_file(text,str(output)); engine.runAndWait(); engine.stop()
    if not output.exists() or output.stat().st_size<1000: raise RuntimeError('TTS produced no usable audio')


PERSONA_VOICE_MAP = {
    "desi_male": "hi-IN-MadhurNeural",
    "desi_female": "hi-IN-SwaraNeural",
    "tech_brian": "en-US-BrianNeural",
    "documentary": "en-US-AndrewNeural",
    "storyteller_female": "en-US-AriaNeural",
    "british_ryan": "en-GB-RyanNeural",
}


def _edge_tts(text, output, voice, rate_str="+0%"):
    # pyrefly: ignore [missing-import]
    import edge_tts
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate_str).save(str(output)))


def _generate(text, output_path, voice_hint="default", pace="1.0", language="English"):
    output = Path(output_path)
    provider = os.environ.get('TTS_PROVIDER', 'auto').lower()
    
    # Process text for TTS (add pauses for better flow)
    text_for_tts = text.replace("...", ", ").replace("-", " ")

    # Calculate Edge-TTS rate percentage string from pace
    try:
        pace_float = float(pace)
        diff = int(round((pace_float - 1.0) * 100))
        rate_str = f"+{diff}%" if diff >= 0 else f"{diff}%"
    except Exception:
        rate_str = "+0%"

    is_hindi = "hindi" in language.lower() or "hinglish" in language.lower()

    # Determine voice based on selected persona or language
    if voice_hint in PERSONA_VOICE_MAP:
        selected_voice = PERSONA_VOICE_MAP[voice_hint]
    else:
        selected_voice = os.environ.get('TTS_VOICE')
        if not selected_voice:
            if is_hindi:
                selected_voice = "hi-IN-SwaraNeural" if voice_hint == "female" else "hi-IN-MadhurNeural"
            else:
                selected_voice = "en-US-AriaNeural" if voice_hint == "female" else ("en-US-AndrewNeural" if voice_hint == "male" else "en-US-BrianNeural")

    # Primary TTS via Edge-TTS (high quality neural)
    try:
        _edge_tts(text_for_tts, output, selected_voice, rate_str=rate_str)
        return
    except Exception as e:
        print(f"Edge-TTS failed with voice {selected_voice}: {e}")

    # Kokoro fallback for English if available
    if not is_hindi:
        try:
            from tts_worker import generate_with_kokoro
            k_voice = "af_heart" if voice_hint == "female" else "am_fenrir"
            if generate_with_kokoro(text_for_tts, str(output), voice=k_voice):
                return
        except Exception as e:
            print(f"Kokoro TTS fallback failed: {e}")

    # Ultimate offline system voice fallback
    try:
        _pyttsx3(text_for_tts, output, voice_hint, rate=int(165 * float(pace or 1.0)))
        return
    except Exception:
        _write_silent_wav(text_for_tts, output)


async def generate_audio(text, output_path, voice='default', language='English', pace='1.0'):
    await asyncio.to_thread(_generate, text, output_path, voice, pace, language)
