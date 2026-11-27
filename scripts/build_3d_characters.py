import json
import os
import struct
import numpy as np

from scripts.modeling.pbr_textures import (
    generate_eye_texture,
    generate_fabric_texture,
    generate_hair_texture,
    generate_skin_texture,
)
from scripts.modeling.human_mesh import MeshPart, build_anatomical_body, build_sculpted_head_and_neck
from scripts.modeling.character_outfits import build_clothing_and_accessories, build_hair_geometry
from scripts.modeling.rig_and_anim import (
    BONE_NAMES,
    BONE_PARENTS,
    build_all_animations,
    build_bone_positions,
    compute_inverse_bind_matrices,
    compute_local_translations,
)

CHARACTER_SPECS = {
    "vikas_guru": {
        "skin": "#d9a278", "primary": "#f97316", "secondary": "#fef3c7", "accent": "#facc15",
        "hair": "#f1f5f9", "footwear": "#5c3317", "headgear": "beard_glasses", "prop": "mic",
        "scale_h": 1.00, "build_width": 1.06, "jaw_width": 1.10, "cheek": 1.12, "nose": 1.10,
        "brow": 1.15, "stubble": False, "tilak": False, "pattern": "kurta", "iris": "#2c190d",
    },
    "yuva_prince": {
        "skin": "#e3b68c", "primary": "#f8fafc", "secondary": "#1d4ed8", "accent": "#eab308",
        "hair": "#1e293b", "footwear": "#1e293b", "headgear": "youth_hair", "prop": "gold_bar",
        "scale_h": 1.02, "build_width": 0.98, "jaw_width": 0.98, "cheek": 0.96, "nose": 1.04,
        "brow": 1.02, "stubble": True, "tilak": False, "pattern": "kurta", "iris": "#3b2314",
    },
    "muffler_man": {
        "skin": "#d7a982", "primary": "#0284c7", "secondary": "#334155", "accent": "#dc2626",
        "hair": "#334155", "footwear": "#1f2937", "headgear": "gandhi_cap_muffler", "prop": "broom",
        "scale_h": 0.97, "build_width": 0.93, "jaw_width": 0.94, "cheek": 0.95, "nose": 1.08,
        "brow": 1.00, "stubble": False, "tilak": False, "pattern": "muffler", "iris": "#2c190d",
    },
    "didi_storm": {
        "skin": "#dca882", "primary": "#f1f5f9", "secondary": "#0284c7", "accent": "#10b981",
        "hair": "#1f2937", "footwear": "#334155", "headgear": "saree_bun", "prop": "chappal",
        "scale_h": 0.95, "build_width": 0.88, "jaw_width": 0.86, "cheek": 0.98, "nose": 0.95,
        "brow": 1.10, "stubble": False, "tilak": False, "pattern": "saree", "iris": "#24160d",
    },
    "thalaivaa_boss": {
        "skin": "#b87d56", "primary": "#1e293b", "secondary": "#f8fafc", "accent": "#fbbf24",
        "hair": "#1e293b", "footwear": "#111827", "headgear": "cinema_shades", "prop": "shades",
        "scale_h": 1.01, "build_width": 1.00, "jaw_width": 1.04, "cheek": 1.00, "nose": 1.02,
        "brow": 1.15, "stubble": False, "tilak": False, "pattern": "kurta", "iris": "#1f140d",
    },
    "bulldozer_baba": {
        "skin": "#d8a076", "primary": "#ea580c", "secondary": "#9a3412", "accent": "#fde047",
        "hair": "#ea580c", "footwear": "#3f220f", "headgear": "saffron_bald", "prop": "bulldozer",
        "scale_h": 1.03, "build_width": 1.14, "jaw_width": 1.12, "cheek": 1.08, "nose": 1.06,
        "brow": 1.22, "stubble": False, "tilak": True, "pattern": "armor", "iris": "#2c190d",
    },
    "chara_king": {
        "skin": "#c5895b", "primary": "#16a34a", "secondary": "#f8fafc", "accent": "#f59e0b",
        "hair": "#e2e8f0", "footwear": "#451a03", "headgear": "rustic_hair", "prop": "lantern",
        "scale_h": 0.98, "build_width": 1.08, "jaw_width": 1.06, "cheek": 1.22, "nose": 1.12,
        "brow": 1.00, "stubble": False, "tilak": False, "pattern": "kurta", "iris": "#2c190d",
    },
    "chanakya_x": {
        "skin": "#dba982", "primary": "#4f46e5", "secondary": "#1e1b4b", "accent": "#c084fc",
        "hair": "#94a3b8", "footwear": "#0f172a", "headgear": "tactical_beard", "prop": "chess",
        "scale_h": 0.99, "build_width": 1.04, "jaw_width": 1.08, "cheek": 1.06, "nose": 1.05,
        "brow": 1.20, "stubble": True, "tilak": False, "pattern": "kurta", "iris": "#1e293b",
    },
    "hakla": {
        "skin": "#d7a07d", "primary": "#f8fafc", "secondary": "#1e293b", "accent": "#ec4899",
        "hair": "#111827", "footwear": "#db2777", "headgear": "hakla_photo", "prop": "megaphone",
        "scale_h": 1.00, "build_width": 0.97, "jaw_width": 0.98, "cheek": 1.08, "nose": 1.12,
        "brow": 1.08, "stubble": True, "tilak": False, "pattern": "kurta", "iris": "#2c190d",
    },
    "samrat_ordinance": {
        "skin": "#d19868", "primary": "#7e22ce", "secondary": "#991b1b", "accent": "#fbbf24",
        "hair": "#e2e8f0", "footwear": "#78350f", "headgear": "golden_crown", "prop": "scepter",
        "scale_h": 1.10, "build_width": 1.16, "jaw_width": 1.14, "cheek": 1.08, "nose": 1.10,
        "brow": 1.28, "stubble": True, "tilak": False, "pattern": "armor", "iris": "#dc2626",
    },
}


