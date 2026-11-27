import io
import numpy as np
from PIL import Image


def _png_bytes(arr: np.ndarray) -> bytes:
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def generate_mitron_face_texture() -> bytes:
    """
    512x512 realistic facial skin texture tailored to Reference Image 2:
    warm Indian skin tone, forehead creases, under-eye warmth, nasolabial smile lines,
    sculpted nose/cheek blush, and natural warm lip color.
    """
    w, h = 512, 512
    rng = np.random.default_rng(108)
    u = np.linspace(0.0, 1.0, w)[None, :]
    v = np.linspace(0.0, 1.0, h)[:, None]

    # Warm natural Indian skin base (#dfa884)
    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = 223.0
    arr[..., 1] = 166.0
    arr[..., 2] = 132.0
    arr[..., 3] = 255.0

    # Fine skin pore & tonal variation
    grain = rng.normal(0.0, 2.6, (h, w)).astype(np.float32)
    arr[..., 0] += grain
    arr[..., 1] += grain * 0.85
    arr[..., 2] += grain * 0.72

    # Warm forehead highlight + subtle horizontal expression lines (v ~ 0.25..0.33)
    forehead_hi = np.exp(-(((u - 0.50) / 0.10) ** 2 + ((v - 0.28) / 0.06) ** 2))
    arr[..., :3] += forehead_hi[..., None] * 10.0
    for fv in (0.27, 0.305):
        crease = np.exp(-(((v - fv) / 0.004) ** 2)) * np.exp(-(((u - 0.50) / 0.075) ** 2))
        arr[..., :3] *= (1.0 - crease[..., None] * 0.08)

    # Warm cheek & nose-bridge subsurface blush
    cheek_l = np.exp(-(((u - 0.405) / 0.055) ** 2 + ((v - 0.54) / 0.055) ** 2))
    cheek_r = np.exp(-(((u - 0.595) / 0.055) ** 2 + ((v - 0.54) / 0.055) ** 2))
    nose = np.exp(-(((u - 0.50) / 0.025) ** 2 + ((v - 0.51) / 0.05) ** 2))
    warmth = np.clip(cheek_l + cheek_r + nose * 0.65, 0.0, 1.0)
    arr[..., 0] += warmth * 16.0
    arr[..., 1] -= warmth * 3.0
    arr[..., 2] -= warmth * 7.0

    # Gentle eye socket & under-eye crease shading
    for eu in (0.440, 0.560):
        sock = np.exp(-(((u - eu) / 0.032) ** 2 + ((v - 0.44) / 0.024) ** 2))
        arr[..., :3] *= (1.0 - sock[..., None] * 0.12)
        bag = np.exp(-(((u - eu) / 0.030) ** 2 + ((v - 0.478) / 0.010) ** 2))
        arr[..., :3] *= (1.0 - bag[..., None] * 0.09)

    # Nasolabial smile folds framing nose-to-mouth
    for side in (-1.0, 1.0):
        fold_u = 0.50 + side * (0.042 + (v - 0.54) * 0.22)
        fold = np.exp(-(((u - fold_u) / 0.006) ** 2)) * ((v > 0.53) & (v < 0.66))
        arr[..., :3] *= (1.0 - fold[..., None] * 0.12)

    # Natural lip tint
    lips = np.exp(-(((u - 0.50) / 0.045) ** 2 + ((v - 0.665) / 0.019) ** 2))
    arr[..., 0] = arr[..., 0] * (1 - lips * 0.32) + 194.0 * (lips * 0.32)
    arr[..., 1] = arr[..., 1] * (1 - lips * 0.42) + 112.0 * (lips * 0.42)
    arr[..., 2] = arr[..., 2] * (1 - lips * 0.42) + 102.0 * (lips * 0.42)

    # Subtle silver stubble transition around upper cheeks/sides so 3D beard blends naturally
    side_stubble = (
        np.exp(-(((v - 0.65) / 0.12) ** 2))
        * (np.exp(-(((u - 0.38) / 0.05) ** 2)) + np.exp(-(((u - 0.62) / 0.05) ** 2)))
    )
    arr[..., :3] = arr[..., :3] * (1 - side_stubble[..., None] * 0.25) + 225.0 * (side_stubble[..., None] * 0.25)

    return _png_bytes(arr)


