import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CharacterId } from '@shared/types';

export interface LoadedCharacterAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const loader = new GLTFLoader();
const cache = new Map<CharacterId, Promise<GLTF>>();

export function loadCharacterGLB(charId: CharacterId): Promise<GLTF> {
  const existing = cache.get(charId);
  if (existing) return existing;

  const url = `/assets/models/${charId}.glb`;
  const p = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => {
        cache.delete(charId);
        reject(err);
      }
    );
  });
  cache.set(charId, p);
  return p;
}

export async function cloneCharacterRig(charId: CharacterId): Promise<LoadedCharacterAsset> {
  const gltf = await loadCharacterGLB(charId);
  const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;

  cloned.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Clone materials per fighter instance so hit-flash / aura tints never leak between clones
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }
    }
  });

  return {
    scene: cloned,
    animations: gltf.animations,
  };
}
