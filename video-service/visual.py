import math
import os
import platform
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


# ----------------------------------------------------------------------
# Cross-Platform TrueType Font Resolution
# ----------------------------------------------------------------------

def _resolve_font_path(bold=False, mono=False):
    system = platform.system().lower()
    candidates = []

    if 'windows' in system:
        font_dir = Path(os.environ.get('WINDIR', 'C:\\Windows')) / 'Fonts'
        if mono:
            candidates.extend([font_dir / 'consola.ttf', font_dir / 'cour.ttf'])
        elif bold:
            candidates.extend([
                font_dir / 'segoeuib.ttf',
                font_dir / 'arialbd.ttf',
                font_dir / 'calibrib.ttf',
                font_dir / 'tahomabd.ttf',
            ])
        else:
            candidates.extend([
                font_dir / 'segoeui.ttf',
                font_dir / 'arial.ttf',
                font_dir / 'calibri.ttf',
                font_dir / 'tahoma.ttf',
            ])
    elif 'darwin' in system:
        if mono:
            candidates.extend([Path('/System/Library/Fonts/Monaco.ttf'), Path('/Library/Fonts/Courier New.ttf')])
        elif bold:
            candidates.extend([Path('/System/Library/Fonts/SFNSBold.ttf'), Path('/Library/Fonts/Arial Bold.ttf')])
        else:
            candidates.extend([Path('/System/Library/Fonts/SFNSText.ttf'), Path('/Library/Fonts/Arial.ttf')])
    else:
        if mono:
            candidates.extend([
                Path('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'),
                Path('/usr/share/fonts/truetype/freefont/FreeMono.ttf'),
            ])
        elif bold:
            candidates.extend([
                Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
                Path('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'),
                Path('/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'),
            ])
        else:
            candidates.extend([
                Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
                Path('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'),
                Path('/usr/share/fonts/truetype/freefont/FreeSans.ttf'),
            ])

    for p in candidates:
        if p.exists():
            return str(p)
    return None


def _get_font(size, bold=False, mono=False):
    path = _resolve_font_path(bold=bold, mono=mono)
    if path:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _fonts():
    return {
        'display': _get_font(30, bold=True),
        'title': _get_font(24, bold=True),
        'sub': _get_font(18, bold=True),
        'body': _get_font(16, bold=False),
        'body_bold': _get_font(16, bold=True),
        'small': _get_font(13, bold=False),
        'small_bold': _get_font(13, bold=True),
        'code': _get_font(14, mono=True),
    }


# Color Palette
BG_DARK = (11, 14, 28)
PANEL_BG = (20, 24, 48)
PANEL_BORDER = (50, 58, 98)
GLOW_PURPLE = (109, 93, 252)
GLOW_CYAN = (0, 225, 255)
GLOW_EMERALD = (52, 211, 153)
CARD_BG = (28, 34, 68)
CARD_BORDER = (65, 75, 125)
TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (195, 192, 220)
TEXT_HIGHLIGHT = (165, 155, 255)

# Teacher Avatar Sprites Cache
_AVATAR_CACHE = {}


def _get_teacher_avatar(pose_name: str):
    if pose_name in _AVATAR_CACHE:
        return _AVATAR_CACHE[pose_name]
    
    asset_dir = Path(__file__).resolve().parent / "assets" / "teacher"
    file_map = {
        "explaining": asset_dir / "teacher_explaining.jpg",
        "pointing": asset_dir / "teacher_pointing.jpg",
        "checkpoint": asset_dir / "teacher_checkpoint.jpg",
    }
    target = file_map.get(pose_name, file_map["explaining"])
    if target.exists():
        try:
            img = Image.open(str(target)).convert("RGBA")
            _AVATAR_CACHE[pose_name] = img
            return img
        except Exception as e:
            print(f"[visual] Failed to load avatar {target}: {e}")
    return None


