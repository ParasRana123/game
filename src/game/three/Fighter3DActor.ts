import * as THREE from 'three';
import { CHARACTERS } from '@shared/characters';
import { GROUND_Y, STAGE_WIDTH } from '@shared/combat/constants';
import { FighterAction, FighterState } from '@shared/types';
import { cloneCharacterRig } from './Fighter3DLoader';

const PX_TO_METERS = 0.0112;
const STAGE_HALF_W = STAGE_WIDTH * 0.5;

const ONE_SHOT_ACTIONS = new Set<FighterAction>([
  'punch',
  'kick',
  'uppercut',
  'grab',
  'hitstun',
  'knockdown',
  'defeat',
  'intro',
  'victory',
]);

export class Fighter3DActor {
  readonly group = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private activeActionName: FighterAction | null = null;
  private currentYaw: number;
  private materials: THREE.MeshStandardMaterial[] = [];
  private auraRing: THREE.Mesh;
  private ready = false;
  private disposed = false;

  constructor(private initialState: FighterState) {
    this.currentYaw = initialState.facing === 1 ? Math.PI * 0.44 : -Math.PI * 0.44;
    const def = CHARACTERS[initialState.characterId];

    // Grounded energy aura ring for full meter / special activation
    const ringGeo = new THREE.RingGeometry(0.45, 0.72, 32);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(def.palette.aura),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    this.auraRing = new THREE.Mesh(ringGeo, ringMat);
    this.auraRing.position.y = 0.02;
    this.group.add(this.auraRing);

    this.syncTransform(initialState, 1.0);
    void this.initRig();
  }

  private async initRig(): Promise<void> {
    try {
      const { scene, animations } = await cloneCharacterRig(this.initialState.characterId);
      if (this.disposed) return;

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = (obj as THREE.Mesh).material;
          if (Array.isArray(m)) {
            m.forEach((mat) => {
              if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                this.materials.push(mat as THREE.MeshStandardMaterial);
              }
            });
          } else if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            this.materials.push(m as THREE.MeshStandardMaterial);
          }
        }
      });

      this.mixer = new THREE.AnimationMixer(scene);
      for (const clip of animations) {
        const act = this.mixer.clipAction(clip);
        if (ONE_SHOT_ACTIONS.has(clip.name as FighterAction)) {
          act.setLoop(THREE.LoopOnce, 1);
          act.clampWhenFinished = true;
        } else {
          act.setLoop(THREE.LoopRepeat, Infinity);
        }
        this.actions.set(clip.name, act);
      }

      this.group.add(scene);
      this.ready = true;
      this.playAction(this.initialState.action, true);
    } catch (err) {
      console.error('[Fighter3DActor] Failed to load GLB model:', this.initialState.characterId, err);
    }
  }

  private playAction(nextName: FighterAction, immediate = false): void {
    if (!this.ready || !this.mixer) return;
    if (this.activeActionName === nextName) return;

    const nextAct = this.actions.get(nextName) || this.actions.get('idle');
    if (!nextAct) return;

    const prevAct = this.activeActionName ? this.actions.get(this.activeActionName) : null;
    const blendSec = immediate
      ? 0.0
      : ONE_SHOT_ACTIONS.has(nextName)
      ? 0.09
      : 0.16;

    nextAct.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (prevAct && prevAct !== nextAct) {
      prevAct.crossFadeTo(nextAct, blendSec, true);
    }
    this.activeActionName = nextName;
  }

  private syncTransform(s: FighterState, lerp: number): void {
    const targetX = (s.x - STAGE_HALF_W) * PX_TO_METERS;
    const targetY = Math.max(0, (GROUND_Y - s.y) * PX_TO_METERS);
    const targetYaw = s.facing === 1 ? Math.PI * 0.44 : -Math.PI * 0.44;

    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, targetX, lerp);
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, lerp);
    this.group.position.z = s.playerIndex === 0 ? 0.05 : -0.05;

    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, targetYaw, Math.min(1, lerp * 0.65));
    this.group.rotation.y = this.currentYaw;
  }

  update(state: FighterState, dtSec: number, timeSec: number, lerp = 0.65): void {
    this.syncTransform(state, lerp);

    if (this.mixer) {
      this.playAction(state.action);
      this.mixer.update(dtSec);
    }

    // Impact flash & Special glow
    const hitFlash =
      (state.action === 'hitstun' || state.action === 'knockdown') && state.actionFrame % 4 < 2;
    const specialGlow = state.action === 'special';

    for (const mat of this.materials) {
      if (hitFlash) {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 0.65;
      } else if (specialGlow) {
        mat.emissive.setHex(0xf59e0b);
        mat.emissiveIntensity = 0.18 + Math.sin(timeSec * 14) * 0.08;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
      }
    }

    const ringMat = this.auraRing.material as THREE.MeshBasicMaterial;
    if (state.action === 'special') {
      ringMat.opacity = 0.65 + Math.sin(timeSec * 14) * 0.2;
      const sc = 1.2 + Math.sin(timeSec * 10) * 0.18;
      this.auraRing.scale.set(sc, sc, sc);
    } else if (state.meter >= 100) {
      ringMat.opacity = 0.35 + Math.sin(timeSec * 8) * 0.12;
      this.auraRing.scale.set(1.0, 1.0, 1.0);
    } else {
      ringMat.opacity = 0.0;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.auraRing.geometry.dispose();
    (this.auraRing.material as THREE.Material).dispose();
    for (const m of this.materials) {
      m.dispose();
    }
  }
}
