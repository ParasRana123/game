import math
import numpy as np

BONE_NAMES = [
    "Hips",           # 0
    "Spine",          # 1
    "Chest",          # 2
    "Neck",           # 3
    "Head",           # 4
    "LeftShoulder",   # 5
    "LeftUpperArm",   # 6
    "LeftForearm",    # 7
    "LeftHand",       # 8
    "RightShoulder",  # 9
    "RightUpperArm",  # 10
    "RightForearm",   # 11
    "RightHand",      # 12
    "LeftThigh",      # 13
    "LeftShin",       # 14
    "LeftFoot",       # 15
    "RightThigh",     # 16
    "RightShin",      # 17
    "RightFoot",      # 18
    "CapeOrScarf",    # 19
    "LeftFingers",    # 20
    "RightFingers",   # 21
]

BONE_PARENTS = [
    -1,  # 0 Hips
    0,   # 1 Spine
    1,   # 2 Chest
    2,   # 3 Neck
    3,   # 4 Head
    2,   # 5 LeftShoulder
    5,   # 6 LeftUpperArm
    6,   # 7 LeftForearm
    7,   # 8 LeftHand
    2,   # 9 RightShoulder
    9,   # 10 RightUpperArm
    10,  # 11 RightForearm
    11,  # 12 RightHand
    0,   # 13 LeftThigh
    13,  # 14 LeftShin
    14,  # 15 LeftFoot
    0,   # 16 RightThigh
    16,  # 17 RightShin
    17,  # 18 RightFoot
    2,   # 19 CapeOrScarf
    8,   # 20 LeftFingers
    12,  # 21 RightFingers
]


def build_bone_positions(scale_h: float = 1.0, build_width: float = 1.0) -> list[list[float]]:
    bw = build_width
    return [
        [0.0, 0.94 * scale_h, 0.0],              # 0 Hips
        [0.0, 1.09 * scale_h, 0.0],              # 1 Spine
        [0.0, 1.29 * scale_h, 0.0],              # 2 Chest
        [0.0, 1.48 * scale_h, 0.0],              # 3 Neck
        [0.0, 1.60 * scale_h, 0.0],              # 4 Head
        [0.08 * bw, 1.43 * scale_h, 0.0],        # 5 LeftShoulder
        [0.195 * bw, 1.42 * scale_h, 0.0],       # 6 LeftUpperArm
        [0.215 * bw, 1.15 * scale_h, 0.0],       # 7 LeftForearm
        [0.222 * bw, 0.90 * scale_h, 0.0],       # 8 LeftHand
        [-0.08 * bw, 1.43 * scale_h, 0.0],       # 9 RightShoulder
        [-0.195 * bw, 1.42 * scale_h, 0.0],      # 10 RightUpperArm
        [-0.215 * bw, 1.15 * scale_h, 0.0],      # 11 RightForearm
        [-0.222 * bw, 0.90 * scale_h, 0.0],      # 12 RightHand
        [0.102 * bw, 0.92 * scale_h, 0.0],       # 13 LeftThigh
        [0.102 * bw, 0.51 * scale_h, 0.0],       # 14 LeftShin
        [0.102 * bw, 0.09 * scale_h, 0.0],       # 15 LeftFoot
        [-0.102 * bw, 0.92 * scale_h, 0.0],      # 16 RightThigh
        [-0.102 * bw, 0.51 * scale_h, 0.0],      # 17 RightShin
        [-0.102 * bw, 0.09 * scale_h, 0.0],      # 18 RightFoot
        [0.0, 1.42 * scale_h, -0.09],            # 19 CapeOrScarf
        [0.225 * bw, 0.82 * scale_h, 0.01],      # 20 LeftFingers
        [-0.225 * bw, 0.82 * scale_h, 0.01],     # 21 RightFingers
    ]


def compute_local_translations(world_pos: list[list[float]]) -> list[list[float]]:
    locals_out = []
    for idx, pos in enumerate(world_pos):
        p_idx = BONE_PARENTS[idx]
        if p_idx == -1:
            locals_out.append(list(pos))
        else:
            parent = world_pos[p_idx]
            locals_out.append([pos[0] - parent[0], pos[1] - parent[1], pos[2] - parent[2]])
    return locals_out


def compute_inverse_bind_matrices(world_pos: list[list[float]]) -> np.ndarray:
    """Return (22, 4, 4) column-major inverse bind matrices for glTF Skin."""
    ibms = np.zeros((len(world_pos), 4, 4), dtype=np.float32)
    for i, (wx, wy, wz) in enumerate(world_pos):
        m = np.eye(4, dtype=np.float32)
        m[3, 0] = -wx
        m[3, 1] = -wy
        m[3, 2] = -wz
        ibms[i] = m
    return ibms


