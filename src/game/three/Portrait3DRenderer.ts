import * as THREE from 'three';
import { CHARACTERS } from '@shared/characters';
import { CharacterId } from '@shared/types';
import { loadCharacterGLB } from './Fighter3DLoader';

const portraitUrlCache = new Map<CharacterId, string>();
const inFlight = new Map<CharacterId, Promise<string | null>>();
let sharedRenderer: THREE.WebGLRenderer | null = null;
let renderQueue: Promise<void> = Promise.resolve();

function getRenderer(): THREE.WebGLRenderer | null {
  if (typeof document === 'undefined') return null;
  if (!sharedRenderer) {
    try {
      sharedRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      sharedRenderer.setSize(256, 256, false);
      sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
      sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      sharedRenderer.toneMappingExposure = 1.18;
    } catch {
      return null;
    }
  }
  return sharedRenderer;
}

export function getCachedPortrait3D(charId: CharacterId): string | null {
  return portraitUrlCache.get(charId) ?? null;
}

export function renderPortrait3D(charId: CharacterId): Promise<string | null> {
  const cached = portraitUrlCache.get(charId);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(charId);
  if (pending) return pending;

  const p = new Promise<string | null>((resolve) => {
    renderQueue = renderQueue.then(async () => {
      if (portraitUrlCache.has(charId)) {
        resolve(portraitUrlCache.get(charId)!);
        return;
      }
      const renderer = getRenderer();
      if (!renderer) {
        resolve(null);
        return;
      }

      try {
        const gltf = await loadCharacterGLB(charId);
        const def = CHARACTERS[charId];
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 20);
        const headY = def.isBoss ? 1.66 : 1.54;
        camera.position.set(0.22, headY + 0.03, 1.06);
        camera.lookAt(0, headY - 0.03, 0);

        const hemi = new THREE.HemisphereLight(0xfff5eb, 0x334155, 1.45);
        scene.add(hemi);

        const key = new THREE.DirectionalLight(0xfff7ea, 2.0);
        key.position.set(1.8, 3.0, 2.8);
        scene.add(key);

        const front = new THREE.DirectionalLight(0xffffff, 0.85);
        front.position.set(-0.5, 1.6, 3.0);
        scene.add(front);

        const rim = new THREE.DirectionalLight(new THREE.Color(def.palette.aura), 1.3);
        rim.position.set(-2.2, 2.2, -1.6);
        scene.add(rim);

        scene.add(gltf.scene);
        gltf.scene.rotation.set(0, 0.14, 0);
        gltf.scene.position.set(0, 0, 0);
        gltf.scene.updateMatrixWorld(true);

        renderer.clear();
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        scene.remove(gltf.scene);

        portraitUrlCache.set(charId, dataUrl);
        resolve(dataUrl);
      } catch {
        resolve(null);
      } finally {
        inFlight.delete(charId);
      }
    });
  });

  inFlight.set(charId, p);
  return p;
}
