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