def euler_xyz_to_quat(rx: float, ry: float, rz: float) -> list[float]:
    cx, sx = math.cos(rx * 0.5), math.sin(rx * 0.5)
    cy, sy = math.cos(ry * 0.5), math.sin(ry * 0.5)
    cz, sz = math.cos(rz * 0.5), math.sin(rz * 0.5)
    qx = sx * cy * cz + cx * sy * sz
    qy = cx * sy * cz - sx * cy * sz
    qz = cx * cy * sz + sx * sy * cz
    qw = cx * cy * cz - sx * sy * sz
    n = math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw) or 1.0
    return [qx / n, qy / n, qz / n, qw / n]


def _fighting_guard_pose() -> dict[int, tuple[float, float, float]]:
    """Base natural arcade fighting guard stance (facing +Z, slight 3/4 twist)."""
    return {
        0: (0.0, 0.22, 0.0),         # Hips angled slightly
        1: (0.05, -0.06, 0.0),       # Spine
        2: (0.06, -0.10, 0.0),       # Chest
        3: (-0.04, -0.06, 0.0),      # Neck
        4: (-0.04, -0.04, 0.0),      # Head looking straight at opponent
        6: (-0.55, 0.12, 0.18),      # LeftUpperArm forward guard
        7: (-1.35, 0.0, -0.15),      # LeftForearm raised fist
        10: (-0.78, -0.15, -0.22),   # RightUpperArm lead guard
        11: (-1.45, 0.0, 0.18),      # RightForearm lead fist
        13: (-0.28, 0.0, 0.08),      # LeftThigh step back
        14: (0.36, 0.0, 0.0),        # LeftShin bend
        16: (0.22, 0.0, -0.08),      # RightThigh lead leg
        17: (0.20, 0.0, 0.0),        # RightShin
        20: (-0.85, 0.0, 0.0),       # LeftFingers curled fist
        21: (-0.85, 0.0, 0.0),       # RightFingers curled fist
    }


def _merge_pose(base: dict[int, tuple[float, float, float]], over: dict[int, tuple[float, float, float]]) -> dict[int, tuple[float, float, float]]:
    out = dict(base)
    out.update(over)
    return out


