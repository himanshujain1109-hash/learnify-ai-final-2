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
        'display': _get_font(28, bold=True),
        'title': _get_font(22, bold=True),
        'sub': _get_font(18, bold=True),
        'body': _get_font(15, bold=False),
        'body_bold': _get_font(15, bold=True),
        'small': _get_font(12, bold=False),
        'small_bold': _get_font(12, bold=True),
        'code': _get_font(14, mono=True),
        'formula': _get_font(24, bold=True, mono=True),
    }


# High-Tech Studio Color Palette
BG_DARK = (10, 13, 26)
PANEL_BG = (18, 22, 44)
PANEL_BORDER = (46, 54, 92)
GLOW_PURPLE = (124, 93, 250)
GLOW_CYAN = (0, 229, 255)
GLOW_EMERALD = (52, 211, 153)
GLOW_AMBER = (251, 191, 36)
GLOW_CORAL = (248, 113, 113)
CARD_BG = (26, 32, 64)
CARD_BG_LIGHT = (32, 40, 78)
CARD_BORDER = (60, 70, 120)
TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (190, 195, 225)
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
        r = int(10 + (18 - 10) * ratio)
        g = int(12 + (22 - 12) * ratio)
        b = int(26 + (48 - 26) * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Glowing studio ambient lights
    for radius, alpha_col in [(320, (38, 28, 80)), (190, (52, 38, 115))]:
        draw.ellipse((-80, -80, radius * 2 - 80, radius * 2 - 80), fill=alpha_col)
    for radius, alpha_col in [(260, (15, 38, 65)), (150, (18, 55, 90))]:
        draw.ellipse((w - radius * 2 + 50, h - radius * 2 + 50, w + 50, h + 50), fill=alpha_col)


def _draw_card(draw, x, y, w, h, radius=12, fill=CARD_BG, outline=CARD_BORDER, shadow=True, width=2):
    if shadow:
        draw.rounded_rectangle((x + 2, y + 3, x + w + 2, y + h + 3), radius=radius, fill=(5, 7, 14))
    draw.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill, outline=outline, width=width)


def _wrap_text(text, width=45):
    return textwrap.fill(str(text or '').strip(), width=width)


# ----------------------------------------------------------------------
# 1. Definition Unpacker Renderer (Academic Truth + Intuition + Analogy)
# ----------------------------------------------------------------------

def _draw_definition_unpack(draw, data, area, fonts, progress=1.0, active_beat=1):
    x, y, w, h = area
    term = str(data.get("term") or "Core Principle")
    formal = str(data.get("formalDefinition") or data.get("definition") or "Rigorous definition established in the source material.")
    plain = str(data.get("plainMeaning") or "In simple terms, this mechanism organizes and transforms data systematically.")
    analogy = str(data.get("analogy") or "Think of it like an automated conductor directing each musician to play at the precise moment.")
    mechanisms = data.get("keyMechanisms", ["Foundational Invariant", "Dynamic Transformation", "Convergence"])

    # 1. Top Card: Formal Definition (Academic Source of Truth)
    top_h = 135
    is_top_active = (active_beat == 1 or progress < 0.40)
    top_border = GLOW_CYAN if is_top_active else CARD_BORDER
    _draw_card(draw, x, y, w, top_h, radius=12, fill=CARD_BG_LIGHT if is_top_active else CARD_BG, outline=top_border, width=2 if not is_top_active else 3)

    # Formal badge
    draw.rounded_rectangle((x + 14, y + 10, x + 190, y + 32), radius=6, fill=(35, 30, 80))
    draw.text((x + 22, y + 13), "FORMAL DEFINITION", font=fonts['small_bold'], fill=GLOW_CYAN)

    # Term title
    draw.text((x + 14, y + 38), term[:40], font=fonts['title'], fill=TEXT_WHITE)
    # Formal text
    draw.multiline_text((x + 14, y + 68), _wrap_text(formal, width=64), font=fonts['body'], fill=TEXT_MUTED, spacing=4)

    # 2. Bottom Left Card: Plain English Meaning
    bot_y = y + top_h + 16
    half_w = (w - 16) // 2
    bot_h = h - top_h - 16
    is_plain_active = (active_beat == 2 or (0.40 <= progress < 0.75))
    plain_border = GLOW_EMERALD if is_plain_active else CARD_BORDER
    _draw_card(draw, x, bot_y, half_w, bot_h, radius=12, fill=CARD_BG_LIGHT if is_plain_active else CARD_BG, outline=plain_border, width=2 if not is_plain_active else 3)

    draw.rounded_rectangle((x + 14, bot_y + 12, x + 205, bot_y + 34), radius=6, fill=(20, 50, 45))
    draw.text((x + 22, bot_y + 15), "WHAT IT ACTUALLY MEANS", font=fonts['small_bold'], fill=GLOW_EMERALD)
    
    plain_lines = textwrap.wrap(plain, width=32)[:4]
    draw.multiline_text((x + 14, bot_y + 44), "\n".join(plain_lines), font=fonts['body'], fill=TEXT_WHITE, spacing=5)

    # Pillars with dynamic start Y to never collide with text
    py_offset = max(bot_y + 155, bot_y + 50 + len(plain_lines) * 22 + 10)
    for mi, mech in enumerate(mechanisms[:3]):
        draw.ellipse((x + 16, py_offset + mi * 22, x + 24, py_offset + 8 + mi * 22), fill=GLOW_EMERALD)
        draw.text((x + 32, py_offset - 2 + mi * 22), textwrap.shorten(str(mech), width=30, placeholder='…'), font=fonts['small_bold'], fill=TEXT_MUTED)

    # 3. Bottom Right Card: Real-World Analogy
    right_x = x + half_w + 16
    is_analogy_active = (active_beat == 3 or progress >= 0.75)
    analogy_border = GLOW_AMBER if is_analogy_active else CARD_BORDER
    _draw_card(draw, right_x, bot_y, half_w, bot_h, radius=12, fill=CARD_BG_LIGHT if is_analogy_active else CARD_BG, outline=analogy_border, width=2 if not is_analogy_active else 3)

    draw.rounded_rectangle((right_x + 14, bot_y + 12, right_x + 195, bot_y + 34), radius=6, fill=(50, 40, 20))
    draw.text((right_x + 22, bot_y + 15), "REAL-WORLD ANALOGY", font=fonts['small_bold'], fill=GLOW_AMBER)
    draw.multiline_text((right_x + 14, bot_y + 50), f'"{_wrap_text(analogy, width=32)}"', font=fonts['body'], fill=TEXT_WHITE, spacing=5)