def _draw_gradient_bg(image):
    draw = ImageDraw.Draw(image)
    w, h = image.size
    for y in range(h):
        ratio = y / h
        r = int(10 + (20 - 10) * ratio)
        g = int(12 + (24 - 12) * ratio)
        b = int(26 + (50 - 26) * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Ambient glowing studio lights
    for radius, alpha_col in [(300, (40, 30, 85)), (180, (55, 42, 120))]:
        draw.ellipse((-80, -80, radius * 2 - 80, radius * 2 - 80), fill=alpha_col)
    for radius, alpha_col in [(250, (15, 40, 70)), (140, (20, 60, 95))]:
        draw.ellipse((w - radius * 2 + 50, h - radius * 2 + 50, w + 50, h + 50), fill=alpha_col)


def _draw_card(draw, x, y, w, h, radius=14, fill=CARD_BG, outline=CARD_BORDER, shadow=True):
    if shadow:
        draw.rounded_rectangle((x + 2, y + 3, x + w + 2, y + h + 3), radius=radius, fill=(6, 8, 16))
    draw.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill, outline=outline, width=2)


def _wrap_text(text, width=45):
    return textwrap.fill(str(text or '').strip(), width=width)


# ----------------------------------------------------------------------
# Dynamic Diagrams (Flowcharts, Concept Maps, Charts, Tables)
# ----------------------------------------------------------------------