class GlbBuilder:
    def __init__(self) -> None:
        self.bin_data = bytearray()
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.images: list[dict] = []
        self.textures: list[dict] = []
        self.materials: list[dict] = []

    def add_bytes(self, raw: bytes, target: int | None = None) -> int:
        while len(self.bin_data) % 4 != 0:
            self.bin_data.append(0)
        offset = len(self.bin_data)
        self.bin_data.extend(raw)
        bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw)}
        if target is not None:
            bv["target"] = target
        idx = len(self.buffer_views)
        self.buffer_views.append(bv)
        return idx

    def add_accessor(
        self,
        arr: np.ndarray,
        acc_type: str,
        comp_type: int,
        target: int | None = None,
        with_minmax: bool = False,
    ) -> int:
        bv_idx = self.add_bytes(arr.tobytes(), target)
        acc: dict = {
            "bufferView": bv_idx,
            "componentType": comp_type,
            "count": int(arr.shape[0]),
            "type": acc_type,
        }
        if with_minmax:
            if arr.ndim == 1:
                acc["min"] = [float(arr.min())]
                acc["max"] = [float(arr.max())]
            else:
                acc["min"] = [float(x) for x in arr.min(axis=0)]
                acc["max"] = [float(x) for x in arr.max(axis=0)]
        idx = len(self.accessors)
        self.accessors.append(acc)
        return idx

    def add_png_texture(self, png_bytes: bytes) -> int:
        bv_idx = self.add_bytes(png_bytes)
        img_idx = len(self.images)
        self.images.append({"bufferView": bv_idx, "mimeType": "image/png"})
        tex_idx = len(self.textures)
        self.textures.append({"sampler": 0, "source": img_idx})
        return tex_idx

    def add_material(
        self,
        name: str,
        tex_idx: int | None = None,
        base_color: list[float] | None = None,
        metallic: float = 0.0,
        roughness: float = 0.7,
        double_sided: bool = False,
    ) -> int:
        pbr: dict = {"metallicFactor": metallic, "roughnessFactor": roughness}
        if tex_idx is not None:
            pbr["baseColorTexture"] = {"index": tex_idx}
        if base_color is not None:
            pbr["baseColorFactor"] = base_color
        mat: dict = {"name": name, "pbrMetallicRoughness": pbr}
        if double_sided:
            mat["doubleSided"] = True
        idx = len(self.materials)
        self.materials.append(mat)
        return idx


