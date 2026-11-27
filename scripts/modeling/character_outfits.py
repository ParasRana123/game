import math
import numpy as np
from .human_mesh import (
    MeshPart,
    _oval_ring,
    compute_smooth_normals,
    make_loft_tube,
    make_uv_sphere,
)


def _box_mesh(
    cx: float,
    cy: float,
    cz: float,
    hx: float,
    hy: float,
    hz: float,
    bone_idx: int,
    rot_z: float = 0.0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    corners = np.array(
        [
            [-hx, -hy, -hz],
            [hx, -hy, -hz],
            [hx, hy, -hz],
            [-hx, hy, -hz],
            [-hx, -hy, hz],
            [hx, -hy, hz],
            [hx, hy, hz],
            [-hx, hy, hz],
        ],
        dtype=np.float32,
    )
    if abs(rot_z) > 1e-4:
        c, s = math.cos(rot_z), math.sin(rot_z)
        x = corners[:, 0] * c - corners[:, 1] * s
        y = corners[:, 0] * s + corners[:, 1] * c
        corners[:, 0], corners[:, 1] = x, y
    corners += np.array([cx, cy, cz], dtype=np.float32)

    faces = [
        (4, 5, 6, 7),
        (1, 0, 3, 2),
        (0, 4, 7, 3),
        (5, 1, 2, 6),
        (3, 7, 6, 2),
        (0, 1, 5, 4),
    ]
    verts, uvs, tris = [], [], []
    for a, b, c, d in faces:
        base = len(verts)
        verts.extend([corners[a], corners[b], corners[c], corners[d]])
        uvs.extend([[0, 0], [1, 0], [1, 1], [0, 1]])
        tris.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    pos = np.array(verts, dtype=np.float32)
    n = len(pos)
    return (
        pos,
        np.array(uvs, dtype=np.float32),
        np.tile(np.array([bone_idx, 0, 0, 0], dtype=np.uint8), (n, 1)),
        np.tile(np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32), (n, 1)),
        np.array(tris, dtype=np.uint32),
    )


