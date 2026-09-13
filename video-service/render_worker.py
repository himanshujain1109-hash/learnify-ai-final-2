import os
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def render_manim_scene(scene_data: dict, output_dir: str, duration_sec: int):
    """
    Takes scene visual JSON data and renders an educational animation using Manim.
    Returns the path to the generated video clip.
    """
    visual_data = scene_data.get("visual", {})
    visual_type = visual_data.get("type", "none")
    
    if visual_type == "none":
        return None
        
    # Create a temporary python script for Manim to run
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    script_path = output_dir / f"manim_scene.py"
    
    # We map JSON data to Manim code strings dynamically.
    # For a real implementation, we would use a robust templating system (like Jinja)
    # and handle equations, charts, graphs, and flowcharts specifically.
    
    manim_code = f"""
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        title = Text("{visual_data.get('title', 'Concept')}").to_edge(UP)
        self.play(Write(title))
"""
    
    # Very basic handling for equations
    if visual_type == "equation":
        eq = visual_data.get("data", {}).get("equation", "E = mc^2")
        manim_code += f"""
        math_tex = MathTex(r"{eq}").scale(2)
        self.play(FadeIn(math_tex))
        self.wait({max(1, duration_sec - 2)})
        """
    else:
        # Fallback generic text or shapes
        manim_code += f"""
        circle = Circle(color=BLUE)
        self.play(Create(circle))
        self.wait({max(1, duration_sec - 2)})
        """
        
    script_path.write_text(manim_code, encoding="utf-8")
    
    # Run Manim via CLI. -ql means low quality (fast render for testing), -o sets output name.
    # In production, this would be parameterized for high quality (-qh).
    cmd = [
        "manim",
        "-ql",
        str(script_path),
        "GeneratedScene",
        "--media_dir", str(output_dir),
        "--format", "mp4"
    ]
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        # Manim outputs to media_dir/videos/<script_name>/480p15/GeneratedScene.mp4 (for -ql)
        expected_vid_path = output_dir / "videos" / "manim_scene" / "480p15" / "GeneratedScene.mp4"
        if expected_vid_path.exists():
            return str(expected_vid_path)
    except Exception as e:
        logger.error(f"Manim render failed: {e}")
        
    return None