def _draw_flow(draw, data, area, fonts, progress=1.0):
    x, y, w, h = area
    raw_nodes = data.get('nodes', [])
    if not raw_nodes:
        raw_nodes = data.get('steps', ['Input Data', 'Feature Extraction', 'Model Training', 'Inference'])

    nodes = []
    for item in raw_nodes[:5]:
        if isinstance(item, dict):
            nodes.append(str(item.get('label') or item.get('name') or 'Step'))
        else:
            nodes.append(str(item))

    num = len(nodes)
    if num == 0:
        return

    visible_nodes = max(1, int(num * progress) + (1 if progress > 0.1 else 0))
    visible_nodes = min(visible_nodes, num)

    gap = 18
    box_w = min(150, (w - gap * (num - 1)) // num)
    box_h = min(100, h - 30)
    start_x = x + (w - (box_w * num + gap * (num - 1))) // 2
    cy = y + (h - box_h) // 2

    for i, label in enumerate(nodes[:visible_nodes]):
        bx = start_x + i * (box_w + gap)
        _draw_card(draw, bx, cy, box_w, box_h, radius=12, fill=CARD_BG, outline=GLOW_PURPLE if i % 2 == 0 else GLOW_CYAN)
        draw.rounded_rectangle((bx + 8, cy + 8, bx + 36, cy + 28), radius=6, fill=(45, 38, 90))
        draw.text((bx + 12, cy + 11), f'0{i+1}', font=fonts['small_bold'], fill=GLOW_CYAN)

        # Wrap text safely inside box
        lines = textwrap.wrap(label, width=15)[:3]
        for li, line in enumerate(lines):
            draw.text((bx + 10, cy + 36 + li * 18), line, font=fonts['small_bold'], fill=TEXT_WHITE)

        if i < num - 1 and i < visible_nodes:
            ax_start = bx + box_w + 2
            ax_end = bx + box_w + gap - 4
            mid_y = cy + box_h // 2
            draw.line([(ax_start, mid_y), (ax_end, mid_y)], fill=GLOW_CYAN, width=3)
            draw.polygon([(ax_end, mid_y), (ax_end - 6, mid_y - 4), (ax_end - 6, mid_y + 4)], fill=GLOW_CYAN)


def _draw_concept_map(draw, data, area, fonts, progress=1.0):
    x, y, w, h = area
    nodes = data.get('nodes', [])
    if not nodes:
        nodes = ['Core Foundation', 'Algorithmic Model', 'Dataset & Training', 'Evaluation Metric']

    norm = []
    for item in nodes[:6]:
        if isinstance(item, dict):
            norm.append(str(item.get('label') or item.get('name') or 'Concept'))
        else:
            norm.append(str(item))

    num = len(norm)
    if num == 0:
        return

    visible = max(1, int(num * progress * 1.2))
    visible = min(visible, num)

    cols = 3 if num >= 3 else num
    rows = (num + cols - 1) // cols
    bw = min(230, (w - 30 * (cols - 1)) // cols)
    bh = 80

    for i, label in enumerate(norm[:visible]):
        r, c = divmod(i, cols)
        bx = x + c * (bw + 25) + (w - (bw * cols + 25 * (cols - 1))) // 2
        by = y + r * (bh + 30) + 15
        _draw_card(draw, bx, by, bw, bh, radius=12, fill=CARD_BG, outline=GLOW_CYAN if i == 0 else GLOW_PURPLE)

        draw.rounded_rectangle((bx + 8, by + 8, bx + 36, by + 28), radius=6, fill=(35, 30, 75))
        draw.text((bx + 12, by + 11), f'0{i+1}', font=fonts['small_bold'], fill=GLOW_CYAN)

        lines = textwrap.wrap(label, width=22)[:2]
        for li, line in enumerate(lines):
            draw.text((bx + 12, by + 34 + li * 20), line, font=fonts['body_bold'], fill=TEXT_WHITE)


def _draw_chart(draw, data, area, fonts, line=False, progress=1.0):
    x, y, w, h = area
    labels = data.get('labels', ['A', 'B', 'C', 'D'])[:6]
    raw_values = data.get('values', [30, 60, 45, 80])[:6]
    values = []
    for v in raw_values:
        try:
            values.append(float(v))
        except (ValueError, TypeError):
            values.append(30.0)

    if not values:
        values = [30.0, 60.0, 45.0, 80.0]
    max_val = max(max(values), 1.0)

    pad_left = 65
    pad_bottom = 45
    plot_w = w - pad_left - 30
    plot_h = h - pad_bottom - 30
    origin_x = x + pad_left
    origin_y = y + h - pad_bottom

    # Grid lines
    for i in range(5):
        gy = origin_y - int((i / 4) * plot_h)
        draw.line([(origin_x - 5, gy), (origin_x + plot_w, gy)], fill=(40, 48, 85), width=1)
        draw.text((x + 10, gy - 8), f"{int((i / 4) * max_val)}", font=fonts['small'], fill=TEXT_MUTED)

    draw.line([(origin_x, origin_y), (origin_x + plot_w, origin_y)], fill=GLOW_PURPLE, width=2)
    draw.line([(origin_x, origin_y), (origin_x, origin_y - plot_h)], fill=GLOW_PURPLE, width=2)

    bar_gap = plot_w // max(len(values), 1)
    bar_w = min(50, bar_gap - 16)
    pts = []

    for i, (lbl, val) in enumerate(zip(labels, values)):
        bx = origin_x + i * bar_gap + (bar_gap - bar_w) // 2
        cur_val = val * min(1.0, progress * 1.3)
        bar_height = int((cur_val / max_val) * plot_h)
        by = origin_y - bar_height

        if line:
            cx = bx + bar_w // 2
            pts.append((cx, by))
        else:
            _draw_card(draw, bx, by, bar_w, bar_height, radius=6, fill=GLOW_CYAN if i % 2 == 0 else GLOW_PURPLE, outline=TEXT_WHITE, shadow=False)

        draw.text((bx, origin_y + 10), textwrap.shorten(str(lbl), width=8, placeholder='…'), font=fonts['small'], fill=TEXT_MUTED)

    if line and len(pts) > 1:
        for j in range(len(pts) - 1):
            draw.line([pts[j], pts[j + 1]], fill=GLOW_CYAN, width=4)
        for pt in pts:
            draw.ellipse((pt[0] - 6, pt[1] - 6, pt[0] + 6, pt[1] + 6), fill=TEXT_WHITE, outline=GLOW_PURPLE, width=2)


def _draw_comparison(draw, data, area, fonts, progress=1.0):
    x, y, w, h = area
    cols = data.get('columns', ['Method A / Concept', 'Method B / Alternative'])[:2]
    rows = data.get('rows', [
        ['Approach', 'Supervised Learning', 'Unsupervised Learning'],
        ['Data Needed', 'Labeled Ground Truth', 'Raw Unlabeled Features'],
        ['Primary Goal', 'Predict target values', 'Discover latent patterns'],
    ])[:4]

    col_w = (w - 20) // 2
    for ci, col_title in enumerate(cols):
        cx = x + ci * (col_w + 20)
        _draw_card(draw, cx, y, col_w, h, radius=14, fill=CARD_BG, outline=GLOW_CYAN if ci == 0 else GLOW_PURPLE)

        # Header of column
        draw.rounded_rectangle((cx + 10, y + 10, cx + col_w - 10, y + 50), radius=8, fill=(40, 35, 85))
        draw.text((cx + 20, y + 18), textwrap.shorten(col_title, width=24, placeholder='…'), font=fonts['sub'], fill=TEXT_WHITE)

        # Rows inside column
        visible_rows = max(1, int(len(rows) * progress * 1.2))
        for ri, row in enumerate(rows[:visible_rows]):
            ry = y + 65 + ri * 75
            draw.rounded_rectangle((cx + 12, ry, cx + col_w - 12, ry + 62), radius=8, fill=(20, 25, 52), outline=(50, 58, 95))
            cell_val = row[ci + 1] if len(row) > ci + 1 else (row[1] if len(row) > 1 else str(row[0]))
            
            label_prefix = row[0] if len(row) > 2 else f"Point {ri+1}"
            draw.text((cx + 20, ry + 8), textwrap.shorten(str(label_prefix).upper(), width=25, placeholder='…'), font=fonts['small_bold'], fill=GLOW_CYAN)
            draw.text((cx + 20, ry + 30), textwrap.shorten(str(cell_val), width=32, placeholder='…'), font=fonts['body'], fill=TEXT_WHITE)


# ----------------------------------------------------------------------
# Main Scene Renderer: 3D Teacher Studio + Digital Smartboard
# ----------------------------------------------------------------------

def _render_scene(scene: dict, progress: float = 1.0) -> Image.Image:
    canvas = Image.new('RGB', (1280, 720), BG_DARK)
    _draw_gradient_bg(canvas)
    draw = ImageDraw.Draw(canvas)
    fonts = _fonts()

    # 1. SMARTBOARD (Digital Lecture Display) - Left 70% of canvas
    sb_x, sb_y, sb_w, sb_h = 40, 35, 875, 650
    # Outer bezel with high-tech glowing border
    _draw_card(draw, sb_x, sb_y, sb_w, sb_h, radius=20, fill=PANEL_BG, outline=GLOW_PURPLE, shadow=True)

    # Smartboard Header
    title = str(scene.get('title') or 'Classroom Masterclass Lecture')
    visual = scene.get('visual') or {}
    kind = str(visual.get('type', 'none')).lower()
    slide_type = str(scene.get('slideType', 'standard')).lower()

    # Header badge & title
    draw.rounded_rectangle((sb_x + 25, sb_y + 20, sb_x + 360, sb_y + 48), radius=6, fill=(35, 30, 75))
    draw.text((sb_x + 35, sb_y + 25), f'LEARNIFY AI  •  3D LECTURE  •  {kind.upper()}', fill=GLOW_CYAN, font=fonts['small_bold'])
    draw.text((sb_x + 25, sb_y + 60), textwrap.shorten(title, width=44, placeholder='…'), fill=TEXT_WHITE, font=fonts['display'])

    # 2. SMARTBOARD MAIN DISPLAY AREA
    disp_x, disp_y, disp_w, disp_h = sb_x + 25, sb_y + 115, sb_w - 50, 395
    _draw_card(draw, disp_x, disp_y, disp_w, disp_h, radius=16, fill=(16, 20, 42), outline=PANEL_BORDER)

    # Check if original PDF / PPT slide image is available
    slide_img_path = scene.get('slide_image_path')
    show_slide = bool(slide_img_path and Path(slide_img_path).exists())

    if show_slide and (kind in {'slide', 'none', 'overview'} or slide_type == 'slide'):
        try:
            slide_img = Image.open(slide_img_path).convert('RGB')
            # Fit inside display area with margin
            sw, sh = slide_img.size
            scale = min((disp_w - 20) / sw, (disp_h - 20) / sh)
            target_w = int(sw * scale)
            target_h = int(sh * scale)
            resized = slide_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
            paste_x = disp_x + (disp_w - target_w) // 2
            paste_y = disp_y + (disp_h - target_h) // 2
            canvas.paste(resized, (paste_x, paste_y))
            # Subtle frame around original slide
            draw.rectangle((paste_x - 1, paste_y - 1, paste_x + target_w + 1, paste_y + target_h + 1), outline=GLOW_CYAN, width=2)
        except Exception as err:
            print(f"[visual] Could not embed slide image: {err}")
            show_slide = False

    if not show_slide or (kind not in {'slide', 'none', 'overview'} and slide_type != 'slide'):
        area = (disp_x + 15, disp_y + 15, disp_w - 30, disp_h - 30)
        data = visual.get('data') or {}

        if kind in {'bar-chart', 'line-chart', 'scatter-plot'}:
            _draw_chart(draw, data, area, fonts, line=(kind == 'line-chart'), progress=progress)
        elif kind in {'comparison', 'table'}:
            _draw_comparison(draw, data, area, fonts, progress=progress)
        elif kind in {'flowchart', 'timeline', 'process'}:
            _draw_flow(draw, data, area, fonts, progress=progress)
        elif kind in {'concept-map', 'diagram', 'hierarchy', 'tree'}:
            _draw_concept_map(draw, data, area, fonts, progress=progress)
        elif kind == 'equation':
            eq = data.get('equation') or scene.get('formula') or 'y = f(x; \\theta) + \\epsilon'
            draw.rounded_rectangle((area[0] + 30, area[1] + 40, area[0] + area[2] - 30, area[1] + area[3] - 40), radius=16, fill=CARD_BG, outline=GLOW_CYAN)
            draw.text((area[0] + 50, area[1] + 60), 'MATHEMATICAL FORMULATION', font=fonts['small_bold'], fill=GLOW_CYAN)
            draw.text((area[0] + 50, area[1] + 110), str(eq), font=fonts['display'], fill=TEXT_WHITE)
            intuition = str(scene.get('intuition') or 'This equation defines the fundamental relationship governed by this model.')
            draw.text((area[0] + 50, area[1] + 190), _wrap_text(intuition, width=50), font=fonts['body'], fill=TEXT_MUTED)
        else:
            # Concept Explanatory Card
            draw.rounded_rectangle((area[0] + 20, area[1] + 20, area[0] + area[2] - 20, area[1] + area[3] - 20), radius=16, fill=CARD_BG, outline=GLOW_PURPLE)
            draw.text((area[0] + 40, area[1] + 40), 'CORE INTUITION & MECHANISM', font=fonts['sub'], fill=GLOW_CYAN)
            narration = str(scene.get('narration') or '')
            draw.multiline_text((area[0] + 40, area[1] + 85), _wrap_text(narration, width=54), font=fonts['body'], fill=TEXT_WHITE, spacing=8)

    # 3. BOTTOM TAKEAWAYS / CHECKPOINT PILL (Guaranteed NO text overflow)
    bot_x, bot_y, bot_w, bot_h = sb_x + 25, sb_y + 525, sb_w - 50, 105
    _draw_card(draw, bot_x, bot_y, bot_w, bot_h, radius=14, fill=(24, 28, 56), outline=PANEL_BORDER)

    quiz = scene.get('quiz')
    if quiz and (slide_type == 'quiz' or progress >= 0.75):
        # Interactive Checkpoint
        draw.rounded_rectangle((bot_x + 15, bot_y + 12, bot_x + 150, bot_y + 36), radius=6, fill=(45, 38, 90))
        draw.text((bot_x + 25, bot_y + 16), 'CHECKPOINT', font=fonts['small_bold'], fill=GLOW_EMERALD)
        q_text = textwrap.shorten(str(quiz.get('question', '')), width=78, placeholder='…')
        draw.text((bot_x + 165, bot_y + 16), q_text, font=fonts['body_bold'], fill=TEXT_WHITE)
        opts = quiz.get('options', [])[:3]
        for oi, opt in enumerate(opts):
            ox = bot_x + 20 + oi * 260
            draw.rounded_rectangle((ox, bot_y + 52, ox + 245, bot_y + 92), radius=8, fill=CARD_BG, outline=GLOW_PURPLE if oi == quiz.get('answerIndex', 0) else (50, 58, 95))
            draw.text((ox + 10, bot_y + 64), textwrap.shorten(f"{chr(65+oi)}. {opt}", width=25, placeholder='…'), font=fonts['small_bold'], fill=TEXT_WHITE)
    else:
        # High-yield Takeaway Pills
        draw.rounded_rectangle((bot_x + 15, bot_y + 12, bot_x + 160, bot_y + 36), radius=6, fill=(35, 45, 75))
        draw.text((bot_x + 25, bot_y + 16), 'KEY TAKEAWAYS', font=fonts['small_bold'], fill=GLOW_CYAN)
        points = scene.get('keyPoints', [])[:2]
        if not points:
            points = ["Focus on the foundational relationships demonstrated on the board.", "Apply this principle to concrete real-world problem scenarios."]
        for pi, pt in enumerate(points):
            draw.ellipse((bot_x + 25, bot_y + 50 + pi * 26, bot_x + 33, bot_y + 58 + pi * 26), fill=GLOW_PURPLE)
            draw.text((bot_x + 45, bot_y + 44 + pi * 26), textwrap.shorten(str(pt), width=85, placeholder='…'), font=fonts['body'], fill=TEXT_WHITE)

    # 4. 3D TEACHER AVATAR (Right 28% of canvas, standing beside the smartboard)
    # Select pose based on scene and progress
    if quiz or slide_type == 'quiz':
        pose = "checkpoint"
    elif progress < 0.35:
        pose = "explaining"
    else:
        pose = "pointing"

    teacher_img = _get_teacher_avatar(pose)
    if teacher_img:
        # Micro-bobbing animation across frames
        bounce = int(math.sin(progress * 4 * math.pi) * 3)
        avatar_w, avatar_h = 320, 610
        avatar_x, avatar_y = 935, 65 + bounce

        # Resize avatar smoothly
        avatar_resized = teacher_img.resize((avatar_w, avatar_h), Image.Resampling.LANCZOS)
        
        # Soft alpha mask on edges to seamlessly blend with studio stage
        mask = Image.new('L', (avatar_w, avatar_h), 255)
        mask_draw = ImageDraw.Draw(mask)
        # Fade bottom edge so the floor looks natural
        for fade_y in range(avatar_h - 40, avatar_h):
            alpha = int(255 * (avatar_h - fade_y) / 40)
            mask_draw.line([(0, fade_y), (avatar_w, fade_y)], fill=alpha)
        # Fade left edge slightly
        for fade_x in range(0, 15):
            alpha = int(255 * (fade_x) / 15)
            mask_draw.line([(fade_x, 0), (fade_x, avatar_h)], fill=min(alpha, 255))

        canvas.paste(avatar_resized, (avatar_x, avatar_y), mask)

    return canvas


def generate_visual_frames(title, scene, output_dir, duration=6.0, fps=8):
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    count = max(8, min(48, int(duration * fps)))
    paths = []
    for i in range(count):
        p = (i + 1) / count
        img = _render_scene(scene, p)
        path = out / f'frame_{i:04d}.png'
        img.save(path, quality=92)
        paths.append(str(path))
    return paths


def generate_visual(title: str, scene: dict, output_path: str):
    _render_scene(scene, 1.0).save(output_path, quality=95)