def build_hair_geometry(headgear: str, scale_h: float = 1.0) -> list[MeshPart]:
    """Model 3D hair, facial hair, caps, and crowns around the sculpted head."""
    parts: list[MeshPart] = []
    cy = 1.62 * scale_h

    def add_sphere_part(
        name: str,
        mat: str,
        center: tuple[float, float, float],
        radii: tuple[float, float, float],
        n_lon: int = 20,
        n_lat: int = 14,
    ) -> None:
        p, uv, j, w, i = make_uv_sphere(center, radii, bone_idx=4, n_lon=n_lon, n_lat=n_lat)
        parts.append(MeshPart(name, mat, p, compute_smooth_normals(p, i), uv, j, w, i))

    if headgear == "beard_glasses":
        # Mitron: Swept silver-white cranial hair + full sculpted 3D beard + mustache + rimless glasses
        add_sphere_part("HairCrown", "hair", (0.0, cy + 0.030 * scale_h, -0.015), (0.092, 0.095 * scale_h, 0.098), 24, 16)
        add_sphere_part("HairSweep", "hair", (0.0, cy + 0.088 * scale_h, 0.016), (0.068, 0.034 * scale_h, 0.064), 18, 12)
        # Sculpted full 3D beard hugging lower jaw & chin
        beard_rings = [
            _oval_ring(0.0, cy - 0.092 * scale_h, 0.044, 0.042, 0.032, 16),
            _oval_ring(0.0, cy - 0.064 * scale_h, 0.042, 0.066, 0.048, 18),
            _oval_ring(0.0, cy - 0.032 * scale_h, 0.036, 0.080, 0.056, 18),
        ]
        bp, buv, bj, bw, bi = make_loft_tube(beard_rings, [(4, 3, 0.1), (4, 3, 0.05), (4, 0, 0.0)], closed_caps=True)
        parts.append(MeshPart("FullBeard", "hair", bp, compute_smooth_normals(bp, bi), buv, bj, bw, bi))
        add_sphere_part("Mustache", "hair", (0.0, cy - 0.025 * scale_h, 0.082), (0.042, 0.012, 0.020))
        # 3D Spectacles frames
        for side in (-1.0, 1.0):
            gp, guv, gj, gw, gi = _box_mesh(side * 0.032, cy + 0.016 * scale_h, 0.092, 0.022, 0.015, 0.004, 4)
            parts.append(MeshPart("GlassesFrame", "metal", gp, compute_smooth_normals(gp, gi), guv, gj, gw, gi))
            tp, tuv, tj, tw, ti = _box_mesh(side * 0.068, cy + 0.016 * scale_h, 0.045, 0.003, 0.004, 0.050, 4)
            parts.append(MeshPart("GlassesTemple", "metal", tp, compute_smooth_normals(tp, ti), tuv, tj, tw, ti))
        bp2, buv2, bj2, bw2, bi2 = _box_mesh(0.0, cy + 0.018 * scale_h, 0.094, 0.012, 0.003, 0.003, 4)
        parts.append(MeshPart("GlassesBridge", "metal", bp2, compute_smooth_normals(bp2, bi2), buv2, bj2, bw2, bi2))

    elif headgear == "youth_hair":
        # Yuva Prince: Full wavy dark hair + thick front sweep + sculpted jawline stubble/beard
        add_sphere_part("HairCrown", "hair", (0.0, cy + 0.034 * scale_h, -0.016), (0.094, 0.098 * scale_h, 0.100), 24, 16)
        add_sphere_part("HairQuiff", "hair", (0.010, cy + 0.096 * scale_h, 0.028), (0.066, 0.038 * scale_h, 0.062), 18, 12)
        # Light sculpted chin/jaw beard layer
        add_sphere_part("TrimBeard", "hair", (0.0, cy - 0.068 * scale_h, 0.046), (0.056, 0.032 * scale_h, 0.042))

    elif headgear == "gandhi_cap_muffler":
        add_sphere_part("HairBack", "hair", (0.0, cy + 0.012 * scale_h, -0.024), (0.090, 0.082 * scale_h, 0.088))
        # Crisp folded white Gandhi Topi boat cap
        cap_rings = [
            _oval_ring(0.0, cy + 0.065 * scale_h, -0.005, 0.092, 0.102, 20),
            _oval_ring(0.0, cy + 0.115 * scale_h, -0.002, 0.068, 0.098, 20),
            _oval_ring(0.0, cy + 0.142 * scale_h, 0.000, 0.018, 0.090, 20),
        ]
        cp, cuv, cj, cw, ci = make_loft_tube(cap_rings, [(4, 0, 0.0)] * 3, closed_caps=True)
        parts.append(MeshPart("GandhiCap", "accent_cloth", cp, compute_smooth_normals(cp, ci), cuv, cj, cw, ci))
        add_sphere_part("Mustache", "hair", (0.0, cy - 0.024 * scale_h, 0.082), (0.038, 0.011, 0.018))

    elif headgear == "saree_bun":
        # Parted hair + traditional low bun at back of head
        add_sphere_part("HairCrown", "hair", (0.0, cy + 0.028 * scale_h, -0.015), (0.092, 0.094 * scale_h, 0.098), 24, 16)
        add_sphere_part("HairBun", "hair", (0.0, cy - 0.015 * scale_h, -0.112), (0.044, 0.042 * scale_h, 0.040), 16, 12)

    elif headgear == "cinema_shades":
        add_sphere_part("Pompadour", "hair", (0.0, cy + 0.042 * scale_h, -0.012), (0.094, 0.102 * scale_h, 0.102), 24, 16)
        add_sphere_part("PompadourCrest", "hair", (0.0, cy + 0.108 * scale_h, 0.032), (0.062, 0.036 * scale_h, 0.064))
        add_sphere_part("Mustache", "hair", (0.0, cy - 0.024 * scale_h, 0.082), (0.040, 0.012, 0.018))
        # Dark aviator shades with metallic bridge
        for side in (-1.0, 1.0):
            gp, guv, gj, gw, gi = _box_mesh(side * 0.033, cy + 0.015 * scale_h, 0.094, 0.023, 0.016, 0.005, 4)
            parts.append(MeshPart("AviatorLens", "dark_glass", gp, compute_smooth_normals(gp, gi), guv, gj, gw, gi))
        bp2, buv2, bj2, bw2, bi2 = _box_mesh(0.0, cy + 0.022 * scale_h, 0.095, 0.015, 0.003, 0.004, 4)
        parts.append(MeshPart("AviatorBridge", "metal", bp2, compute_smooth_normals(bp2, bi2), buv2, bj2, bw2, bi2))

    elif headgear == "saffron_bald":
        # Cleanly sculpted bald dome + sleek dark sunglasses
        for side in (-1.0, 1.0):
            gp, guv, gj, gw, gi = _box_mesh(side * 0.032, cy + 0.015 * scale_h, 0.093, 0.022, 0.014, 0.005, 4)
            parts.append(MeshPart("DarkShades", "dark_glass", gp, compute_smooth_normals(gp, gi), guv, gj, gw, gi))

    elif headgear == "rustic_hair":
        add_sphere_part("FluffyHair", "hair", (0.0, cy + 0.032 * scale_h, -0.018), (0.098, 0.096 * scale_h, 0.100), 24, 16)
        add_sphere_part("Mustache", "hair", (0.0, cy - 0.024 * scale_h, 0.084), (0.044, 0.013, 0.020))

    elif headgear == "tactical_beard":
        add_sphere_part("ShortHair", "hair", (0.0, cy + 0.024 * scale_h, -0.024), (0.090, 0.088 * scale_h, 0.094))
        beard_rings = [
            _oval_ring(0.0, cy - 0.084 * scale_h, 0.042, 0.044, 0.032, 16),
            _oval_ring(0.0, cy - 0.056 * scale_h, 0.040, 0.068, 0.046, 16),
            _oval_ring(0.0, cy - 0.030 * scale_h, 0.036, 0.078, 0.052, 16),
        ]
        bp, buv, bj, bw, bi = make_loft_tube(beard_rings, [(4, 3, 0.1)] * 3, closed_caps=True)
        parts.append(MeshPart("TrimmedBeard", "hair", bp, compute_smooth_normals(bp, bi), buv, bj, bw, bi))

    elif headgear == "hakla_photo":
        # Hakla: Full 3D sculpted twin-tuft + center mohawk crest hairstyle (ZERO pasted photos!)
        add_sphere_part("CenterMohawk", "hair", (0.0, cy + 0.118 * scale_h, 0.008), (0.036, 0.064 * scale_h, 0.070), 18, 12)
        for side in (-1.0, 1.0):
            add_sphere_part(
                "SideTuft",
                "hair",
                (side * 0.118, cy + 0.008 * scale_h, -0.012),
                (0.054, 0.032 * scale_h, 0.036),
                16,
                10,
            )
        add_sphere_part("BackHair", "hair", (0.0, cy + 0.018 * scale_h, -0.045), (0.082, 0.076 * scale_h, 0.062))

    elif headgear == "golden_crown":
        add_sphere_part("RoyalHair", "hair", (0.0, cy + 0.020 * scale_h, -0.022), (0.092, 0.090 * scale_h, 0.096))
        # Golden Emperor Crown Ring + 5 Spires
        c_rings = [
            _oval_ring(0.0, cy + 0.072 * scale_h, 0.0, 0.092, 0.098, 22),
            _oval_ring(0.0, cy + 0.125 * scale_h, 0.0, 0.100, 0.104, 22),
        ]
        cp, cuv, cj, cw, ci = make_loft_tube(c_rings, [(4, 0, 0.0), (4, 0, 0.0)], closed_caps=True)
        parts.append(MeshPart("CrownBase", "metal", cp, compute_smooth_normals(cp, ci), cuv, cj, cw, ci))
        for ang_deg in (-65, -30, 0, 30, 65):
            rad = math.radians(ang_deg)
            sx = math.sin(rad) * 0.088
            sz = math.cos(rad) * 0.092
            sp, suv, sj, sw, si = _box_mesh(sx, cy + 0.155 * scale_h, sz, 0.016, 0.038 * scale_h, 0.014, 4)
            parts.append(MeshPart("CrownSpire", "metal", sp, compute_smooth_normals(sp, si), suv, sj, sw, si))

    return parts