def export_character_glb(char_id: str, out_path: str) -> dict:
    spec = CHARACTER_SPECS[char_id]
    sh = spec["scale_h"]
    bw = spec["build_width"]

    parts: list[MeshPart] = []
    parts.extend(
        build_sculpted_head_and_neck(
            head_center_y=1.62,
            jaw_width=spec["jaw_width"],
            cheek_fullness=spec["cheek"],
            nose_scale=spec["nose"],
            brow_intensity=spec["brow"],
            scale_h=sh,
        )
    )
    parts.extend(build_anatomical_body(scale_h=sh, build_width=bw))
    parts.extend(build_hair_geometry(spec["headgear"], scale_h=sh))
    parts.extend(build_clothing_and_accessories(char_id, spec["headgear"], spec["prop"], scale_h=sh, build_width=bw))

    builder = GlbBuilder()

    # Textures & Materials
    skin_tex = builder.add_png_texture(
        generate_skin_texture(spec["skin"], stubble=spec["stubble"], tilak=spec["tilak"])
    )
    eye_tex = builder.add_png_texture(generate_eye_texture(spec["iris"]))
    hair_tex = builder.add_png_texture(generate_hair_texture(spec["hair"]))
    pri_tex = builder.add_png_texture(
        generate_fabric_texture(spec["primary"], spec["secondary"], spec["accent"], pattern=spec["pattern"])
    )
    sec_tex = builder.add_png_texture(
        generate_fabric_texture(spec["secondary"], spec["accent"], spec["primary"], pattern=spec["pattern"], seed=23)
    )
    muf_tex = builder.add_png_texture(
        generate_fabric_texture(spec["accent"], spec["primary"], spec["secondary"], pattern="muffler", seed=37)
    )

    mat_map = {
        "skin": builder.add_material("skin", tex_idx=skin_tex, roughness=0.58),
        "eye": builder.add_material("eye", tex_idx=eye_tex, roughness=0.14),
        "hair": builder.add_material("hair", tex_idx=hair_tex, roughness=0.72),
        "garment_primary": builder.add_material("garment_primary", tex_idx=pri_tex, roughness=0.78, double_sided=True),
        "garment_secondary": builder.add_material("garment_secondary", tex_idx=sec_tex, roughness=0.76, double_sided=True),
        "accent_cloth": builder.add_material("accent_cloth", base_color=[0.96, 0.97, 0.99, 1.0], roughness=0.75, double_sided=True),
        "muffler": builder.add_material("muffler", tex_idx=muf_tex, roughness=0.88, double_sided=True),
        "footwear": builder.add_material("footwear", tex_idx=builder.add_png_texture(generate_hair_texture(spec["footwear"], seed=41)), roughness=0.45),
        "metal": builder.add_material("metal", base_color=[0.96, 0.78, 0.24, 1.0], metallic=0.88, roughness=0.24),
        "dark_glass": builder.add_material("dark_glass", base_color=[0.04, 0.05, 0.08, 1.0], metallic=0.35, roughness=0.08),
    }

    # Build Mesh Primitives grouped by material_key for browser efficiency (<= 10 draw calls!)
    grouped: dict[str, list[MeshPart]] = {}
    total_verts = 0
    total_tris = 0
    for part in parts:
        grouped.setdefault(part.material_key, []).append(part)
        total_verts += len(part.positions)
        total_tris += len(part.indices) // 3

    primitives = []
    for mat_key, plist in grouped.items():
        pos_list, norm_list, uv_list, j_list, w_list, idx_list = [], [], [], [], [], []
        v_offset = 0
        for p in plist:
            pos_list.append(p.positions)
            norm_list.append(p.normals)
            uv_list.append(p.uvs)
            j_list.append(p.joints)
            w_list.append(p.weights)
            idx_list.append(p.indices + v_offset)
            v_offset += len(p.positions)

        pos = np.vstack(pos_list).astype(np.float32)
        norm = np.vstack(norm_list).astype(np.float32)
        uv = np.vstack(uv_list).astype(np.float32)
        jnt = np.vstack(j_list).astype(np.uint8)
        wgt = np.vstack(w_list).astype(np.float32)
        # Ensure bone weights strictly normalize to 1.0
        w_sum = np.sum(wgt, axis=1, keepdims=True)
        wgt = np.where(w_sum > 1e-6, wgt / w_sum, np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32))
        ind = np.concatenate(idx_list).astype(np.uint32)

        primitives.append(
            {
                "attributes": {
                    "POSITION": builder.add_accessor(pos, "VEC3", 5126, target=34962, with_minmax=True),
                    "NORMAL": builder.add_accessor(norm, "VEC3", 5126, target=34962),
                    "TEXCOORD_0": builder.add_accessor(uv, "VEC2", 5126, target=34962),
                    "JOINTS_0": builder.add_accessor(jnt, "VEC4", 5121, target=34962),
                    "WEIGHTS_0": builder.add_accessor(wgt, "VEC4", 5126, target=34962),
                },
                "indices": builder.add_accessor(ind, "SCALAR", 5125, target=34963),
                "material": mat_map[mat_key],
            }
        )

    # Skeleton Nodes (0..21) + Skinned Mesh Node (22) + Scene Root Node (23)
    world_bones = build_bone_positions(scale_h=sh, build_width=bw)
    local_trans = compute_local_translations(world_bones)
    ibms = compute_inverse_bind_matrices(world_bones)
    ibm_acc = builder.add_accessor(ibms.reshape(len(BONE_NAMES), 16), "MAT4", 5126)

    nodes = []
    children_map: dict[int, list[int]] = {i: [] for i in range(len(BONE_NAMES))}
    for b_idx, p_idx in enumerate(BONE_PARENTS):
        if p_idx != -1:
            children_map[p_idx].append(b_idx)

    for b_idx, name in enumerate(BONE_NAMES):
        node: dict = {"name": name, "translation": [float(v) for v in local_trans[b_idx]]}
        if children_map[b_idx]:
            node["children"] = children_map[b_idx]
        nodes.append(node)

    mesh_node_idx = len(nodes)
    nodes.append({"name": f"{char_id}_Mesh", "mesh": 0, "skin": 0})
    root_node_idx = len(nodes)
    nodes.append({"name": f"{char_id}_Root", "children": [0, mesh_node_idx]})

    # Animations
    clips = build_all_animations(world_bones[0][1])
    gltf_anims = []
    for clip_name, clip in clips.items():
        times_arr = np.array(clip["times"], dtype=np.float32)
        t_acc = builder.add_accessor(times_arr, "SCALAR", 5126, with_minmax=True)
        samplers = []
        channels = []

        # Hips translation track
        hp_arr = np.array(clip["hips_pos"], dtype=np.float32)
        hp_acc = builder.add_accessor(hp_arr, "VEC3", 5126)
        samplers.append({"input": t_acc, "interpolation": "LINEAR", "output": hp_acc})
        channels.append({"sampler": 0, "target": {"node": 0, "path": "translation"}})

        for b_idx in range(len(BONE_NAMES)):
            rot_arr = np.array(clip["tracks"][b_idx], dtype=np.float32)
            r_acc = builder.add_accessor(rot_arr, "VEC4", 5126)
            s_idx = len(samplers)
            samplers.append({"input": t_acc, "interpolation": "LINEAR", "output": r_acc})
            channels.append({"sampler": s_idx, "target": {"node": b_idx, "path": "rotation"}})

        gltf_anims.append({"name": clip_name, "samplers": samplers, "channels": channels})

    while len(builder.bin_data) % 4 != 0:
        builder.bin_data.append(0)

    gltf_json = {
        "asset": {"version": "2.0", "generator": "NetaKombat-3DBuilder"},
        "scene": 0,
        "scenes": [{"nodes": [root_node_idx]}],
        "nodes": nodes,
        "meshes": [{"name": f"{char_id}_Body", "primitives": primitives}],
        "skins": [
            {
                "name": f"{char_id}_Rig",
                "inverseBindMatrices": ibm_acc,
                "skeleton": 0,
                "joints": list(range(len(BONE_NAMES))),
            }
        ],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        "images": builder.images,
        "textures": builder.textures,
        "materials": builder.materials,
        "animations": gltf_anims,
        "bufferViews": builder.buffer_views,
        "accessors": builder.accessors,
        "buffers": [{"byteLength": len(builder.bin_data)}],
    }

    json_bytes = json.dumps(gltf_json, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(builder.bin_data)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total_len))
        f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        f.write(json_bytes)
        f.write(struct.pack("<II", len(builder.bin_data), 0x004E4942))
        f.write(builder.bin_data)

    return {
        "char_id": char_id,
        "verts": total_verts,
        "tris": total_tris,
        "bones": len(BONE_NAMES),
        "anims": len(gltf_anims),
        "bytes": total_len,
    }


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "models")
    for char_id in CHARACTER_SPECS:
        info = export_character_glb(char_id, os.path.join(out_dir, f"{char_id}.glb"))
        print(
            f"Built {info['char_id']}.glb -> {info['verts']} verts, {info['tris']} tris, "
            f"{info['bones']} bones, {info['anims']} anims, {info['bytes']//1024} KB"
        )


if __name__ == "__main__":
    main()
