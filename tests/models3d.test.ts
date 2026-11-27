import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_CHARACTERS } from '../shared/characters.js';

interface GltfJson {
  asset: { version: string };
  meshes: Array<{ primitives: Array<{ attributes: Record<string, number>; indices: number; material: number }> }>;
  skins: Array<{ joints: number[]; skeleton: number }>;
  materials: Array<{ name: string }>;
  images: Array<{ mimeType: string }>;
  animations: Array<{ name: string; channels: unknown[] }>;
  accessors: Array<{ min?: number[]; max?: number[] }>;
}

function parseGlbJson(filePath: string): GltfJson {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.readUInt32LE(0), 0x46546c67, 'Invalid GLB magic header');
  assert.equal(buf.readUInt32LE(4), 2, 'Expected glTF version 2');
  const jsonLen = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(16), 0x4e4f534a, 'Expected JSON chunk');
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as GltfJson;
}

const REQUIRED_ANIMATIONS = [
  'idle',
  'walk',
  'run',
  'punch',
  'kick',
  'uppercut',
  'block',
  'grab',
  'jump',
  'crouch',
  'special',
  'hitstun',
  'knockdown',
  'intro',
  'victory',
  'defeat',
];

test('All 10 characters have valid rigged full-body 3D GLB models with PBR textures, 22 bones, 16 animations, and no pasted photos', () => {
  for (const c of ALL_CHARACTERS) {
    assert.equal(c.portraitImage, undefined, `${c.id} must not use a pasted portrait photograph`);
    const glbPath = path.resolve(process.cwd(), 'public', 'assets', 'models', `${c.id}.glb`);
    assert.equal(fs.existsSync(glbPath), true, `Missing GLB file for ${c.id}`);

    const gltf = parseGlbJson(glbPath);
    assert.equal(gltf.asset.version, '2.0');
    assert.equal(gltf.skins.length, 1);
    assert.equal(gltf.skins[0].joints.length, 22, `${c.id} must have 22 humanoid skeleton bones`);

    const matNames = new Set(gltf.materials.map((m) => m.name));
    for (const req of ['skin', 'eye', 'hair', 'garment_primary', 'garment_secondary', 'footwear']) {
      assert.ok(matNames.has(req), `${c.id} missing PBR material: ${req}`);
    }
    assert.ok(gltf.images.length >= 6, `${c.id} must embed procedural PBR PNG textures`);

    const animNames = new Set(gltf.animations.map((a) => a.name));
    for (const anim of REQUIRED_ANIMATIONS) {
      assert.ok(animNames.has(anim), `${c.id} missing skeletal animation: ${anim}`);
    }

    // Check every mesh primitive includes JOINTS_0, WEIGHTS_0, NORMAL, TEXCOORD_0, POSITION grounded at y=0
    let minY = Infinity;
    let maxY = -Infinity;
    for (const prim of gltf.meshes[0].primitives) {
      assert.ok('POSITION' in prim.attributes);
      assert.ok('NORMAL' in prim.attributes);
      assert.ok('TEXCOORD_0' in prim.attributes);
      assert.ok('JOINTS_0' in prim.attributes);
      assert.ok('WEIGHTS_0' in prim.attributes);
      const posAcc = gltf.accessors[prim.attributes.POSITION];
      if (posAcc.min && posAcc.max) {
        minY = Math.min(minY, posAcc.min[1]);
        maxY = Math.max(maxY, posAcc.max[1]);
      }
    }
    assert.ok(Math.abs(minY) < 0.03, `${c.id} feet should be grounded near y=0 (got minY=${minY})`);
    assert.ok(maxY >= 1.60 && maxY <= 2.15, `${c.id} height should be realistic human scale (got maxY=${maxY})`);
  }
});
