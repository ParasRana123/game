import io
import numpy as np
from PIL import Image


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    h = hex_str.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _png_bytes(arr: np.ndarray) -> bytes:
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def generate_skin_texture(
    skin_hex: str,
    stubble: bool = False,
    tilak: bool = False,
    seed: int = 7,
) -> bytes:
    """256x256 UV-mapped facial & body skin albedo texture with subsurface warmth and micro-grain."""
    w, h = 256, 256
    r, g, b = hex_to_rgb(skin_hex)
    rng = np.random.default_rng(seed)

    u = np.linspace(0.0, 1.0, w)[None, :]  # 0.5 = front center of face
    v = np.linspace(0.0, 1.0, h)[:, None]  # 0 = crown, 0.5 = nose/eyes, 1.0 = neck base

    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = r
    arr[..., 1] = g
    arr[..., 2] = b
    arr[..., 3] = 255.0

    # Micro skin pore variation
    grain = rng.normal(0.0, 3.2, (h, w)).astype(np.float32)
    arr[..., 0] += grain
    arr[..., 1] += grain * 0.85
    arr[..., 2] += grain * 0.7

    # Subtle subsurface blush on cheeks and nose tip
    cheek_l = np.exp(-(((u - 0.40) / 0.055) ** 2 + ((v - 0.56) / 0.055) ** 2))
    cheek_r = np.exp(-(((u - 0.60) / 0.055) ** 2 + ((v - 0.56) / 0.055) ** 2))
    nose_tip = np.exp(-(((u - 0.50) / 0.03) ** 2 + ((v - 0.55) / 0.04) ** 2))
    warmth = np.clip(cheek_l + cheek_r + nose_tip * 0.7, 0.0, 1.0)
    arr[..., 0] += warmth * 18.0
    arr[..., 1] -= warmth * 4.0
    arr[..., 2] -= warmth * 8.0

    # Soft eye socket ambient occlusion
    eye_l = np.exp(-(((u - 0.435) / 0.035) ** 2 + ((v - 0.45) / 0.025) ** 2))
    eye_r = np.exp(-(((u - 0.565) / 0.035) ** 2 + ((v - 0.45) / 0.025) ** 2))
    socket_ao = np.clip(eye_l + eye_r, 0.0, 1.0)
    arr[..., :3] *= (1.0 - socket_ao[..., None] * 0.14)

    # Lip pigment around mouth region
    lips = np.exp(-(((u - 0.50) / 0.048) ** 2 + ((v - 0.675) / 0.022) ** 2))
    arr[..., 0] = arr[..., 0] * (1 - lips * 0.35) + (r * 0.78 + 38) * (lips * 0.35)
    arr[..., 1] = arr[..., 1] * (1 - lips * 0.45) + (g * 0.56) * (lips * 0.45)
    arr[..., 2] = arr[..., 2] * (1 - lips * 0.45) + (b * 0.56) * (lips * 0.45)

    # Neck crease / jaw underside shadow
    neck_shadow = np.exp(-(((v - 0.84) / 0.08) ** 2)) * np.exp(-(((u - 0.50) / 0.22) ** 2))
    arr[..., :3] *= (1.0 - neck_shadow[..., None] * 0.16)

    if stubble:
        jaw_mask = (
            np.exp(-(((v - 0.70) / 0.11) ** 2))
            * np.exp(-(((u - 0.50) / 0.15) ** 2))
        )
        stubble_noise = rng.uniform(0.6, 1.0, (h, w)).astype(np.float32)
        arr[..., :3] *= (1.0 - jaw_mask[..., None] * stubble_noise[..., None] * 0.26)

    if tilak:
        tilak_mask = np.exp(-(((u - 0.50) / 0.011) ** 2 + ((v - 0.35) / 0.05) ** 2))
        arr[..., 0] = arr[..., 0] * (1 - tilak_mask) + 218 * tilak_mask
        arr[..., 1] = arr[..., 1] * (1 - tilak_mask) + 32 * tilak_mask
        arr[..., 2] = arr[..., 2] * (1 - tilak_mask) + 24 * tilak_mask

    return _png_bytes(arr)


