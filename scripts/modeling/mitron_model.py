import math
import numpy as np
from .human_mesh import (
    MeshPart,
    _oval_ring,
    compute_smooth_normals,
    make_loft_tube,
    make_uv_sphere,
)


def _quad_box(
    cx: float,
    cy: float,
    cz: float,
    hx: float,
    hy: float,
    hz: float,
    bone_idx: int,
    rot_x: float = 0.0,
    rot_y: float = 0.0,
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
    if abs(rot_x) > 1e-4:
        c, s = math.cos(rot_x), math.sin(rot_x)
        y, z = corners[:, 1] * c - corners[:, 2] * s, corners[:, 1] * s + corners[:, 2] * c
        corners[:, 1], corners[:, 2] = y, z
    if abs(rot_y) > 1e-4:
        c, s = math.cos(rot_y), math.sin(rot_y)
        x, z = corners[:, 0] * c + corners[:, 2] * s, -corners[:, 0] * s + corners[:, 2] * c
        corners[:, 0], corners[:, 2] = x, z
    if abs(rot_z) > 1e-4:
        c, s = math.cos(rot_z), math.sin(rot_z)
        x, y = corners[:, 0] * c - corners[:, 1] * s, corners[:, 0] * s + corners[:, 1] * c
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


def build_mitron_head_and_face(head_center_y: float = 1.60) -> list[MeshPart]:
    """
    High-resolution 56x44 sculpted Narendra Modi-inspired 3D head, face, neck,
    eyeballs, thick silver-white eyebrows, close-cropped receding hair, dense full
    white beard + moustache, and signature rimless rectangular spectacles.
    """
    parts: list[MeshPart] = []
    n_lon = 56
    n_lat = 44
    cy = head_center_y
    rx_base = 0.088
    ry_base = 0.114
    rz_base = 0.097

    verts, uvs, joints, weights = [], [], [], []
    for lat in range(n_lat + 1):
        v = lat / n_lat
        for lon in range(n_lon + 1):
            u = lon / n_lon
            theta = (u - 0.5) * 2.0 * math.pi  # 0 = +Z front

            if v <= 0.80:
                phi = (v / 0.80) * (math.pi * 0.85)
                sin_p, cos_p = math.sin(phi), math.cos(phi)

                # Dignified broad forehead + fuller cheeks + rounded jaw
                w_scale = 1.0
                if v > 0.54:
                    t_jaw = (v - 0.54) / 0.26
                    w_scale = 1.0 - t_jaw * 0.26
                elif v < 0.24:
                    w_scale = 0.96

                x = rx_base * w_scale * sin_p * math.sin(theta)
                y = cy + ry_base * cos_p
                z = rz_base * sin_p * math.cos(theta)

                if abs(math.sin(theta)) > 0.72 and v < 0.52:
                    x *= 0.95

                if math.cos(theta) > 0.08:
                    # Broad brow ridge (v ~ 0.37..0.41)
                    brow = math.exp(-((v - 0.388) / 0.028) ** 2) * math.exp(-((u - 0.50) / 0.095) ** 2)
                    z += brow * 0.011

                    # Eye sockets (u ~ 0.440, 0.560, v ~ 0.442)
                    sock_l = math.exp(-((u - 0.440) / 0.024) ** 2 - ((v - 0.442) / 0.023) ** 2)
                    sock_r = math.exp(-((u - 0.560) / 0.024) ** 2 - ((v - 0.442) / 0.023) ** 2)
                    z -= (sock_l + sock_r) * 0.015

                    # Upper eyelid folds
                    lid_l = math.exp(-((u - 0.440) / 0.030) ** 2 - ((v - 0.420) / 0.010) ** 2)
                    lid_r = math.exp(-((u - 0.560) / 0.030) ** 2 - ((v - 0.420) / 0.010) ** 2)
                    z += (lid_l + lid_r) * 0.0045

                    # Characteristic broader straight nasal bridge + rounded tip + nostrils
                    bridge = math.exp(-((u - 0.50) / 0.019) ** 2) * math.exp(-((v - 0.485) / 0.062) ** 2)
                    tip = math.exp(-((u - 0.50) / 0.023) ** 2 - ((v - 0.542) / 0.024) ** 2)
                    ala_l = math.exp(-((u - 0.471) / 0.015) ** 2 - ((v - 0.550) / 0.017) ** 2)
                    ala_r = math.exp(-((u - 0.529) / 0.015) ** 2 - ((v - 0.550) / 0.017) ** 2)
                    z += bridge * 0.017 + tip * 0.018 + (ala_l + ala_r) * 0.009

                    # Warm full cheekbones & slight smiling cheek lift
                    cheek_l = math.exp(-((u - 0.402) / 0.038) ** 2 - ((v - 0.535) / 0.038) ** 2)
                    cheek_r = math.exp(-((u - 0.598) / 0.038) ** 2 - ((v - 0.535) / 0.038) ** 2)
                    z += (cheek_l + cheek_r) * 0.011
                    x += (cheek_r - cheek_l) * 0.006

                    # Sculpted gentle smiling lips (v ~ 0.645..0.685)
                    lip_u = math.exp(-((u - 0.50) / 0.035) ** 2 - ((v - 0.648) / 0.012) ** 2)
                    lip_gap = math.exp(-((u - 0.50) / 0.034) ** 2 - ((v - 0.665) / 0.005) ** 2)
                    lip_l = math.exp(-((u - 0.50) / 0.031) ** 2 - ((v - 0.682) / 0.013) ** 2)
                    z += lip_u * 0.011 + lip_l * 0.012 - lip_gap * 0.006

                    # Rounded chin
                    chin = math.exp(-((u - 0.50) / 0.038) ** 2 - ((v - 0.760) / 0.030) ** 2)
                    z += chin * 0.012

                w_neck = max(0.0, (v - 0.70) / 0.10) * 0.35
                j0, j1, w1 = 4, 3, w_neck
            else:
                # Full natural neck seating seamlessly into the collar
                t_n = (v - 0.80) / 0.20
                neck_rx = 0.062 + t_n * 0.014
                neck_rz = 0.062 + t_n * 0.012
                x = neck_rx * math.sin(theta)
                y = (cy - ry_base * 0.82) - t_n * 0.12
                z = -0.010 + neck_rz * math.cos(theta)
                j0, j1, w1 = 3, 2, t_n * 0.65

            verts.append([x, y, z])
            uvs.append([u, v])
            joints.append([j0, j1, 0, 0])
            weights.append([1.0 - w1, w1, 0.0, 0.0])

    stride = n_lon + 1
    tris = []
    for lat in range(n_lat):
        for lon in range(n_lon):
            i0 = lat * stride + lon
            i1 = i0 + 1
            i2 = (lat + 1) * stride + lon
            i3 = i2 + 1
            tris.append([i0, i2, i1])
            tris.append([i1, i2, i3])

    pos = np.array(verts, dtype=np.float32)
    idx = np.array(tris, dtype=np.uint32).reshape(-1)
    parts.append(
        MeshPart(
            name="MitronHeadAndNeck",
            material_key="skin",
            positions=pos,
            normals=compute_smooth_normals(pos, idx),
            uvs=np.array(uvs, dtype=np.float32),
            joints=np.array(joints, dtype=np.uint8),
            weights=np.array(weights, dtype=np.float32),
            indices=idx,
        )
    )

    # Sculpted Ears (using clean body_skin so ears have no facial socket spots)
    for side in (-1.0, 1.0):
        ep, euv, ej, ew, ei = make_uv_sphere(
            (side * 0.090, cy - 0.005, -0.006), (0.013, 0.028, 0.018), bone_idx=4, n_lon=14, n_lat=12
        )
        parts.append(MeshPart("MitronEar", "body_skin", ep, compute_smooth_normals(ep, ei), euv, ej, ew, ei))

    # Recessed 3D Eyeballs
    for side in (-1.0, 1.0):
        ey_p, ey_uv, ey_j, ey_w, ey_i = make_uv_sphere(
            (side * 0.032, cy + 0.016, 0.072),
            (0.0135, 0.0135, 0.0135),
            bone_idx=4,
            n_lon=16,
            n_lat=12,
            face_forward_z=True,
        )
        parts.append(MeshPart("MitronEye", "eye", ey_p, compute_smooth_normals(ey_p, ey_i), ey_uv, ey_j, ey_w, ey_i))

    # Signature Thick Arched Silver-White Eyebrows (from Reference Image 2)
    for side in (-1.0, 1.0):
        brow_rings = [
            _oval_ring(side * 0.014, cy + 0.036, 0.088, 0.007, 0.007, 10),
            _oval_ring(side * 0.033, cy + 0.041, 0.085, 0.009, 0.008, 10),
            _oval_ring(side * 0.052, cy + 0.035, 0.077, 0.006, 0.006, 10),
        ]
        bp, buv, bj, bw, bi = make_loft_tube(brow_rings, [(4, 0, 0.0)] * 3, closed_caps=True)
        parts.append(MeshPart("MitronEyebrow", "hair", bp, compute_smooth_normals(bp, bi), buv, bj, bw, bi))

    # Close-cropped, neatly combed Silver-White Hair matching high forehead & receding temples
    # Sculpted back & top crown (positioned slightly back so forehead stays broad and authentic)
    hp, huv, hj, hw, hi = make_uv_sphere((0.0, cy + 0.024, -0.024), (0.090, 0.092, 0.092), 4, 28, 20)
    parts.append(MeshPart("MitronHairCrown", "hair", hp, compute_smooth_normals(hp, hi), huv, hj, hw, hi))
    # Subtle combed-back top hair crest (not an exaggerated tall puff)
    tp, tuv, tj, tw, ti = make_uv_sphere((0.0, cy + 0.084, -0.006), (0.058, 0.028, 0.062), 4, 20, 14)
    parts.append(MeshPart("MitronHairTop", "hair", tp, compute_smooth_normals(tp, ti), tuv, tj, tw, ti))
    # Sideburn taper connecting temple hair seamlessly down into beard
    for side in (-1.0, 1.0):
        sp, suv, sj, sw, si = make_uv_sphere(
            (side * 0.080, cy - 0.018, 0.008), (0.018, 0.046, 0.032), 4, 14, 10
        )
        parts.append(MeshPart("MitronSideburn", "hair", sp, compute_smooth_normals(sp, si), suv, sj, sw, si))

    # Dense, Full, Contoured 3D Silver-White Beard & Moustache (Reference Image 2)
    # Multi-ring anatomical cheek-jaw-chin beard volume (no gap between cheek/jaw/chin)
    beard_rings = [
        _oval_ring(0.0, cy - 0.118, 0.042, 0.048, 0.040, 22),  # Rounded full beard bottom
        _oval_ring(0.0, cy - 0.092, 0.036, 0.068, 0.056, 22),  # Chin mass
        _oval_ring(0.0, cy - 0.062, 0.028, 0.082, 0.068, 22),  # Jawline & lower cheeks
        _oval_ring(0.0, cy - 0.034, 0.022, 0.085, 0.064, 22),  # Mid-cheek beard blend
    ]
    bd_p, bd_uv, bd_j, bd_w, bd_i = make_loft_tube(
        beard_rings, [(4, 3, 0.15), (4, 3, 0.10), (4, 3, 0.05), (4, 0, 0.0)], closed_caps=True
    )
    parts.append(MeshPart("MitronFullBeard", "hair", bd_p, compute_smooth_normals(bd_p, bd_i), bd_uv, bd_j, bd_w, bd_i))

    # Cheek-sidebeard wings bridging sideburns cleanly into lower beard
    for side in (-1.0, 1.0):
        cp, cuv, cj, cw, ci = make_uv_sphere(
            (side * 0.064, cy - 0.052, 0.042), (0.030, 0.036, 0.034), 4, 16, 12
        )
        parts.append(MeshPart("MitronCheekBeard", "hair", cp, compute_smooth_normals(cp, ci), cuv, cj, cw, ci))

    # Full sculpted curved Moustache connecting smoothly into cheek beard on both sides
    m_rings = [
        _oval_ring(-0.046, cy - 0.042, 0.064, 0.012, 0.012, 12),
        _oval_ring(-0.022, cy - 0.028, 0.084, 0.014, 0.013, 12),
        _oval_ring(0.0, cy - 0.026, 0.091, 0.015, 0.014, 12),
        _oval_ring(0.022, cy - 0.028, 0.084, 0.014, 0.013, 12),
        _oval_ring(0.046, cy - 0.042, 0.064, 0.012, 0.012, 12),
    ]
    mp, muv, mj, mw, mi = make_loft_tube(m_rings, [(4, 0, 0.0)] * 5, closed_caps=True)
    parts.append(MeshPart("MitronMoustache", "hair", mp, compute_smooth_normals(mp, mi), muv, mj, mw, mi))

    # Signature Rimless Rectangular Spectacles (delicate silver bridge/temples + translucent lenses)
    br_p, br_uv, br_j, br_w, br_i = _quad_box(0.0, cy + 0.019, 0.095, 0.010, 0.0022, 0.0025, 4)
    parts.append(MeshPart("MitronGlassBridge", "metal", br_p, compute_smooth_normals(br_p, br_i), br_uv, br_j, br_w, br_i))
    for side in (-1.0, 1.0):
        # Translucent rectangular lens
        lp, luv, lj, lw, li = _quad_box(side * 0.032, cy + 0.015, 0.093, 0.021, 0.013, 0.0018, 4)
        parts.append(MeshPart("MitronGlassLens", "glass_lens", lp, compute_smooth_normals(lp, li), luv, lj, lw, li))
        # Slim silver side hinge + temple arm
        hp2, huv2, hj2, hw2, hi2 = _quad_box(side * 0.056, cy + 0.018, 0.086, 0.004, 0.0022, 0.008, 4)
        parts.append(MeshPart("MitronGlassHinge", "metal", hp2, compute_smooth_normals(hp2, hi2), huv2, hj2, hw2, hi2))
        tp2, tuv2, tj2, tw2, ti2 = _quad_box(side * 0.078, cy + 0.016, 0.044, 0.0022, 0.0022, 0.048, 4, rot_y=side * 0.20)
        parts.append(MeshPart("MitronGlassTemple", "metal", tp2, compute_smooth_normals(tp2, ti2), tuv2, tj2, tw2, ti2))

    return parts


def build_mitron_full_body_and_attire(build_width: float = 1.07) -> list[MeshPart]:
    """
    Build Mitron's complete anatomically proportioned 3D body & garments matching Reference Image 2:
    - Full-sleeve crisp white kurta (inner collar, full sleeves to wrist cuffs, split kurta skirt)
    - Light beige woven sleeveless Nehru jacket (bandhgala collar, front placket, 4 grey buttons,
      left chest pocket with pen & lapel badge)
    - Articulated 5-finger hands in clean body skin
    - Fitted white churidar pajama & grounded dark leather shoes
    """
    parts: list[MeshPart] = []
    bw = build_width

    # 1. White Kurta Base Torso + Inner Collar Stand
    kurta_torso = [
        (0.86, 0.148 * bw, 0.098 * bw, (0, 1, 0.0)),
        (0.95, 0.152 * bw, 0.102 * bw, (0, 1, 0.25)),
        (1.08, 0.146 * bw, 0.098 * bw, (1, 2, 0.20)),
        (1.22, 0.160 * bw, 0.108 * bw, (1, 2, 0.65)),
        (1.36, 0.180 * bw, 0.114 * bw, (2, 3, 0.05)),
        (1.44, 0.158 * bw, 0.096 * bw, (2, 3, 0.28)),
        (1.485, 0.070 * bw, 0.068 * bw, (3, 2, 0.30)),
    ]
    kt_rings = [_oval_ring(0.0, y, 0.0, rx, rz, 26) for y, rx, rz, _ in kurta_torso]
    kt_bones = [b for _, _, _, b in kurta_torso]
    kp, kuv, kj, kw, ki = make_loft_tube(kt_rings, kt_bones, closed_caps=True)
    parts.append(MeshPart("MitronKurtaTorso", "kurta", kp, compute_smooth_normals(kp, ki), kuv, kj, kw, ki))

    # Split lower kurta hem (front & back panels draping naturally without leg-clipping triangle)
    for z_dir, name in ((1.0, "KurtaFrontPanel"), (-1.0, "KurtaBackPanel")):
        panel_rings = [
            _oval_ring(0.0, 0.68, z_dir * 0.042, 0.145 * bw, 0.072 * bw, 18),
            _oval_ring(0.0, 0.78, z_dir * 0.036, 0.146 * bw, 0.070 * bw, 18),
            _oval_ring(0.0, 0.88, z_dir * 0.028, 0.144 * bw, 0.066 * bw, 18),
        ]
        pp, puv, pj, pw, pi = make_loft_tube(
            panel_rings, [(0, 1, 0.05), (0, 1, 0.05), (0, 1, 0.1)], closed_caps=False
        )
        parts.append(MeshPart(name, "kurta", pp, compute_smooth_normals(pp, pi), puv, pj, pw, pi))

    # 2. Light Beige Sleeveless Nehru Jacket (Reference Image 2)
    jacket_specs = [
        (0.85, 0.156 * bw, 0.106 * bw, (0, 1, 0.08)),
        (0.98, 0.160 * bw, 0.110 * bw, (0, 1, 0.30)),
        (1.14, 0.158 * bw, 0.110 * bw, (1, 2, 0.45)),
        (1.28, 0.172 * bw, 0.120 * bw, (2, 1, 0.15)),
        (1.40, 0.188 * bw, 0.122 * bw, (2, 3, 0.05)),
        (1.445, 0.150 * bw, 0.098 * bw, (2, 3, 0.25)),
    ]
    jk_rings = [_oval_ring(0.0, y, 0.0, rx, rz, 28) for y, rx, rz, _ in jacket_specs]
    jk_bones = [b for _, _, _, b in jacket_specs]
    jp, juv, jj, jw, ji = make_loft_tube(jk_rings, jk_bones, closed_caps=False)
    parts.append(MeshPart("MitronNehruJacket", "jacket", jp, compute_smooth_normals(jp, ji), juv, jj, jw, ji))

    # Bandhgala Standing Nehru Collar (y = 1.43..1.48)
    collar_rings = [
        _oval_ring(0.0, 1.430, -0.002, 0.088 * bw, 0.082 * bw, 22),
        _oval_ring(0.0, 1.475, -0.004, 0.076 * bw, 0.074 * bw, 22),
    ]
    cp, cuv, cj, cw, ci = make_loft_tube(collar_rings, [(2, 3, 0.45), (3, 2, 0.35)], closed_caps=False)
    parts.append(MeshPart("MitronJacketCollar", "jacket", cp, compute_smooth_normals(cp, ci), cuv, cj, cw, ci))

    # Center Placket Seam + 4 Grey-Horn Buttons (matching Reference Image 2)
    pl_p, pl_uv, pl_j, pl_w, pl_i = _quad_box(0.0, 1.15, 0.116 * bw, 0.016, 0.27, 0.006, 2)
    parts.append(MeshPart("MitronJacketPlacket", "jacket", pl_p, compute_smooth_normals(pl_p, pl_i), pl_uv, pl_j, pl_w, pl_i))
    for by in (0.94, 1.09, 1.24, 1.38):
        bz = (0.112 if by < 1.0 else 0.123) * bw
        bp, buv, bj, bw2, bi = make_uv_sphere((0.0, by, bz), (0.011, 0.011, 0.005), 2, 12, 10)
        parts.append(MeshPart("MitronJacketButton", "button", bp, compute_smooth_normals(bp, bi), buv, bj, bw2, bi))

    # Left Chest Pocket + Silver-Black Pen + Circular Lapel Pin (Reference Image 2)
    pk_x = 0.078 * bw
    pk_p, pk_uv, pk_j, pk_w, pk_i = _quad_box(pk_x, 1.285, 0.114 * bw, 0.036, 0.028, 0.006, 2, rot_y=0.35)
    parts.append(MeshPart("MitronChestPocket", "jacket", pk_p, compute_smooth_normals(pk_p, pk_i), pk_uv, pk_j, pk_w, pk_i))
    # Pocket pen clip
    pen_p, pen_uv, pen_j, pen_w, pen_i = _quad_box(pk_x - 0.015, 1.318, 0.120 * bw, 0.004, 0.024, 0.004, 2)
    parts.append(MeshPart("MitronPocketPen", "metal", pen_p, compute_smooth_normals(pen_p, pen_i), pen_uv, pen_j, pen_w, pen_i))
    # Circular lapel badge/pin
    pin_p, pin_uv, pin_j, pin_w, pin_i = make_uv_sphere((pk_x + 0.018, 1.315, 0.112 * bw), (0.013, 0.013, 0.006), 2, 14, 10)
    parts.append(MeshPart("MitronPocketPin", "lapel_pin", pin_p, compute_smooth_normals(pin_p, pin_i), pin_uv, pin_j, pin_w, pin_i))

    # 3. Full-Sleeve White Kurta Arms (UpperArm + Forearm in crisp white cotton!) + Clean Hands
    for is_left in (True, False):
        sign = 1.0 if is_left else -1.0
        b_sh = 5 if is_left else 9
        b_ua = 6 if is_left else 10
        b_fa = 7 if is_left else 11
        b_ha = 8 if is_left else 12
        b_fn = 20 if is_left else 21

        sx = sign * 0.198 * bw
        sleeve_specs = [
            (sx * 0.85, 1.43, 0.056 * bw, 0.054 * bw, (b_sh, b_ua, 0.65)),
            (sx * 1.00, 1.38, 0.058 * bw, 0.056 * bw, (b_ua, b_sh, 0.15)),
            (sx * 1.05, 1.26, 0.052 * bw, 0.051 * bw, (b_ua, b_fa, 0.12)),
            (sx * 1.09, 1.15, 0.048 * bw, 0.047 * bw, (b_ua, b_fa, 0.55)),
            (sx * 1.12, 1.02, 0.045 * bw, 0.044 * bw, (b_fa, b_ua, 0.10)),
            (sx * 1.14, 0.91, 0.036 * bw, 0.034 * bw, (b_fa, b_ha, 0.45)),
        ]
        s_rings = [_oval_ring(x, y, 0.0, rx, rz, 18) for x, y, rx, rz, _ in sleeve_specs]
        s_bones = [b for _, _, _, _, b in sleeve_specs]
        sp, suv, sj, sw, si = make_loft_tube(s_rings, s_bones, closed_caps=True)
        parts.append(
            MeshPart(
                "LeftKurtaSleeve" if is_left else "RightKurtaSleeve",
                "kurta",
                sp,
                compute_smooth_normals(sp, si),
                suv,
                sj,
                sw,
                si,
            )
        )

        # Wrist & Palm (clean body_skin)
        palm_x = sx * 1.14
        palm_rings = [
            _oval_ring(palm_x, 0.91, 0.002, 0.028, 0.026, 14),
            _oval_ring(palm_x, 0.86, 0.010, 0.022, 0.038, 14),
            _oval_ring(palm_x, 0.825, 0.012, 0.019, 0.036, 14),
        ]
        pp, puv, pj, pw, pi = make_loft_tube(
            palm_rings, [(b_ha, b_fa, 0.2), (b_ha, b_fn, 0.1), (b_ha, b_fn, 0.35)], closed_caps=True
        )
        parts.append(MeshPart("LeftPalm" if is_left else "RightPalm", "body_skin", pp, compute_smooth_normals(pp, pi), puv, pj, pw, pi))

        # 5 Articulated Fingers per Hand
        finger_offsets = [
            ("Thumb", -sign * 0.012, 0.868, 0.036, 0.034, 0.010),
            ("Index", 0.0, 0.822, 0.034, 0.044, 0.0085),
            ("Middle", 0.0, 0.820, 0.012, 0.048, 0.0085),
            ("Ring", 0.0, 0.821, -0.010, 0.044, 0.0080),
            ("Pinky", 0.0, 0.824, -0.030, 0.036, 0.0072),
        ]
        for fname, dx_f, y_base, dz_f, flen, frad in finger_offsets:
            fx = palm_x + dx_f
            f_rings = [
                _oval_ring(fx, y_base, dz_f, frad, frad, 10),
                _oval_ring(fx - sign * 0.008, y_base - flen * 0.55, dz_f + 0.006, frad * 0.9, frad * 0.9, 10),
                _oval_ring(fx - sign * 0.020, y_base - flen * 0.95, dz_f + 0.010, frad * 0.72, frad * 0.72, 10),
            ]
            fgp, fguv, fgj, fgw, fgi = make_loft_tube(
                f_rings, [(b_ha, b_fn, 0.3), (b_fn, b_ha, 0.2), (b_fn, b_ha, 0.05)], closed_caps=True
            )
            parts.append(
                MeshPart(
                    f"{'Left' if is_left else 'Right'}{fname}",
                    "body_skin",
                    fgp,
                    compute_smooth_normals(fgp, fgi),
                    fguv,
                    fgj,
                    fgw,
                    fgi,
                )
            )

    # 4. White Churidar Pajama Legs & Grounded Formal Leather Shoes
    for is_left in (True, False):
        sign = 1.0 if is_left else -1.0
        b_th = 13 if is_left else 16
        b_sh = 14 if is_left else 17
        b_ft = 15 if is_left else 18
        lx = sign * 0.104 * bw

        leg_specs = [
            (0.91, 0.088 * bw, 0.092 * bw, (b_th, 0, 0.35)),
            (0.72, 0.076 * bw, 0.080 * bw, (b_th, b_sh, 0.05)),
            (0.51, 0.058 * bw, 0.060 * bw, (b_th, b_sh, 0.50)),
            (0.32, 0.056 * bw, 0.058 * bw, (b_sh, b_th, 0.10)),
            (0.18, 0.048 * bw, 0.050 * bw, (b_sh, b_ft, 0.25)),
            (0.14, 0.052 * bw, 0.054 * bw, (b_sh, b_ft, 0.35)),  # Churidar ankle gather
            (0.10, 0.044 * bw, 0.046 * bw, (b_sh, b_ft, 0.50)),
        ]
        l_rings = [_oval_ring(lx, y, 0.0, rx, rz, 20) for y, rx, rz, _ in leg_specs]
        l_bones = [b for _, _, _, b in leg_specs]
        lp, luv, lj, lw, li = make_loft_tube(l_rings, l_bones, closed_caps=True)
        parts.append(
            MeshPart(
                "LeftChuridar" if is_left else "RightChuridar",
                "kurta",
                lp,
                compute_smooth_normals(lp, li),
                luv,
                lj,
                lw,
                li,
            )
        )

        # Grounded Dark Leather Shoe / Mojari (y = 0.000 flush)
        shoe_rings = [
            _oval_ring(lx, 0.000, 0.048, 0.052, 0.118, 16),
            _oval_ring(lx, 0.028, 0.052, 0.050, 0.114, 16),
            _oval_ring(lx, 0.068, 0.032, 0.044, 0.086, 16),
            _oval_ring(lx, 0.105, 0.004, 0.042, 0.046, 16),
        ]
        shp, shuv, shj, shw, shi = make_loft_tube(
            shoe_rings, [(b_ft, b_sh, 0.05), (b_ft, b_sh, 0.05), (b_ft, b_sh, 0.15), (b_ft, b_sh, 0.45)], closed_caps=True
        )
        parts.append(
            MeshPart(
                "LeftShoe" if is_left else "RightShoe",
                "footwear",
                shp,
                compute_smooth_normals(shp, shi),
                shuv,
                shj,
                shw,
                shi,
            )
        )

    # 5. Sleek Handheld Microphone cleanly positioned in RightHand (no chest overlap)
    hx = -0.25 * bw
    hy = 0.84
    sh_p, sh_uv, sh_j, sh_w, sh_i = _quad_box(hx - 0.01, hy + 0.05, 0.095, 0.010, 0.075, 0.010, 12, rot_x=0.35)
    parts.append(MeshPart("MitronMicHandle", "dark_glass", sh_p, compute_smooth_normals(sh_p, sh_i), sh_uv, sh_j, sh_w, sh_i))
    mh_p, mh_uv, mh_j, mh_w, mh_i = make_uv_sphere((hx - 0.01, hy + 0.125, 0.128), (0.022, 0.024, 0.022), 12, 14, 10)
    parts.append(MeshPart("MitronMicHead", "metal", mh_p, compute_smooth_normals(mh_p, mh_i), mh_uv, mh_j, mh_w, mh_i))

    return parts


def build_mitron_complete_parts() -> list[MeshPart]:
    return [
        *build_mitron_head_and_face(head_center_y=1.60),
        *build_mitron_full_body_and_attire(build_width=1.07),
    ]