# ----------------------------------------------------------------------
# 2. Dynamic Graph & Curve Engine (Axes, Mathematical Curves, Animated Tracing)
# ----------------------------------------------------------------------

def _draw_dynamic_graph(draw, data, area, fonts, progress=1.0, active_beat=2):
    x, y, w, h = area
    x_label = str(data.get("xAxis") or "Input Scale / Iterations (x)")
    y_label = str(data.get("yAxis") or "Convergence / Output Metric (y)")
    curve_type = str(data.get("curveType") or "sigmoid").lower()
    thresh_label = str(data.get("thresholdLabel") or "Optimal Frontier")
    thresh_val = float(data.get("thresholdValue") or 0.82)

    # Outer container
    _draw_card(draw, x, y, w, h, radius=14, fill=CARD_BG, outline=PANEL_BORDER)

    # Header
    draw.rounded_rectangle((x + 16, y + 12, x + 260, y + 36), radius=6, fill=(30, 25, 65))
    draw.text((x + 24, y + 16), f"📈 DYNAMIC BEHAVIOR: {curve_type.upper()}", font=fonts['small_bold'], fill=GLOW_CYAN)

    pad_left = 60
    pad_bottom = 48
    pad_top = 50
    pad_right = 30
    plot_w = w - pad_left - pad_right
    plot_h = h - pad_bottom - pad_top
    ox = x + pad_left
    oy = y + h - pad_bottom

    # Grid lines & ticks
    for i in range(5):
        gy = oy - int((i / 4.0) * plot_h)
        draw.line([(ox, gy), (ox + plot_w, gy)], fill=(32, 38, 70), width=1)
        pct = int((i / 4.0) * 100)
        draw.text((ox - 38, gy - 7), f"{pct}%", font=fonts['small'], fill=TEXT_MUTED)

    for i in range(5):
        gx = ox + int((i / 4.0) * plot_w)
        draw.line([(gx, oy), (gx, oy - plot_h)], fill=(32, 38, 70), width=1)

    # Axes with arrow heads
    draw.line([(ox, oy), (ox + plot_w + 12, oy)], fill=GLOW_PURPLE, width=2)
    draw.polygon([(ox + plot_w + 16, oy), (ox + plot_w + 8, oy - 4), (ox + plot_w + 8, oy + 4)], fill=GLOW_PURPLE)
    draw.text((ox + plot_w - 180, oy + 12), textwrap.shorten(x_label, width=30, placeholder='…'), font=fonts['small_bold'], fill=TEXT_WHITE)

    draw.line([(ox, oy), (ox, oy - plot_h - 12)], fill=GLOW_PURPLE, width=2)
    draw.polygon([(ox, oy - plot_h - 16), (ox - 4, oy - plot_h - 8), (ox + 4, oy - plot_h - 8)], fill=GLOW_PURPLE)
    draw.text((ox + 8, oy - plot_h - 12), textwrap.shorten(y_label, width=32, placeholder='…'), font=fonts['small_bold'], fill=TEXT_WHITE)

    # Threshold horizontal line
    ty = oy - int(thresh_val * plot_h)
    draw.line([(ox, ty), (ox + plot_w, ty)], fill=GLOW_AMBER, width=1)
    draw.rounded_rectangle((ox + plot_w - 170, ty - 18, ox + plot_w - 10, ty - 2), radius=4, fill=(45, 35, 15))
    draw.text((ox + plot_w - 162, ty - 16), f"• {thresh_label[:20]}", font=fonts['small_bold'], fill=GLOW_AMBER)

    # Calculate curve points
    num_samples = 60
    visible_samples = max(2, int(num_samples * min(1.0, progress * 1.25)))
    pts = []
    for s in range(num_samples):
        u = s / (num_samples - 1)
        if "sigmoid" in curve_type:
            v = 1.0 / (1.0 + math.exp(-8.0 * (u - 0.45)))
        elif "loss" in curve_type:
            v = 0.95 * math.exp(-3.5 * u) + 0.05
        elif "exp" in curve_type:
            v = math.pow(u, 2.2)
        elif "bell" in curve_type:
            v = math.exp(-pow((u - 0.5) / 0.22, 2))
        else:
            v = min(0.92, 0.15 + 0.85 * math.sqrt(u))

        px = ox + int(u * plot_w)
        py = oy - int(v * plot_h)
        pts.append((px, py, u, v))

    # Draw curve segment up to progress
    for j in range(min(visible_samples - 1, len(pts) - 1)):
        draw.line([pts[j][:2], pts[j + 1][:2]], fill=GLOW_CYAN, width=4)

    # Animated Tracing Marker
    cur_idx = min(visible_samples - 1, len(pts) - 1)
    tx, ty, tu, tv = pts[cur_idx]

    # Glow rings around current tracer point
    draw.ellipse((tx - 12, ty - 12, tx + 12, ty + 12), outline=(0, 180, 220), width=2)
    draw.ellipse((tx - 6, ty - 6, tx + 6, ty + 6), fill=TEXT_WHITE, outline=GLOW_CYAN, width=2)

    # Floating coordinate badge above tracer
    badge_x = max(ox + 10, min(tx - 40, ox + plot_w - 90))
    badge_y = max(y + 40, ty - 32)
    draw.rounded_rectangle((badge_x, badge_y, badge_x + 85, badge_y + 22), radius=6, fill=(20, 28, 55), outline=GLOW_CYAN)
    draw.text((badge_x + 8, badge_y + 4), f"y={tv:.2f} (x={tu:.2f})", font=fonts['small_bold'], fill=TEXT_WHITE)


