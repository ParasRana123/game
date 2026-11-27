from dataclasses import dataclass, field
import math
import numpy as np


@dataclass
class MeshPart:
    name: str
    material_key: str
    positions: np.ndarray  # (N, 3) float32
    normals: np.ndarray    # (N, 3) float32
    uvs: np.ndarray        # (N, 2) float32
    joints: np.ndarray     # (N, 4) uint8
    weights: np.ndarray    # (N, 4) float32
    indices: np.ndarray    # (M,) uint32


def compute_smooth_normals(positions: np.ndarray, indices: np.ndarray) -> np.ndarray:
    normals = np.zeros_like(positions, dtype=np.float32)
    tris = indices.reshape(-1, 3)
    p0 = positions[tris[:, 0]]
    p1 = positions[tris[:, 1]]
    p2 = positions[tris[:, 2]]
    face_n = np.cross(p1 - p0, p2 - p0)
    np.add.at(normals, tris[:, 0], face_n)
    np.add.at(normals, tris[:, 1], face_n)
    np.add.at(normals, tris[:, 2], face_n)
    lens = np.linalg.norm(normals, axis=1, keepdims=True)
    lens = np.where(lens < 1e-6, 1.0, lens)
    return (normals / lens).astype(np.float32)


def make_loft_tube(
    rings_xyz: list[np.ndarray],
    bone_assignments: list[tuple[int, int, float]],
    v_coords: list[float] | None = None,
    closed_caps: bool = True,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Build a smooth watertight lofted surface from stacked cross-section rings.
    Each ring has shape (S, 3). Returns (positions, uvs, joints, weights, indices).
    """
    n_rings = len(rings_xyz)
    n_seg = len(rings_xyz[0])
    verts = []
    uvs = []
    joints = []
    weights = []

    for r_idx, ring in enumerate(rings_xyz):
        v = (r_idx / max(1, n_rings - 1)) if v_coords is None else v_coords[r_idx]
        b0, b1, w1 = bone_assignments[r_idx]
        w0 = 1.0 - w1
        for s_idx in range(n_seg + 1):
            p = ring[s_idx % n_seg]
            verts.append(p)
            uvs.append([s_idx / n_seg, v])
            joints.append([b0, b1, 0, 0])
            weights.append([w0, w1, 0.0, 0.0])

    stride = n_seg + 1
    tris = []
    for r in range(n_rings - 1):
        for s in range(n_seg):
            i0 = r * stride + s
            i1 = i0 + 1
            i2 = (r + 1) * stride + s
            i3 = i2 + 1
            tris.append([i0, i2, i1])
            tris.append([i1, i2, i3])

    if closed_caps:
        # Bottom cap
        b_center = len(verts)
        verts.append(np.mean(rings_xyz[0], axis=0))
        uvs.append([0.5, 0.0])
        b0, b1, w1 = bone_assignments[0]
        joints.append([b0, b1, 0, 0])
        weights.append([1.0 - w1, w1, 0.0, 0.0])
        for s in range(n_seg):
            tris.append([b_center, s + 1, s])

        # Top cap
        t_center = len(verts)
        verts.append(np.mean(rings_xyz[-1], axis=0))
        uvs.append([0.5, 1.0])
        b0, b1, w1 = bone_assignments[-1]
        joints.append([b0, b1, 0, 0])
        weights.append([1.0 - w1, w1, 0.0, 0.0])
        top_base = (n_rings - 1) * stride
        for s in range(n_seg):
            tris.append([t_center, top_base + s, top_base + s + 1])

    return (
        np.array(verts, dtype=np.float32),
        np.array(uvs, dtype=np.float32),
        np.array(joints, dtype=np.uint8),
        np.array(weights, dtype=np.float32),
        np.array(tris, dtype=np.uint32).reshape(-1),
    )


def make_uv_sphere(
    center: tuple[float, float, float],
    radii: tuple[float, float, float],
    bone_idx: int,
    n_lon: int = 16,
    n_lat: int = 12,
    face_forward_z: bool = False,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    cx, cy, cz = center
    rx, ry, rz = radii
    verts, uvs, joints, weights, tris = [], [], [], [], []
    for lat in range(n_lat + 1):
        phi = math.pi * lat / n_lat  # 0 top .. pi bottom
        for lon in range(n_lon + 1):
            theta = 2.0 * math.pi * lon / n_lon - math.pi  # 0 = +Z when rotated
            if face_forward_z:
                x = cx + rx * math.sin(phi) * math.sin(theta)
                y = cy + ry * math.cos(phi)
                z = cz + rz * math.sin(phi) * math.cos(theta)
                u = 0.5 + math.sin(phi) * math.sin(theta) * 0.48
                v = 0.5 - math.cos(phi) * 0.48
            else:
                x = cx + rx * math.sin(phi) * math.sin(theta)
                y = cy + ry * math.cos(phi)
                z = cz + rz * math.sin(phi) * math.cos(theta)
                u = lon / n_lon
                v = lat / n_lat
            verts.append([x, y, z])
            uvs.append([u, v])
            joints.append([bone_idx, 0, 0, 0])
            weights.append([1.0, 0.0, 0.0, 0.0])

    stride = n_lon + 1
    for lat in range(n_lat):
        for lon in range(n_lon):
            i0 = lat * stride + lon
            i1 = i0 + 1
            i2 = (lat + 1) * stride + lon
            i3 = i2 + 1
            tris.append([i0, i2, i1])
            tris.append([i1, i2, i3])

    return (
        np.array(verts, dtype=np.float32),
        np.array(uvs, dtype=np.float32),
        np.array(joints, dtype=np.uint8),
        np.array(weights, dtype=np.float32),
        np.array(tris, dtype=np.uint32).reshape(-1),
    )


def build_sculpted_head_and_neck(
    head_center_y: float = 1.62,
    jaw_width: float = 1.0,
    cheek_fullness: float = 1.0,
    nose_scale: float = 1.0,
    brow_intensity: float = 1.0,
    scale_h: float = 1.0,
) -> list[MeshPart]:
    """
    Build a high-detail continuous 3D sculpted head + neck mesh (with realistic brow,
    eye sockets, nose bridge/nostrils, lips, cheekbones, jawline, ears) plus recessed 3D eyeballs.
    """
    n_lon = 44
    n_lat = 34
    verts = []
    uvs = []
    joints = []
    weights = []

    cy = head_center_y * scale_h
    rx_base = 0.088
    ry_base = 0.114 * scale_h
    rz_base = 0.098

    for lat in range(n_lat + 1):
        v = lat / n_lat  # 0 = top of crown, 0.85 = chin/jawline, 1.0 = lower neck base
        for lon in range(n_lon + 1):
            u = lon / n_lon  # 0.5 = front center (+Z)
            theta = (u - 0.5) * 2.0 * math.pi  # -pi..+pi, 0 is +Z

            if v <= 0.82:
                # Cranial & facial dome mapped from 0..0.82 -> phi 0..0.86*pi
                phi = (v / 0.82) * (math.pi * 0.84)
                sin_p = math.sin(phi)
                cos_p = math.cos(phi)

                # Cranial vs facial taper
                w_scale = 1.0
                if v > 0.55:
                    # Jawline taper toward chin
                    t_jaw = (v - 0.55) / 0.27
                    w_scale = 1.0 - t_jaw * (0.34 - 0.08 * jaw_width)
                elif v < 0.22:
                    w_scale = 0.94

                x = rx_base * w_scale * sin_p * math.sin(theta)
                y = cy + ry_base * cos_p
                z = rz_base * sin_p * math.cos(theta)

                # Flatten side temples slightly for realistic skull
                if abs(math.sin(theta)) > 0.72 and v < 0.55:
                    x *= 0.93

                # Facial feature sculpting on the front hemisphere (z > 0)
                if math.cos(theta) > 0.1:
                    # Forehead & brow ridge (v ~ 0.36..0.41)
                    brow = math.exp(-((v - 0.385) / 0.032) ** 2) * math.exp(-((u - 0.50) / 0.095) ** 2)
                    z += brow * 0.011 * brow_intensity

                    # Deep Eye Sockets (u ~ 0.44 and 0.56, v ~ 0.445)
                    sock_l = math.exp(-((u - 0.442) / 0.025) ** 2 - ((v - 0.445) / 0.025) ** 2)
                    sock_r = math.exp(-((u - 0.558) / 0.025) ** 2 - ((v - 0.445) / 0.025) ** 2)
                    z -= (sock_l + sock_r) * 0.016

                    # Eyelid rims framing sockets
                    lid_l = math.exp(-((u - 0.442) / 0.032) ** 2 - ((v - 0.422) / 0.012) ** 2)
                    lid_r = math.exp(-((u - 0.558) / 0.032) ** 2 - ((v - 0.422) / 0.012) ** 2)
                    z += (lid_l + lid_r) * 0.004

                    # Sculpted Nose Bridge + Tip + Nostril Wings (u ~ 0.50, v ~ 0.41..0.56)
                    bridge = math.exp(-((u - 0.50) / 0.016) ** 2) * math.exp(-((v - 0.49) / 0.065) ** 2)
                    tip = math.exp(-((u - 0.50) / 0.020) ** 2 - ((v - 0.545) / 0.024) ** 2)
                    ala_l = math.exp(-((u - 0.476) / 0.014) ** 2 - ((v - 0.552) / 0.018) ** 2)
                    ala_r = math.exp(-((u - 0.524) / 0.014) ** 2 - ((v - 0.552) / 0.018) ** 2)
                    z += (bridge * 0.017 + tip * 0.016 + (ala_l + ala_r) * 0.008) * nose_scale

                    # Cheekbones (zygomatic arch)
                    cheek_l = math.exp(-((u - 0.405) / 0.036) ** 2 - ((v - 0.535) / 0.038) ** 2)
                    cheek_r = math.exp(-((u - 0.595) / 0.036) ** 2 - ((v - 0.535) / 0.038) ** 2)
                    z += (cheek_l + cheek_r) * 0.009 * cheek_fullness
                    x += (cheek_r - cheek_l) * 0.005 * cheek_fullness

                    # Sculpted Upper & Lower Lips + Mouth Parting Groove (v ~ 0.65..0.70)
                    lip_u = math.exp(-((u - 0.50) / 0.034) ** 2 - ((v - 0.648) / 0.013) ** 2)
                    lip_gap = math.exp(-((u - 0.50) / 0.032) ** 2 - ((v - 0.666) / 0.006) ** 2)
                    lip_l = math.exp(-((u - 0.50) / 0.030) ** 2 - ((v - 0.684) / 0.014) ** 2)
                    z += lip_u * 0.011 + lip_l * 0.012 - lip_gap * 0.007

                    # Chin projection (v ~ 0.76)
                    chin = math.exp(-((u - 0.50) / 0.036) ** 2 - ((v - 0.765) / 0.030) ** 2)
                    z += chin * 0.012 * jaw_width

                # Smoothly blend weight between Head(4) and Neck(3) near jaw base
                w_neck = max(0.0, (v - 0.72) / 0.10) * 0.35
                j0, j1, w1 = 4, 3, w_neck
            else:
                # Continuous Neck seamlessly transitioning from skull/jaw base into chest/shoulders
                t_n = (v - 0.82) / 0.18  # 0..1
                neck_r_x = 0.052 + t_n * 0.014
                neck_r_z = 0.054 + t_n * 0.012
                x = neck_r_x * math.sin(theta)
                y = (cy - ry_base * 0.84) - t_n * (0.11 * scale_h)
                z = -0.012 + neck_r_z * math.cos(theta)
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
    head_part = MeshPart(
        name="HeadAndNeck",
        material_key="skin",
        positions=pos,
        normals=compute_smooth_normals(pos, idx),
        uvs=np.array(uvs, dtype=np.float32),
        joints=np.array(joints, dtype=np.uint8),
        weights=np.array(weights, dtype=np.float32),
        indices=idx,
    )

    # Sculpted 3D Ears on left/right sides of head
    ear_parts = []
    for side in (-1.0, 1.0):
        ep, euv, ej, ew, ei = make_uv_sphere(
            (side * 0.090, cy - 0.005 * scale_h, -0.006),
            (0.012, 0.025 * scale_h, 0.016),
            bone_idx=4,
            n_lon=12,
            n_lat=10,
        )
        ear_parts.append(
            MeshPart(
                name="LeftEar" if side > 0 else "RightEar",
                material_key="skin",
                positions=ep,
                normals=compute_smooth_normals(ep, ei),
                uvs=euv,
                joints=ej,
                weights=ew,
                indices=ei,
            )
        )

    # Recessed 3D Eyeballs inside eye sockets
    eye_parts = []
    for side in (-1.0, 1.0):
        ey_p, ey_uv, ey_j, ey_w, ey_i = make_uv_sphere(
            (side * 0.032, cy + 0.016 * scale_h, 0.073),
            (0.0135, 0.0135, 0.0135),
            bone_idx=4,
            n_lon=16,
            n_lat=12,
            face_forward_z=True,
        )
        eye_parts.append(
            MeshPart(
                name="LeftEye" if side > 0 else "RightEye",
                material_key="eye",
                positions=ey_p,
                normals=compute_smooth_normals(ey_p, ey_i),
                uvs=ey_uv,
                joints=ey_j,
                weights=ey_w,
                indices=ey_i,
            )
        )

    return [head_part, *ear_parts, *eye_parts]


def _oval_ring(cx: float, cy: float, cz: float, rx: float, rz: float, n_seg: int = 22) -> np.ndarray:
    pts = []
    for s in range(n_seg):
        a = 2.0 * math.pi * s / n_seg
        pts.append([cx + rx * math.cos(a), cy, cz + rz * math.sin(a)])
    return np.array(pts, dtype=np.float32)


def build_anatomical_body(
    scale_h: float = 1.0,
    build_width: float = 1.0,
) -> list[MeshPart]:
    """
    Build anatomically proportioned 3D torso, arms, articulated 5-finger hands,
    legs, and feet/shoes grounded cleanly at y = 0.0.
    """
    parts: list[MeshPart] = []
    bw = build_width

    # 1. Sculpted Torso (Pelvis -> Waist -> Ribcage -> Pectorals -> Deltoid Shoulders)
    torso_specs = [
        (0.88, 0.145 * bw, 0.095 * bw, (0, 1, 0.0)),
        (0.95, 0.150 * bw, 0.100 * bw, (0, 1, 0.25)),
        (1.06, 0.138 * bw, 0.094 * bw, (1, 2, 0.15)),
        (1.16, 0.148 * bw, 0.102 * bw, (1, 2, 0.55)),
        (1.28, 0.168 * bw, 0.114 * bw, (2, 1, 0.15)),
        (1.38, 0.184 * bw, 0.116 * bw, (2, 3, 0.05)),
        (1.45, 0.162 * bw, 0.098 * bw, (2, 3, 0.25)),
        (1.48, 0.072 * bw, 0.066 * bw, (3, 2, 0.35)),
    ]
    t_rings = [_oval_ring(0.0, y * scale_h, 0.0, rx, rz, 24) for y, rx, rz, _ in torso_specs]
    t_bones = [b for _, _, _, b in torso_specs]
    tp, tuv, tj, tw, ti = make_loft_tube(t_rings, t_bones, closed_caps=True)
    parts.append(MeshPart("Torso", "garment_primary", tp, compute_smooth_normals(tp, ti), tuv, tj, tw, ti))

    # 2. Arms + Hands + 5 Articulated Fingers per Hand
    for is_left in (True, False):
        sign = 1.0 if is_left else -1.0
        b_sh = 5 if is_left else 9
        b_ua = 6 if is_left else 10
        b_fa = 7 if is_left else 11
        b_ha = 8 if is_left else 12
        b_fn = 20 if is_left else 21

        sx = sign * 0.195 * bw
        arm_specs = [
            (sx * 0.84, 1.43, 0.052 * bw, 0.050 * bw, (b_sh, b_ua, 0.65)),
            (sx * 0.99, 1.38, 0.054 * bw, 0.052 * bw, (b_ua, b_sh, 0.15)),
            (sx * 1.04, 1.26, 0.048 * bw, 0.047 * bw, (b_ua, b_fa, 0.10)),
            (sx * 1.08, 1.15, 0.040 * bw, 0.039 * bw, (b_ua, b_fa, 0.55)),
            (sx * 1.11, 1.02, 0.042 * bw, 0.040 * bw, (b_fa, b_ua, 0.10)),
            (sx * 1.13, 0.90, 0.029 * bw, 0.026 * bw, (b_fa, b_ha, 0.50)),
        ]
        a_rings = [_oval_ring(x, y * scale_h, 0.0, rx, rz, 16) for x, y, rx, rz, _ in arm_specs]
        a_bones = [b for _, _, _, _, b in arm_specs]
        # Upper sleeve vs forearm skin split via 2 sub-meshes or unified material
        ap, auv, aj, aw, ai = make_loft_tube(a_rings[:4], a_bones[:4], closed_caps=True)
        parts.append(
            MeshPart(
                "LeftUpperArm" if is_left else "RightUpperArm",
                "garment_primary",
                ap,
                compute_smooth_normals(ap, ai),
                auv,
                aj,
                aw,
                ai,
            )
        )
        fp, fuv, fj, fw, fi = make_loft_tube(a_rings[3:], a_bones[3:], closed_caps=True)
        parts.append(
            MeshPart(
                "LeftForearm" if is_left else "RightForearm",
                "skin",
                fp,
                compute_smooth_normals(fp, fi),
                fuv,
                fj,
                fw,
                fi,
            )
        )

        # Sculpted Palm
        palm_x = sx * 1.14
        palm_rings = [
            _oval_ring(palm_x, 0.90 * scale_h, 0.004, 0.026, 0.028, 14),
            _oval_ring(palm_x, 0.855 * scale_h, 0.010, 0.020, 0.038, 14),
            _oval_ring(palm_x, 0.822 * scale_h, 0.012, 0.018, 0.036, 14),
        ]
        pp, puv, pj, pw, pi = make_loft_tube(
            palm_rings, [(b_ha, b_fa, 0.15), (b_ha, b_fn, 0.1), (b_ha, b_fn, 0.35)], closed_caps=True
        )
        parts.append(MeshPart("LeftPalm" if is_left else "RightPalm", "skin", pp, compute_smooth_normals(pp, pi), puv, pj, pw, pi))

        # 5 Modeled Articulated Fingers per Hand (Thumb + Index, Middle, Ring, Pinky)
        finger_offsets = [
            ("Thumb", -sign * 0.012, 0.865, 0.036, 0.034, 0.010),
            ("Index", 0.0, 0.820, 0.034, 0.044, 0.0085),
            ("Middle", 0.0, 0.818, 0.012, 0.048, 0.0085),
            ("Ring", 0.0, 0.819, -0.010, 0.044, 0.0080),
            ("Pinky", 0.0, 0.822, -0.030, 0.036, 0.0072),
        ]
        for fname, dx_f, y_base, dz_f, flen, frad in finger_offsets:
            fx = palm_x + dx_f
            f_rings = [
                _oval_ring(fx, y_base * scale_h, dz_f, frad, frad, 10),
                _oval_ring(fx - sign * 0.008, (y_base - flen * 0.55) * scale_h, dz_f + 0.006, frad * 0.9, frad * 0.9, 10),
                _oval_ring(fx - sign * 0.020, (y_base - flen * 0.95) * scale_h, dz_f + 0.010, frad * 0.72, frad * 0.72, 10),
            ]
            fgp, fguv, fgj, fgw, fgi = make_loft_tube(
                f_rings, [(b_ha, b_fn, 0.3), (b_fn, b_ha, 0.2), (b_fn, b_ha, 0.05)], closed_caps=True
            )
            parts.append(
                MeshPart(
                    f"{'Left' if is_left else 'Right'}{fname}",
                    "skin",
                    fgp,
                    compute_smooth_normals(fgp, fgi),
                    fguv,
                    fgj,
                    fgw,
                    fgi,
                )
            )

    # 3. Muscular Legs & Grounded Footwear (y = 0.0)
    for is_left in (True, False):
        sign = 1.0 if is_left else -1.0
        b_th = 13 if is_left else 16
        b_sh = 14 if is_left else 17
        b_ft = 15 if is_left else 18
        lx = sign * 0.102 * bw

        leg_specs = [
            (0.92, 0.084 * bw, 0.088 * bw, (b_th, 0, 0.35)),
            (0.72, 0.075 * bw, 0.078 * bw, (b_th, b_sh, 0.05)),
            (0.51, 0.056 * bw, 0.058 * bw, (b_th, b_sh, 0.50)),
            (0.32, 0.060 * bw, 0.064 * bw, (b_sh, b_th, 0.10)),
            (0.11, 0.042 * bw, 0.044 * bw, (b_sh, b_ft, 0.45)),
        ]
        l_rings = [_oval_ring(lx, y * scale_h, 0.0, rx, rz, 18) for y, rx, rz, _ in leg_specs]
        l_bones = [b for _, _, _, b in leg_specs]
        lp, luv, lj, lw, li = make_loft_tube(l_rings, l_bones, closed_caps=True)
        parts.append(
            MeshPart(
                "LeftLeg" if is_left else "RightLeg",
                "garment_secondary",
                lp,
                compute_smooth_normals(lp, li),
                luv,
                lj,
                lw,
                li,
            )
        )

        # Grounded Sculpted 3D Shoe / Mojari (soles flush at y = 0.0!)
        shoe_rings = [
            _oval_ring(lx, 0.000, 0.048, 0.052, 0.118, 16),
            _oval_ring(lx, 0.028 * scale_h, 0.052, 0.050, 0.114, 16),
            _oval_ring(lx, 0.068 * scale_h, 0.032, 0.044, 0.086, 16),
            _oval_ring(lx, 0.108 * scale_h, 0.004, 0.042, 0.046, 16),
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

    return parts