def build_clothing_and_accessories(
    char_id: str,
    headgear: str,
    prop_type: str,
    scale_h: float = 1.0,
    build_width: float = 1.0,
) -> list[MeshPart]:
    """Model 3D kurtas, Nehru jackets, sarees, mufflers, capes, and held props around the body."""
    parts: list[MeshPart] = []
    bw = build_width

    if headgear == "saree_bun":
        # Full pleated saree skirt from waist down to ankles + diagonal saree pallu
        skirt_rings = [
            _oval_ring(0.0, 0.12 * scale_h, 0.0, 0.175 * bw, 0.140 * bw, 22),
            _oval_ring(0.0, 0.50 * scale_h, 0.0, 0.168 * bw, 0.125 * bw, 22),
            _oval_ring(0.0, 0.90 * scale_h, 0.0, 0.155 * bw, 0.105 * bw, 22),
        ]
        sp, suv, sj, sw, si = make_loft_tube(
            skirt_rings, [(14, 17, 0.5), (13, 16, 0.5), (0, 1, 0.2)], closed_caps=False
        )
        parts.append(MeshPart("SareeSkirt", "garment_secondary", sp, compute_smooth_normals(sp, si), suv, sj, sw, si))
        # Diagonal pallu across torso & over left shoulder
        pp, puv, pj, pw, pi = _box_mesh(0.04, 1.24 * scale_h, 0.06, 0.13 * bw, 0.24 * scale_h, 0.06, 2, rot_z=0.42)
        parts.append(MeshPart("SareePallu", "garment_secondary", pp, compute_smooth_normals(pp, pi), puv, pj, pw, pi))
    else:
        # Kurta / Tunic Skirt / Jacket Hem draping cleanly over hips & upper thighs
        skirt_rings = [
            _oval_ring(0.0, 0.65 * scale_h, 0.0, 0.176 * bw, 0.124 * bw, 22),
            _oval_ring(0.0, 0.78 * scale_h, 0.0, 0.164 * bw, 0.114 * bw, 22),
            _oval_ring(0.0, 0.90 * scale_h, 0.0, 0.152 * bw, 0.102 * bw, 22),
        ]
        kp, kuv, kj, kw, ki = make_loft_tube(
            skirt_rings, [(0, 13, 0.22), (0, 16, 0.18), (0, 1, 0.1)], closed_caps=False
        )
        parts.append(MeshPart("KurtaSkirt", "garment_primary", kp, compute_smooth_normals(kp, ki), kuv, kj, kw, ki))

    # Tailored Nehru Jacket / Vest Shell (Mitron, Chanakya, Hakla)
    if headgear in ("beard_glasses", "tactical_beard", "hakla_photo"):
        vest_rings = [
            _oval_ring(0.0, 0.88 * scale_h, 0.0, 0.158 * bw, 0.106 * bw, 22),
            _oval_ring(0.0, 1.15 * scale_h, 0.0, 0.158 * bw, 0.110 * bw, 22),
            _oval_ring(0.0, 1.38 * scale_h, 0.0, 0.192 * bw, 0.124 * bw, 22),
            _oval_ring(0.0, 1.46 * scale_h, 0.0, 0.120 * bw, 0.088 * bw, 22),
        ]
        mat = "garment_primary" if headgear != "hakla_photo" else "garment_secondary"
        vp, vuv, vj, vw, vi = make_loft_tube(
            vest_rings, [(0, 1, 0.4), (1, 2, 0.4), (2, 1, 0.1), (2, 3, 0.2)], closed_caps=False
        )
        parts.append(MeshPart("JacketShell", mat, vp, compute_smooth_normals(vp, vi), vuv, vj, vw, vi))

        if headgear == "beard_glasses":
            # Gold buttons & pocket square on Mitron's Nehru jacket
            for by in (1.08, 1.19, 1.30):
                bp, buv, bj, bw2, bi = make_uv_sphere((0.0, by * scale_h, 0.118 * bw), (0.010, 0.010, 0.008), 2, 10, 8)
                parts.append(MeshPart("JacketButton", "metal", bp, compute_smooth_normals(bp, bi), buv, bj, bw2, bi))
            sq_p, sq_uv, sq_j, sq_w, sq_i = _box_mesh(0.088 * bw, 1.33 * scale_h, 0.116 * bw, 0.024, 0.016, 0.008, 2)
            parts.append(MeshPart("PocketSquare", "accent_cloth", sq_p, compute_smooth_normals(sq_p, sq_i), sq_uv, sq_j, sq_w, sq_i))

    # Muffler Man's wrapped woollen muffler + scarf tail
    if headgear == "gandhi_cap_muffler":
        muf_rings = [
            _oval_ring(0.0, 1.40 * scale_h, 0.005, 0.104, 0.104, 20),
            _oval_ring(0.0, 1.48 * scale_h, 0.005, 0.098, 0.098, 20),
            _oval_ring(0.0, 1.54 * scale_h, 0.002, 0.088, 0.088, 20),
        ]
        mp, muv, mj, mw, mi = make_loft_tube(muf_rings, [(2, 3, 0.3), (3, 2, 0.3), (3, 4, 0.2)], closed_caps=True)
        parts.append(MeshPart("MufflerCoil", "muffler", mp, compute_smooth_normals(mp, mi), muv, mj, mw, mi))
        tp, tuv, tj, tw, ti = _box_mesh(-0.065, 1.24 * scale_h, 0.116, 0.036, 0.20 * scale_h, 0.016, 19)
        parts.append(MeshPart("MufflerTail", "muffler", tp, compute_smooth_normals(tp, ti), tuv, tj, tw, ti))

    # Boss Pauldrons & Royal Cape
    if char_id == "samrat_ordinance":
        for side in (-1.0, 1.0):
            pp, puv, pj, pw, pi = make_uv_sphere(
                (side * 0.20 * bw, 1.44 * scale_h, 0.0), (0.075, 0.055 * scale_h, 0.075), bone_idx=2, n_lon=14, n_lat=10
            )
            parts.append(MeshPart("ShoulderPauldron", "metal", pp, compute_smooth_normals(pp, pi), puv, pj, pw, pi))
        cp, cuv, cj, cw, ci = _box_mesh(0.0, 0.92 * scale_h, -0.145, 0.24 * bw, 0.56 * scale_h, 0.014, 19)
        parts.append(MeshPart("RoyalCape", "garment_secondary", cp, compute_smooth_normals(cp, ci), cuv, cj, cw, ci))

    # Held Prop attached to RightHand (bone 12)
    hx = -0.24 * bw
    hy = 0.85 * scale_h
    if prop_type in ("mic", "scepter", "lantern"):
        shaft_h = 0.22 if prop_type == "scepter" else 0.11
        sp, suv, sj, sw, si = _box_mesh(hx, hy + shaft_h * 0.5, 0.08, 0.014, shaft_h, 0.014, 12, rot_z=0.35)
        parts.append(MeshPart("PropShaft", "metal", sp, compute_smooth_normals(sp, si), suv, sj, sw, si))
        hp, huv, hj, hw, hi = make_uv_sphere((hx - 0.03, hy + shaft_h + 0.04, 0.09), (0.030, 0.032, 0.030), 12, 14, 10)
        parts.append(MeshPart("PropHead", "metal", hp, compute_smooth_normals(hp, hi), huv, hj, hw, hi))
    elif prop_type == "megaphone":
        mp, muv, mj, mw, mi = _box_mesh(hx - 0.02, hy + 0.04, 0.11, 0.038, 0.042, 0.075, 12, rot_z=0.2)
        parts.append(MeshPart("PropMegaphone", "metal", mp, compute_smooth_normals(mp, mi), muv, mj, mw, mi))
    elif prop_type == "gold_bar":
        gp, guv, gj, gw, gi = _box_mesh(hx, hy + 0.02, 0.09, 0.030, 0.022, 0.055, 12)
        parts.append(MeshPart("PropGoldBar", "metal", gp, compute_smooth_normals(gp, gi), guv, gj, gw, gi))

    return parts