# ----------------------------------------------------------------------
# 3. Step-by-Step Algorithm & State Machine Trace
# ----------------------------------------------------------------------

def _draw_algorithm_trace(draw, data, area, fonts, progress=1.0, active_beat=2):
    x, y, w, h = area
    algo_name = str(data.get("algorithmName") or "Algorithmic Pipeline")
    complexity = str(data.get("timeComplexity") or "O(n)")
    raw_steps = data.get("steps", [
        {"step": 1, "label": "Initialize State", "action": "Validate inputs and allocate memory"},
        {"step": 2, "label": "Transform Elements", "action": "Iterate through data applying core rule"},
        {"step": 3, "label": "Evaluate Convergence", "action": "Verify boundary criteria and loss"},
        {"step": 4, "label": "Return Optimum", "action": "Finalize verified output state"}
    ])

    _draw_card(draw, x, y, w, h, radius=14, fill=CARD_BG, outline=PANEL_BORDER)

    # Header banner
    draw.rounded_rectangle((x + 16, y + 14, x + 310, y + 38), radius=6, fill=(35, 30, 80))
    draw.text((x + 24, y + 18), "⚡ ALGORITHM EXECUTION TRACE", font=fonts['small_bold'], fill=GLOW_CYAN)
    draw.rounded_rectangle((x + w - 140, y + 14, x + w - 16, y + 38), radius=6, fill=(20, 45, 35))
    draw.text((x + w - 128, y + 18), f"Complexity: {complexity}", font=fonts['small_bold'], fill=GLOW_EMERALD)

    num_steps = len(raw_steps)
    active_step_idx = min(int(progress * num_steps), num_steps - 1)

    # Array / Pipeline Blocks
    gap = 14
    block_w = min(170, (w - 32 - gap * (num_steps - 1)) // num_steps)
    block_h = 140
    start_x = x + 16 + (w - 32 - (block_w * num_steps + gap * (num_steps - 1))) // 2
    by = y + 60

    for i, s_info in enumerate(raw_steps):
        bx = start_x + i * (block_w + gap)
        is_active = (i == active_step_idx)
        is_completed = (i < active_step_idx)

        fill_col = (38, 48, 95) if is_active else ((22, 28, 55) if is_completed else (16, 20, 38))
        border_col = GLOW_AMBER if is_active else (GLOW_EMERALD if is_completed else CARD_BORDER)

        _draw_card(draw, bx, by, block_w, block_h, radius=10, fill=fill_col, outline=border_col, width=3 if is_active else 1)

        # Status badge
        badge_text = f"STEP 0{i+1}"
        draw.text((bx + 12, by + 12), badge_text, font=fonts['small_bold'], fill=GLOW_AMBER if is_active else (GLOW_EMERALD if is_completed else TEXT_MUTED))

        # Title
        title_lines = textwrap.wrap(str(s_info.get("label", f"Phase {i+1}")), width=16)[:2]
        for li, line in enumerate(title_lines):
            draw.text((bx + 12, by + 36 + li * 18), line, font=fonts['body_bold'], fill=TEXT_WHITE)

        # Active Pointer indicator
        if is_active:
            draw.polygon([(bx + block_w // 2, by + block_h + 12), (bx + block_w // 2 - 8, by + block_h + 2), (bx + block_w // 2 + 8, by + block_h + 2)], fill=GLOW_AMBER)
            draw.text((bx + block_w // 2 - 28, by + block_h + 16), "CURRENT", font=fonts['small_bold'], fill=GLOW_AMBER)
        elif is_completed:
            cx = bx + block_w - 22
            cy = by + 16
            draw.line([(cx, cy + 4), (cx + 4, cy + 8)], fill=GLOW_EMERALD, width=2)
            draw.line([(cx + 4, cy + 8), (cx + 11, cy - 2)], fill=GLOW_EMERALD, width=2)

        # Arrow to next
        if i < num_steps - 1:
            ax = bx + block_w + 3
            draw.line([(ax, by + block_h // 2), (ax + gap - 6, by + block_h // 2)], fill=GLOW_CYAN if is_completed else CARD_BORDER, width=2)

    # Step Detail & Action Ticker (Bottom Card)
    tick_y = y + h - 110
    active_info = raw_steps[active_step_idx]
    _draw_card(draw, x + 16, tick_y, w - 32, 95, radius=10, fill=(22, 26, 52), outline=GLOW_AMBER if active_beat == 2 else PANEL_BORDER)

    draw.rounded_rectangle((x + 28, tick_y + 10, x + 160, tick_y + 30), radius=4, fill=(45, 35, 15))
    draw.text((x + 36, tick_y + 12), f"ACTIVE OPERATION [0{active_step_idx+1}]", font=fonts['small_bold'], fill=GLOW_AMBER)

    action_text = str(active_info.get("action") or "Processing state transformation.")
    draw.text((x + 28, tick_y + 38), _wrap_text(action_text, width=70), font=fonts['body_bold'], fill=TEXT_WHITE)


# ----------------------------------------------------------------------
# 4. Mathematical Formula Derivation & Variable Breakdown
# ----------------------------------------------------------------------

def _draw_formula_derivation(draw, data, area, fonts, progress=1.0, active_beat=2):
    x, y, w, h = area
    raw_formula = str(data.get("formula") or "J(\\theta) = \\frac{1}{2m} \\sum (h_\\theta(x) - y)^2 + \\lambda \\Omega(\\theta)")
    clean_formula = raw_formula.replace("\\theta", "θ").replace("\\lambda", "λ").replace("\\Omega", "Ω").replace("\\frac{1}{2m}", "(1/2m)").replace("\\sum", "Σ")
    variables = data.get("variables", [
        {"symbol": "J(θ)", "name": "Objective / Cost Function", "meaning": "Total error metric to minimize across training"},
        {"symbol": "h_θ(x)", "name": "Hypothesis Model", "meaning": "Model prediction given input features"},
        {"symbol": "y", "name": "Ground Truth", "meaning": "Actual target label from factual study material"},
        {"symbol": "λ Ω(θ)", "name": "Regularization Term", "meaning": "Prevents complex over-fitting and controls variance"}
    ])

    _draw_card(draw, x, y, w, h, radius=14, fill=CARD_BG, outline=PANEL_BORDER)

    # Top Formula Viewport
    formula_h = 100
    _draw_card(draw, x + 16, y + 16, w - 32, formula_h, radius=12, fill=(16, 20, 42), outline=GLOW_CYAN, width=2)
    draw.rounded_rectangle((x + 28, y + 24, x + 230, y + 44), radius=4, fill=(25, 35, 75))
    draw.text((x + 36, y + 26), "📐 GOVERNING MATHEMATICAL FORMULA", font=fonts['small_bold'], fill=GLOW_CYAN)
    draw.text((x + 28, y + 56), clean_formula[:52], font=fonts['formula'], fill=TEXT_WHITE)

    # Bottom Variables Breakdown Grid
    grid_y = y + formula_h + 30
    draw.text((x + 18, grid_y), "COMPONENT & SYMBOL DECONSTRUCTION:", font=fonts['small_bold'], fill=TEXT_HIGHLIGHT)

    var_y = grid_y + 24
    card_w = (w - 44) // 2
    card_h = 80

    for vi, var in enumerate(variables[:4]):
        r, c = divmod(vi, 2)
        vx = x + 16 + c * (card_w + 12)
        vy = var_y + r * (card_h + 12)

        is_var_active = (vi == (active_beat - 1) % 4)
        border_col = GLOW_CYAN if is_var_active else CARD_BORDER

        _draw_card(draw, vx, vy, card_w, card_h, radius=8, fill=CARD_BG_LIGHT if is_var_active else (20, 24, 48), outline=border_col, width=2 if is_var_active else 1)

        # Symbol box
        draw.rounded_rectangle((vx + 10, vy + 10, vx + 70, vy + 40), radius=6, fill=(35, 30, 80))
        draw.text((vx + 16, vy + 14), str(var.get("symbol", "x")), font=fonts['sub'], fill=GLOW_CYAN)

        # Name & Meaning
        draw.text((vx + 80, vy + 12), textwrap.shorten(str(var.get("name", "Variable")), width=24, placeholder='…'), font=fonts['small_bold'], fill=TEXT_WHITE)
        meaning = str(var.get("meaning", "Operational component."))
        draw.text((vx + 12, vy + 48), textwrap.shorten(meaning, width=44, placeholder='…'), font=fonts['small'], fill=TEXT_MUTED)


# ----------------------------------------------------------------------
# 5. Strategic Comparison Matrix
# ----------------------------------------------------------------------

def _draw_comparison_matrix(draw, data, area, fonts, progress=1.0, active_beat=2):
    x, y, w, h = area
    cols = data.get("columns", ["Baseline Method", "Optimized Approach"])[:2]
    raw_rows = data.get("rows", [
        {"criterion": "Operational Speed", "valA": "Quadratic O(n²)", "valB": "Log-linear O(n log n)", "highlight": "B"},
        {"criterion": "Memory Footprint", "valA": "Unbounded allocation", "valB": "Fixed cache buffers", "highlight": "B"},
        {"criterion": "Noise Tolerance", "valA": "Prone to distortion", "valB": "Statistically robust", "highlight": "B"},
        {"criterion": "Deployment Readiness", "valA": "Prototype only", "valB": "Production scalable", "highlight": "B"}
    ])

    _draw_card(draw, x, y, w, h, radius=14, fill=CARD_BG, outline=PANEL_BORDER)

    # Column Headers
    header_h = 50
    crit_w = 170
    col_w = (w - 32 - crit_w - 16) // 2

    draw.rounded_rectangle((x + 16, y + 14, x + 16 + crit_w, y + 14 + header_h), radius=8, fill=(30, 25, 60))
    draw.text((x + 28, y + 30), "CRITERIA", font=fonts['small_bold'], fill=TEXT_MUTED)

    draw.rounded_rectangle((x + 16 + crit_w + 8, y + 14, x + 16 + crit_w + 8 + col_w, y + 14 + header_h), radius=8, fill=(35, 30, 75))
    draw.text((x + 26 + crit_w + 8, y + 30), textwrap.shorten(str(cols[0]), width=20, placeholder='…'), font=fonts['sub'], fill=TEXT_WHITE)

    draw.rounded_rectangle((x + 16 + crit_w + 16 + col_w, y + 14, x + 16 + crit_w + 16 + col_w * 2, y + 14 + header_h), radius=8, fill=(20, 50, 45))
    draw.text((x + 26 + crit_w + 16 + col_w, y + 30), textwrap.shorten(str(cols[1]), width=20, placeholder='…'), font=fonts['sub'], fill=GLOW_EMERALD)

    # Rows
    row_y = y + 14 + header_h + 10
    row_h = (h - (row_y - y) - 16) // max(len(raw_rows), 1)

    for ri, r_data in enumerate(raw_rows[:4]):
        cy = row_y + ri * row_h
        is_row_active = (ri == int(progress * len(raw_rows)))
        row_fill = (32, 40, 78) if is_row_active else (20, 24, 48)

        # Criteria label
        draw.rounded_rectangle((x + 16, cy, x + 16 + crit_w, cy + row_h - 6), radius=6, fill=row_fill)
        draw.text((x + 24, cy + 14), textwrap.shorten(str(r_data.get("criterion", "Aspect")), width=18, placeholder='…'), font=fonts['small_bold'], fill=GLOW_CYAN)

        # Col A
        val_a = str(r_data.get("valA", "Standard"))
        draw.rounded_rectangle((x + 16 + crit_w + 8, cy, x + 16 + crit_w + 8 + col_w, cy + row_h - 6), radius=6, fill=row_fill)
        draw.text((x + 26 + crit_w + 8, cy + 14), textwrap.shorten(val_a, width=24, placeholder='…'), font=fonts['body'], fill=TEXT_MUTED)

        # Col B (Winning/Target)
        val_b = str(r_data.get("valB", "Optimized"))
        draw.rounded_rectangle((x + 16 + crit_w + 16 + col_w, cy, x + 16 + crit_w + 16 + col_w * 2, cy + row_h - 6), radius=6, fill=row_fill, outline=GLOW_EMERALD if is_row_active else None)
        draw.text((x + 26 + crit_w + 16 + col_w, cy + 14), textwrap.shorten(val_b, width=24, placeholder='…'), font=fonts['body_bold'], fill=TEXT_WHITE)


# ----------------------------------------------------------------------
# 6. Active PDF Diagram Guided Walkthrough & Component Highlighting
# ----------------------------------------------------------------------

def _draw_pdf_diagram_walkthrough(canvas, draw, scene, area, fonts, progress=1.0, active_beat=2):
    x, y, w, h = area
    slide_img_path = scene.get("slide_image_path")
    if not slide_img_path or not Path(slide_img_path).exists():
        # Fallback to concept map
        _draw_concept_map(draw, scene.get("visual", {}).get("data", {}), area, fonts, progress)
        return

    try:
        raw_diagram = Image.open(slide_img_path).convert("RGB")
    except Exception as e:
        print(f"[visual] Diagram load failed: {e}")
        _draw_concept_map(draw, scene.get("visual", {}).get("data", {}), area, fonts, progress)
        return

    # 1. Fit diagram inside smartboard viewport (leaving 75px bottom margin for explanation bar)
    view_h = h - 75
    dw, dh = raw_diagram.size
    scale = min(w / dw, view_h / dh)
    tw = int(dw * scale)
    th = int(dh * scale)
    resized_diagram = raw_diagram.resize((tw, th), Image.Resampling.LANCZOS)
    px = x + (w - tw) // 2
    py = y + (view_h - th) // 2

    # 2. Determine semantic regions
    data = scene.get("visual", {}).get("data", {})
    regions = data.get("regions", [])
    if not regions:
        # Divide horizontally into 3 logical phases: Input, Core, Output
        regions = [
            {"label": "Input & Ingestion Stage", "box": [0.03, 0.1, 0.35, 0.9], "explanation": "Initial inputs, signals, and raw features are ingested"},
            {"label": "Core Transformation Mechanism", "box": [0.35, 0.1, 0.68, 0.9], "explanation": "Algorithmic weights and core logic process the representation"},
            {"label": "Output & Verification Stage", "box": [0.68, 0.1, 0.97, 0.9], "explanation": "Target classification, convergence result, or predicted outcome"}
        ]

    num_regions = len(regions)
    active_idx = min(int(progress * num_regions), num_regions - 1)
    if active_beat in (1, 2, 3) and active_beat <= num_regions:
        active_idx = active_beat - 1

    active_reg = regions[active_idx]
    box_norm = active_reg.get("box", [0.0, 0.0, 1.0, 1.0])
    rx1 = px + int(box_norm[0] * tw)
    ry1 = py + int(box_norm[1] * th)
    rx2 = px + int(box_norm[2] * tw)
    ry2 = py + int(box_norm[3] * th)

    # 3. Dynamic Spotlight Effect: Dim inactive parts of the diagram so active part stands out
    dimmed = Image.new("RGBA", (tw, th), (10, 14, 28, 140))
    # Clear out the active bounding box on the scrim
    local_x1 = int(box_norm[0] * tw)
    local_y1 = int(box_norm[1] * th)
    local_x2 = int(box_norm[2] * tw)
    local_y2 = int(box_norm[3] * th)
    mask_draw = ImageDraw.Draw(dimmed)
    mask_draw.rectangle([local_x1, local_y1, local_x2, local_y2], fill=(0, 0, 0, 0))

    # Composite diagram onto canvas
    canvas.paste(resized_diagram, (px, py))
    canvas.paste(dimmed, (px, py), dimmed)

    # 4. Neon Glowing Bounding Box around Active Region
    draw.rounded_rectangle((rx1 - 3, ry1 - 3, rx2 + 3, ry2 + 3), radius=8, outline=GLOW_CYAN, width=3)
    draw.rounded_rectangle((rx1 - 6, ry1 - 6, rx2 + 6, ry2 + 6), radius=10, outline=(0, 150, 200), width=1)

    # 5. Floating Callout Tag on Active Region
    callout_tag = f"• {active_reg.get('label', 'ACTIVE COMPONENT').upper()}"
    draw.rounded_rectangle((rx1, max(py + 4, ry1 - 26), rx1 + min(240, rx2 - rx1 + 40), max(py + 26, ry1 - 4)), radius=4, fill=(20, 25, 55), outline=GLOW_CYAN)
    draw.text((rx1 + 8, max(py + 8, ry1 - 22)), textwrap.shorten(callout_tag, width=26, placeholder='…'), font=fonts['small_bold'], fill=TEXT_WHITE)

    # 6. Bottom Explanation Ticker Bar
    tick_y = y + h - 65
    _draw_card(draw, x, tick_y, w, 65, radius=10, fill=(22, 26, 52), outline=GLOW_CYAN)
    draw.rounded_rectangle((x + 12, tick_y + 12, x + 160, tick_y + 32), radius=4, fill=(35, 30, 75))
    draw.text((x + 20, tick_y + 15), f"DIAGRAM STEP [0{active_idx+1}]", font=fonts['small_bold'], fill=GLOW_CYAN)

    explanation = str(active_reg.get("explanation") or "Active component processing.")
    draw.text((x + 175, tick_y + 15), textwrap.shorten(explanation, width=70, placeholder='…'), font=fonts['body_bold'], fill=TEXT_WHITE)


# ----------------------------------------------------------------------
# 7. Concept Map & Process Flow Renderer
# ----------------------------------------------------------------------

def _draw_concept_map(draw, data, area, fonts, progress=1.0):
    x, y, w, h = area
    nodes = data.get('nodes', [])
    if not nodes:
        nodes = ['Core Foundation', 'System Architecture', 'Operational Invariant', 'Validation Metric']

    norm = []
    for item in nodes[:6]:
        if isinstance(item, dict):
            norm.append(str(item.get('label') or item.get('name') or 'Concept'))
        else:
            norm.append(str(item))

    num = len(norm)
    if num == 0:
        return

    visible = max(1, min(num, int(num * progress * 1.25)))
    cols = 3 if num >= 3 else num
    rows = (num + cols - 1) // cols
    bw = min(220, (w - 25 * (cols - 1)) // cols)
    bh = 82

    for i, label in enumerate(norm[:visible]):
        r, c = divmod(i, cols)
        bx = x + c * (bw + 20) + (w - (bw * cols + 20 * (cols - 1))) // 2
        by = y + r * (bh + 26) + 20

        is_first = (i == 0)
        _draw_card(draw, bx, by, bw, bh, radius=12, fill=CARD_BG, outline=GLOW_CYAN if is_first else GLOW_PURPLE)

        draw.rounded_rectangle((bx + 8, by + 8, bx + 36, by + 28), radius=6, fill=(35, 30, 75))
        draw.text((bx + 12, by + 11), f'0{i+1}', font=fonts['small_bold'], fill=GLOW_CYAN)

        lines = textwrap.wrap(label, width=20)[:2]
        for li, line in enumerate(lines):
            draw.text((bx + 12, by + 34 + li * 20), line, font=fonts['body_bold'], fill=TEXT_WHITE)


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
    _draw_card(draw, sb_x, sb_y, sb_w, sb_h, radius=20, fill=PANEL_BG, outline=GLOW_PURPLE, shadow=True)

    # Determine visual beat
    beats = scene.get("visualBeats", [])
    active_beat = 1
    teacher_pose = "explaining"
    for b in beats:
        if progress <= float(b.get("fraction", 1.0)):
            active_beat = int(b.get("beat", 1))
            teacher_pose = str(b.get("teacherPose", "explaining"))
            break

    # Smartboard Header
    title = str(scene.get('title') or 'Classroom Masterclass Lecture')
    visual = scene.get('visual') or {}
    kind = str(visual.get('type', 'none')).lower()
    slide_type = str(scene.get('slideType', 'standard')).lower()

    header_badge = f'LEARNIFY AI  •  TEACHER MASTERCLASS  •  {kind.upper().replace("-", " ")}'
    draw.rounded_rectangle((sb_x + 25, sb_y + 18, sb_x + 420, sb_y + 44), radius=6, fill=(35, 30, 75))
    draw.text((sb_x + 35, sb_y + 23), header_badge, fill=GLOW_CYAN, font=fonts['small_bold'])
    draw.text((sb_x + 25, sb_y + 54), textwrap.shorten(title, width=44, placeholder='…'), fill=TEXT_WHITE, font=fonts['display'])

    # 2. SMARTBOARD MAIN DISPLAY AREA
    disp_x, disp_y, disp_w, disp_h = sb_x + 25, sb_y + 105, sb_w - 50, 410
    area = (disp_x, disp_y, disp_w, disp_h)
    data = visual.get('data') or {}

    # Check if authentic PDF diagram walkthrough
    slide_img_path = scene.get('slide_image_path')
    is_diagram_type = (kind in {'pdf-diagram-walkthrough', 'diagram-walkthrough', 'diagram'} or (slide_img_path and kind in {'slide', 'figure'}))

    if is_diagram_type and slide_img_path and Path(slide_img_path).exists():
        _draw_pdf_diagram_walkthrough(canvas, draw, scene, area, fonts, progress=progress, active_beat=active_beat)
    elif kind in {'dynamic-graph', 'graph', 'chart', 'loss-curve', 'sigmoid-curve'}:
        _draw_dynamic_graph(draw, data, area, fonts, progress=progress, active_beat=active_beat)
    elif kind in {'algorithm-trace', 'algorithm', 'state-trace', 'process-trace'}:
        _draw_algorithm_trace(draw, data, area, fonts, progress=progress, active_beat=active_beat)
    elif kind in {'formula-derivation', 'equation', 'formula', 'math'}:
        _draw_formula_derivation(draw, data, area, fonts, progress=progress, active_beat=active_beat)
    elif kind in {'comparison-matrix', 'comparison', 'table'}:
        _draw_comparison_matrix(draw, data, area, fonts, progress=progress, active_beat=active_beat)
    elif kind in {'definition-unpack', 'definition', 'unpack'}:
        _draw_definition_unpack(draw, data, area, fonts, progress=progress, active_beat=active_beat)
    elif kind in {'concept-map', 'hierarchy', 'tree'}:
        _draw_concept_map(draw, data, area, fonts, progress=progress)
    else:
        # Default rich concept card
        _draw_definition_unpack(draw, {"term": title, "formalDefinition": scene.get("narration", "")[:160], "plainMeaning": "Structured foundation from study material.", "analogy": "Visual mental model."}, area, fonts, progress=progress, active_beat=active_beat)

    # 3. BOTTOM TAKEAWAYS / CHECKPOINT PILL
    bot_x, bot_y, bot_w, bot_h = sb_x + 25, sb_y + 530, sb_w - 50, 100
    _draw_card(draw, bot_x, bot_y, bot_w, bot_h, radius=14, fill=(24, 28, 56), outline=PANEL_BORDER)

    quiz = scene.get('quiz')
    if quiz and (slide_type in {'quiz', 'checkpoint'} or progress >= 0.80):
        # Checkpoint question
        draw.rounded_rectangle((bot_x + 14, bot_y + 10, bot_x + 150, bot_y + 32), radius=6, fill=(45, 38, 90))
        draw.text((bot_x + 24, bot_y + 13), 'CHECKPOINT', font=fonts['small_bold'], fill=GLOW_EMERALD)
        q_text = textwrap.shorten(str(quiz.get('question', '')), width=78, placeholder='…')
        draw.text((bot_x + 160, bot_y + 13), q_text, font=fonts['body_bold'], fill=TEXT_WHITE)
        opts = quiz.get('options', [])[:3]
        for oi, opt in enumerate(opts):
            ox = bot_x + 16 + oi * 265
            draw.rounded_rectangle((ox, bot_y + 46, ox + 252, bot_y + 86), radius=8, fill=CARD_BG, outline=GLOW_PURPLE if oi == quiz.get('answerIndex', 0) else (50, 58, 95))
            draw.text((ox + 10, bot_y + 58), textwrap.shorten(f"{chr(65+oi)}. {opt}", width=26, placeholder='…'), font=fonts['small_bold'], fill=TEXT_WHITE)
    else:
        # High-yield Takeaway Pills
        draw.rounded_rectangle((bot_x + 14, bot_y + 10, bot_x + 160, bot_y + 32), radius=6, fill=(35, 45, 75))
        draw.text((bot_x + 22, bot_y + 13), 'KEY TAKEAWAYS', font=fonts['small_bold'], fill=GLOW_CYAN)
        points = scene.get('keyPoints', [])[:2]
        if not points:
            points = ["Focus on the foundational relationships demonstrated on the board.", "Apply this principle to concrete real-world problem scenarios."]
        for pi, pt in enumerate(points):
            draw.ellipse((bot_x + 22, bot_y + 44 + pi * 24, bot_x + 30, bot_y + 52 + pi * 24), fill=GLOW_PURPLE)
            draw.text((bot_x + 38, bot_y + 38 + pi * 24), textwrap.shorten(str(pt), width=85, placeholder='…'), font=fonts['body'], fill=TEXT_WHITE)

    # 4. 3D TEACHER AVATAR (Right 28% of canvas, standing beside the smartboard)
    if quiz or slide_type in {'quiz', 'checkpoint'}:
        pose = "checkpoint"
    elif teacher_pose in {"explaining", "pointing", "checkpoint"}:
        pose = teacher_pose
    elif progress < 0.35:
        pose = "explaining"
    else:
        pose = "pointing"

    teacher_img = _get_teacher_avatar(pose)
    if teacher_img:
        # Micro-bobbing breathing animation across frames
        bounce = int(math.sin(progress * 4 * math.pi) * 3)
        avatar_w, avatar_h = 320, 610
        avatar_x, avatar_y = 935, 65 + bounce

        avatar_resized = teacher_img.resize((avatar_w, avatar_h), Image.Resampling.LANCZOS)

        # Soft alpha mask on edges
        mask = Image.new('L', (avatar_w, avatar_h), 255)
        mask_draw = ImageDraw.Draw(mask)
        for fade_y in range(avatar_h - 40, avatar_h):
            alpha = int(255 * (avatar_h - fade_y) / 40)
            mask_draw.line([(0, fade_y), (avatar_w, fade_y)], fill=alpha)
        for fade_x in range(0, 15):
            alpha = int(255 * (fade_x) / 15)
            mask_draw.line([(fade_x, 0), (fade_x, avatar_h)], fill=min(alpha, 255))

        canvas.paste(avatar_resized, (avatar_x, avatar_y), mask)

    return canvas


def generate_visual_frames(title, scene, output_dir, duration=6.0, fps=10):
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    count = max(10, min(75, int(duration * fps)))
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