def build_all_animations(hips_rest_y: float) -> dict[str, dict]:
    """
    Build 16 smooth skeletal AnimationClips for all combat actions.
    Each clip maps bone_idx -> {'times': [...], 'rotations': [...], optional 'hips_pos': [...]}.
    """
    guard = _fighting_guard_pose()
    clips: dict[str, dict] = {}

    def make_loop_clip(duration: float, fn):
        times = [0.0, duration * 0.25, duration * 0.5, duration * 0.75, duration]
        tracks: dict[int, list[list[float]]] = {b: [] for b in range(len(BONE_NAMES))}
        hips_pos = []
        for idx, t in enumerate(times):
            phase = (idx % 4) / 4.0 * 2.0 * math.pi
            pose, dy = fn(phase)
            hips_pos.append([0.0, hips_rest_y + dy, 0.0])
            for b in range(len(BONE_NAMES)):
                rx, ry, rz = pose.get(b, (0.0, 0.0, 0.0))
                tracks[b].append(euler_xyz_to_quat(rx, ry, rz))
        return {"duration": duration, "times": times, "tracks": tracks, "hips_pos": hips_pos}

    def make_pose_clip(duration: float, keyframes: list[tuple[float, dict[int, tuple[float, float, float]], float]]):
        times = [kf[0] * duration for kf in keyframes]
        tracks: dict[int, list[list[float]]] = {b: [] for b in range(len(BONE_NAMES))}
        hips_pos = []
        for _, pose, dy in keyframes:
            hips_pos.append([0.0, hips_rest_y + dy, 0.0])
            for b in range(len(BONE_NAMES)):
                rx, ry, rz = pose.get(b, (0.0, 0.0, 0.0))
                tracks[b].append(euler_xyz_to_quat(rx, ry, rz))
        return {"duration": duration, "times": times, "tracks": tracks, "hips_pos": hips_pos}

    # 1. Idle Fighting Stance (breathing & guard sway)
    clips["idle"] = make_loop_clip(
        1.2,
        lambda ph: (
            _merge_pose(
                guard,
                {
                    2: (0.06 + math.sin(ph) * 0.04, -0.10, 0.0),
                    6: (-0.55 + math.sin(ph) * 0.08, 0.12, 0.18),
                    10: (-0.78 - math.sin(ph) * 0.08, -0.15, -0.22),
                    19: (0.08 + math.sin(ph) * 0.06, 0.0, 0.0),
                },
            ),
            math.sin(ph) * 0.015,
        ),
    )

    # 2. Walk
    clips["walk"] = make_loop_clip(
        0.75,
        lambda ph: (
            _merge_pose(
                guard,
                {
                    0: (0.04, 0.06, 0.0),
                    13: (math.sin(ph) * 0.48 - 0.06, 0.0, 0.04),
                    14: (max(0.05, -math.sin(ph) * 0.55 + 0.22), 0.0, 0.0),
                    16: (-math.sin(ph) * 0.48 - 0.06, 0.0, -0.04),
                    17: (max(0.05, math.sin(ph) * 0.55 + 0.22), 0.0, 0.0),
                    6: (-0.45 - math.sin(ph) * 0.30, 0.1, 0.14),
                    10: (-0.45 + math.sin(ph) * 0.30, -0.1, -0.14),
                    19: (0.14 + math.sin(ph * 2) * 0.06, 0.0, 0.0),
                },
            ),
            abs(math.cos(ph)) * 0.025,
        ),
    )

    # 3. Run
    clips["run"] = make_loop_clip(
        0.52,
        lambda ph: (
            _merge_pose(
                guard,
                {
                    0: (0.14, 0.0, 0.0),
                    2: (0.18, math.sin(ph) * 0.12, 0.0),
                    13: (math.sin(ph) * 0.78 - 0.12, 0.0, 0.04),
                    14: (max(0.10, -math.sin(ph) * 0.85 + 0.35), 0.0, 0.0),
                    16: (-math.sin(ph) * 0.78 - 0.12, 0.0, -0.04),
                    17: (max(0.10, math.sin(ph) * 0.85 + 0.35), 0.0, 0.0),
                    6: (-0.65 - math.sin(ph) * 0.55, 0.0, 0.15),
                    10: (-0.65 + math.sin(ph) * 0.55, 0.0, -0.15),
                    19: (0.34 + math.sin(ph * 2) * 0.10, 0.0, 0.0),
                },
            ),
            abs(math.cos(ph)) * 0.045 - 0.02,
        ),
    )

    # 4. Punch (Jab with shoulder rotation & extended forearm)
    punch_ext = _merge_pose(
        guard,
        {
            0: (0.04, -0.24, 0.0),
            2: (0.08, -0.34, 0.0),
            10: (-1.52, -0.18, -0.05),
            11: (-0.12, 0.0, 0.02),
            6: (-0.42, 0.25, 0.25),
        },
    )
    clips["punch"] = make_pose_clip(0.32, [(0.0, guard, 0.0), (0.32, punch_ext, -0.02), (0.62, punch_ext, -0.02), (1.0, guard, 0.0)])

    # 5. Kick (High roundhouse/front kick)
    kick_ext = _merge_pose(
        guard,
        {
            0: (-0.12, -0.32, -0.08),
            2: (-0.14, 0.18, 0.08),
            16: (-1.45, 0.0, -0.10),
            17: (0.06, 0.0, 0.0),
            13: (0.12, 0.0, 0.06),
            14: (0.18, 0.0, 0.0),
            6: (-0.30, 0.35, 0.45),
            10: (-0.40, -0.25, -0.45),
        },
    )
    clips["kick"] = make_pose_clip(0.44, [(0.0, guard, 0.0), (0.35, kick_ext, 0.04), (0.65, kick_ext, 0.04), (1.0, guard, 0.0)])

    # 6. Uppercut
    up_ext = _merge_pose(
        guard,
        {
            0: (-0.08, -0.35, 0.0),
            2: (-0.18, -0.28, 0.0),
            10: (-2.55, 0.0, -0.12),
            11: (-0.45, 0.0, 0.08),
            13: (-0.25, 0.0, 0.0),
            16: (0.35, 0.0, 0.0),
        },
    )
    clips["uppercut"] = make_pose_clip(0.56, [(0.0, guard, -0.06), (0.38, up_ext, 0.10), (0.68, up_ext, 0.08), (1.0, guard, 0.0)])

    # 7. Block
    blk = _merge_pose(
        guard,
        {
            2: (0.12, 0.0, 0.0),
            6: (-1.25, 0.45, -0.25),
            7: (-1.55, 0.0, -0.35),
            10: (-1.25, -0.45, 0.25),
            11: (-1.55, 0.0, 0.35),
        },
    )
    clips["block"] = make_pose_clip(0.4, [(0.0, blk, -0.04), (1.0, blk, -0.04)])

    # 8. Grab / Dodge
    grb = _merge_pose(
        guard,
        {
            2: (0.22, 0.0, 0.0),
            6: (-1.45, -0.12, 0.0),
            7: (-0.25, 0.0, 0.0),
            10: (-1.45, 0.12, 0.0),
            11: (-0.25, 0.0, 0.0),
        },
    )
    clips["grab"] = make_pose_clip(0.48, [(0.0, guard, 0.0), (0.35, grb, -0.02), (1.0, guard, 0.0)])

    # 9. Jump
    jmp = _merge_pose(
        guard,
        {
            13: (-0.65, 0.0, 0.10),
            14: (1.05, 0.0, 0.0),
            16: (-0.25, 0.0, -0.10),
            17: (0.75, 0.0, 0.0),
            6: (-1.10, 0.0, 0.35),
            10: (-1.10, 0.0, -0.35),
        },
    )
    clips["jump"] = make_pose_clip(0.6, [(0.0, jmp, 0.06), (0.5, jmp, 0.08), (1.0, jmp, 0.06)])

    # 10. Crouch
    crc = _merge_pose(
        guard,
        {
            2: (0.24, 0.0, 0.0),
            13: (-1.05, 0.0, 0.10),
            14: (1.55, 0.0, 0.0),
            16: (-0.85, 0.0, -0.10),
            17: (1.45, 0.0, 0.0),
        },
    )
    clips["crouch"] = make_pose_clip(0.4, [(0.0, crc, -0.26), (1.0, crc, -0.26)])

    # 11. Special Attack (Dramatic Orator / Sonic Power Stance)
    spc_charge = _merge_pose(
        guard,
        {
            2: (-0.18, 0.0, 0.0),
            4: (-0.15, 0.0, 0.0),
            6: (-2.45, 0.25, 0.38),
            7: (-0.30, 0.0, 0.0),
            10: (-2.45, -0.25, -0.38),
            11: (-0.30, 0.0, 0.0),
        },
    )
    spc_release = _merge_pose(
        guard,
        {
            2: (0.16, 0.0, 0.0),
            4: (-0.08, 0.0, 0.0),
            6: (-1.50, 0.15, 0.25),
            7: (-0.20, 0.0, 0.0),
            10: (-1.58, -0.15, -0.25),
            11: (-0.15, 0.0, 0.0),
            19: (0.45, 0.0, 0.0),
        },
    )
    clips["special"] = make_pose_clip(
        1.4,
        [
            (0.0, spc_charge, 0.06),
            (0.28, spc_release, 0.10),
            (0.65, spc_charge, 0.08),
            (1.0, spc_release, 0.10),
        ],
    )

    # 12. Hitstun
    hst = _merge_pose(
        guard,
        {
            1: (-0.22, 0.0, 0.0),
            2: (-0.28, 0.15, 0.0),
            4: (-0.30, -0.20, 0.0),
            6: (0.45, 0.0, 0.45),
            10: (0.45, 0.0, -0.45),
        },
    )
    clips["hitstun"] = make_pose_clip(0.35, [(0.0, hst, -0.02), (0.5, hst, -0.04), (1.0, guard, 0.0)])

    # 13. Knockdown / Defeat
    kd = _merge_pose(
        guard,
        {
            0: (-1.35, 0.0, 0.0),
            2: (-0.25, 0.0, 0.0),
            4: (-0.35, 0.20, 0.0),
            6: (0.30, 0.0, 0.65),
            10: (0.30, 0.0, -0.65),
            13: (0.15, 0.0, 0.20),
            16: (0.15, 0.0, -0.20),
        },
    )
    clips["knockdown"] = make_pose_clip(0.8, [(0.0, hst, 0.0), (0.45, kd, -0.68), (1.0, kd, -0.72)])
    clips["defeat"] = clips["knockdown"]

    # 14. Intro / Victory
    vic = _merge_pose(
        guard,
        {
            0: (0.0, 0.0, 0.0),
            2: (-0.08, 0.0, 0.0),
            6: (-2.55, 0.0, 0.32),
            7: (-0.30, 0.0, 0.0),
            10: (-0.55, 0.0, -0.25),
        },
    )
    clips["intro"] = make_pose_clip(1.0, [(0.0, vic, 0.0), (0.5, vic, 0.03), (1.0, guard, 0.0)])
    clips["victory"] = make_pose_clip(1.2, [(0.0, guard, 0.0), (0.35, vic, 0.04), (1.0, vic, 0.04)])

    return clips
