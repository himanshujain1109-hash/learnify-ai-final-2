import logging
import os

logger = logging.getLogger(__name__)

# Cache pipeline globally so we don't reload the 82M model on every synthesis
_pipeline_cache = {}

def get_kokoro_pipeline(language="a"):
    # Language code: 'a' for American English, 'b' for British, 'j' for Japanese, etc.
    if language not in _pipeline_cache:
        try:
            # type: ignore
            from kokoro import KPipeline  # noqa
            _pipeline_cache[language] = KPipeline(lang_code=language)
        except ImportError:
            raise RuntimeError("Kokoro TTS library not installed (pip install kokoro)")
    return _pipeline_cache[language]


def generate_with_kokoro(text: str, output_path: str, voice: str = "af_heart"):
    """
    Generates extremely natural TTS using Kokoro-82M.
    `voice` specifies the speaker (e.g. 'af_heart', 'am_fenrir').
    """
    try:
        # Default to American English for now
        pipeline = get_kokoro_pipeline("a")
        
        # Generator returns (graphemes, phonemes, audio)
        generator = pipeline(text, voice=voice, speed=1.0, split_pattern=r'\n+')
        
        all_audio = []
        sample_rate = 24000
        
        for i, (gs, ps, audio) in enumerate(generator):
            if audio is not None:
                # audio may be a PyTorch tensor, convert to numpy
                if hasattr(audio, 'numpy'):
                    all_audio.append(audio.numpy())
                else:
                    all_audio.append(audio)
                
        if not all_audio:
            raise RuntimeError("Kokoro produced empty audio sequence")
            
        import numpy as np
        import wave
        final_audio = np.concatenate(all_audio)
        
        # Convert float audio to 16-bit PCM
        audio_int16 = (final_audio * 32767).astype(np.int16)
        with wave.open(output_path, 'wb') as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(2)  # 2 bytes for int16
            wf.setframerate(sample_rate)
            wf.writeframes(audio_int16.tobytes())
        return True
        
    except Exception as e:
        logger.error(f"Kokoro generation failed: {e}")
        raise