def generate_fabric_texture(
    base_hex: str,
    secondary_hex: str,
    accent_hex: str,
    pattern: str = "kurta",
    seed: int = 11,
) -> bytes:
    """256x256 woven cloth texture with vertical drape folds, thread weave, and border trim."""
    w, h = 256, 256
    r, g, b = hex_to_rgb(base_hex)
    sr, sg, sb = hex_to_rgb(secondary_hex)
    ar, ag, ab = hex_to_rgb(accent_hex)
    rng = np.random.default_rng(seed)

    u = np.linspace(0.0, 1.0, w)[None, :]
    v = np.linspace(0.0, 1.0, h)[:, None]

    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = r
    arr[..., 1] = g
    arr[..., 2] = b
    arr[..., 3] = 255.0

    # Woven khadi/cotton grid
    weave = (np.sin(u * w * 1.4) * 0.5 + np.sin(v * h * 1.4) * 0.5) * 5.0
    noise = rng.normal(0.0, 2.5, (h, w)).astype(np.float32)
    folds = np.sin(u * 18.0 + np.sin(v * 6.0) * 0.7) * 9.0
    arr[..., 0] += weave + noise + folds
    arr[..., 1] += weave + noise + folds
    arr[..., 2] += weave + noise + folds

    if pattern == "saree":
        border = (v > 0.82) | (v < 0.08)
        arr[border[..., 0], 0] = sr
        arr[border[..., 0], 1] = sg
        arr[border[..., 0], 2] = sb
        gold_trim = ((v > 0.80) & (v <= 0.82))
        arr[gold_trim[..., 0], 0] = ar
        arr[gold_trim[..., 0], 1] = ag
        arr[gold_trim[..., 0], 2] = ab
    elif pattern == "muffler":
        stripes = (np.sin(v * 40.0) > 0.45)
        arr[stripes[..., 0], 0] = sr
        arr[stripes[..., 0], 1] = sg
        arr[stripes[..., 0], 2] = sb
    elif pattern == "armor":
        trim = (np.abs(u - 0.5) < 0.05) | (v > 0.86)
        arr[trim[..., 0], 0] = sr
        arr[trim[..., 0], 1] = sg
        arr[trim[..., 0], 2] = sb

    return _png_bytes(arr)


def generate_hair_texture(hair_hex: str, seed: int = 19) -> bytes:
    """128x128 directional strand-textured hair/beard map."""
    w, h = 128, 128
    r, g, b = hex_to_rgb(hair_hex)
    rng = np.random.default_rng(seed)

    col_var = rng.normal(0.0, 14.0, (1, w)).astype(np.float32)
    row_var = np.sin(np.linspace(0, 12, h)[:, None]) * 6.0
    fine = rng.normal(0.0, 4.0, (h, w)).astype(np.float32)

    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = r + col_var + row_var + fine
    arr[..., 1] = g + col_var + row_var + fine
    arr[..., 2] = b + col_var + row_var + fine
    arr[..., 3] = 255.0
    return _png_bytes(arr)


def generate_eye_texture(iris_hex: str = "#3b2314") -> bytes:
    """128x128 realistic eyeball texture (sclera, iris fibers, dark pupil)."""
    w, h = 128, 128
    ir, ig, ib = hex_to_rgb(iris_hex)
    u = np.linspace(-1.0, 1.0, w)[None, :]
    v = np.linspace(-1.0, 1.0, h)[:, None]
    dist = np.sqrt(u**2 + v**2)

    arr = np.zeros((h, w, 4), dtype=np.float32)
    # Off-white sclera with slight edge shading
    sclera = 244.0 - np.clip(dist * 35.0, 0, 45)
    arr[..., 0] = sclera
    arr[..., 1] = sclera * 0.98
    arr[..., 2] = sclera * 0.96
    arr[..., 3] = 255.0

    iris_mask = dist < 0.34
    ang = np.arctan2(v, u)
    fibers = 0.85 + 0.25 * np.sin(ang * 24.0)
    arr[iris_mask, 0] = ir * fibers[iris_mask]
    arr[iris_mask, 1] = ig * fibers[iris_mask]
    arr[iris_mask, 2] = ib * fibers[iris_mask]

    pupil_mask = dist < 0.14
    arr[pupil_mask, :3] = 10.0
    return _png_bytes(arr)