def generate_mitron_body_skin_texture() -> bytes:
    """256x256 clean warm skin texture for hands, wrists, and ears (no facial crease artifacts)."""
    w, h = 256, 256
    rng = np.random.default_rng(109)
    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = 221.0
    arr[..., 1] = 165.0
    arr[..., 2] = 131.0
    arr[..., 3] = 255.0
    grain = rng.normal(0.0, 2.2, (h, w)).astype(np.float32)
    arr[..., 0] += grain
    arr[..., 1] += grain * 0.85
    arr[..., 2] += grain * 0.72
    return _png_bytes(arr)


def generate_mitron_jacket_texture() -> bytes:
    """
    512x512 light beige / oatmeal-cream woven khadi-linen Nehru jacket texture
    matching the fine speckled weave in Reference Image 2.
    """
    w, h = 512, 512
    rng = np.random.default_rng(204)
    u = np.linspace(0.0, 1.0, w)[None, :]
    v = np.linspace(0.0, 1.0, h)[:, None]

    # Oatmeal-beige khadi base (#d7cec0)
    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = 216.0
    arr[..., 1] = 207.0
    arr[..., 2] = 193.0
    arr[..., 3] = 255.0

    # Fine khadi cross-hatch weave (horizontal + vertical slub threads)
    warp = np.sin(u * w * 1.1) * 7.5 + rng.normal(0.0, 5.5, (1, w))
    weft = np.sin(v * h * 1.1) * 7.5 + rng.normal(0.0, 5.5, (h, 1))
    speckle = rng.normal(0.0, 6.5, (h, w)).astype(np.float32)
    folds = np.sin(u * 14.0 + np.sin(v * 5.0) * 0.6) * 6.0

    delta = warp + weft + speckle + folds
    arr[..., 0] += delta
    arr[..., 1] += delta * 0.96
    arr[..., 2] += delta * 0.90

    return _png_bytes(arr)


def generate_mitron_kurta_texture() -> bytes:
    """256x256 crisp white traditional cotton kurta & churidar texture with soft fabric folds."""
    w, h = 256, 256
    rng = np.random.default_rng(305)
    u = np.linspace(0.0, 1.0, w)[None, :]
    v = np.linspace(0.0, 1.0, h)[:, None]

    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0] = 244.0
    arr[..., 1] = 245.0
    arr[..., 2] = 247.0
    arr[..., 3] = 255.0

    weave = (np.sin(u * w * 1.5) + np.sin(v * h * 1.5)) * 2.2
    folds = np.sin(u * 16.0 + np.cos(v * 7.0) * 0.8) * 6.5
    noise = rng.normal(0.0, 1.8, (h, w)).astype(np.float32)
    arr[..., :3] += (weave + folds + noise)[..., None]
    return _png_bytes(arr)


def generate_mitron_hair_beard_texture() -> bytes:
    """256x256 dense silver-white hair & beard strand texture with natural salt-and-silver depth."""
    w, h = 256, 256
    rng = np.random.default_rng(407)
    u = np.linspace(0.0, 1.0, w)[None, :]
    v = np.linspace(0.0, 1.0, h)[:, None]

    strands = np.sin(u * 140.0 + np.sin(v * 18.0) * 2.0) * 11.0
    col_var = rng.normal(0.0, 9.0, (1, w)).astype(np.float32)
    fine = rng.normal(0.0, 4.5, (h, w)).astype(np.float32)

    arr = np.zeros((h, w, 4), dtype=np.float32)
    base = 232.0 + strands + col_var + fine
    arr[..., 0] = base
    arr[..., 1] = base + 1.0
    arr[..., 2] = base + 4.0
    arr[..., 3] = 255.0
    return _png_bytes(arr)
