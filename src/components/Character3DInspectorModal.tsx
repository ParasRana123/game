import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, Eye, RotateCw } from 'lucide-react';
import { ALL_CHARACTERS, CHARACTERS } from '@shared/characters';
import { CharacterId, FighterAction } from '@shared/types';
import { cloneCharacterRig } from '@/game/three/Fighter3DLoader';

type ViewPreset = 'front' | 'side' | 'back' | 'three_quarter' | 'fighting_stance';

const VIEW_PRESETS: Array<{ id: ViewPreset; label: string; pos: [number, number, number]; target: [number, number, number] }> = [
  { id: 'front', label: '1. Front View', pos: [0, 1.0, 3.0], target: [0, 0.92, 0] },
  { id: 'side', label: '2. Side View', pos: [3.0, 1.0, 0], target: [0, 0.92, 0] },
  { id: 'back', label: '3. Back View', pos: [0, 1.0, -3.0], target: [0, 0.92, 0] },
  { id: 'three_quarter', label: '4. Three-Quarter', pos: [2.1, 1.22, 2.25], target: [0, 0.94, 0] },
  { id: 'fighting_stance', label: '5. Fighting Stance', pos: [1.35, 1.02, 2.65], target: [0, 0.92, 0] },
];

const ANIM_CHOICES: FighterAction[] = [
  'idle',
  'walk',
  'run',
  'punch',
  'kick',
  'uppercut',
  'block',
  'special',
  'victory',
  'knockdown',
];

interface Character3DInspectorModalProps {
  initialCharId: CharacterId;
  onClose: () => void;
}

export const Character3DInspectorModal: React.FC<Character3DInspectorModalProps> = ({
  initialCharId,
  onClose,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [charId, setCharId] = useState<CharacterId>(initialCharId);
  const [viewPreset, setViewPreset] = useState<ViewPreset>('three_quarter');
  const [animName, setAnimName] = useState<FighterAction>('idle');
  const [loading, setLoading] = useState(true);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const currentActionRef = useRef<string | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 420, false);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      36,
      (container.clientWidth || 640) / (container.clientHeight || 420),
      0.1,
      50
    );
    camera.position.set(2.1, 1.22, 2.25);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.94, 0);
    controls.enableDamping = true;
    controls.update();
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xfff1e6, 0x1e293b, 1.15));
    const key = new THREE.DirectionalLight(0xfff5e4, 2.2);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    let activeModel: THREE.Group | null = null;
    let cancelled = false;

    const loadModel = async () => {
      setLoading(true);
      try {
        const { scene: rig, animations } = await cloneCharacterRig(charId);
        if (cancelled) return;
        if (activeModel) {
          scene.remove(activeModel);
        }
        activeModel = rig;
        scene.add(rig);

        const mixer = new THREE.AnimationMixer(rig);
        mixerRef.current = mixer;
        const map = new Map<string, THREE.AnimationAction>();
        for (const clip of animations) {
          const act = mixer.clipAction(clip);
          act.setLoop(THREE.LoopRepeat, Infinity);
          map.set(clip.name, act);
        }
        actionsRef.current = map;
        currentActionRef.current = null;
        const initialAct = map.get(animName) || map.get('idle');
        if (initialAct) {
          initialAct.play();
          currentActionRef.current = initialAct.getClip().name;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadModel();

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      mixerRef.current?.update(dt);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      controls.dispose();
      mixerRef.current?.stopAllAction();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charId]);

  // Apply animation blending when user switches animation
  useEffect(() => {
    const map = actionsRef.current;
    const next = map.get(animName);
    if (!next || currentActionRef.current === animName) return;
    const prev = currentActionRef.current ? map.get(currentActionRef.current) : null;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (prev && prev !== next) {
      prev.crossFadeTo(next, 0.16, true);
    }
    currentActionRef.current = animName;
  }, [animName]);

  const applyView = (presetId: ViewPreset) => {
    const p = VIEW_PRESETS.find((v) => v.id === presetId);
    if (!p || !cameraRef.current || !controlsRef.current) return;
    setViewPreset(presetId);
    cameraRef.current.position.set(...p.pos);
    controlsRef.current.target.set(...p.target);
    controlsRef.current.update();
    if (presetId === 'fighting_stance') {
      setAnimName('idle');
    }
  };

  const def = CHARACTERS[charId];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-950 border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-arcade text-xl font-bold text-white">
                3D MODEL INSPECTOR — {def.name.toUpperCase()}
              </h2>
              <p className="text-xs text-slate-400">
                Full-Body Rigged GLB • 22-Bone Skeleton • PBR Skin &amp; Clothing • Drag to Orbit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-[1fr_260px] flex-1 min-h-0">
          {/* 3D Viewport */}
          <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 min-h-[340px]">
            <div ref={hostRef} className="w-full h-full min-h-[360px]" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-xs font-arcade text-amber-300">
                LOADING 3D GLB MODEL...
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              Drag to orbit 360° • Scroll to zoom
            </div>
          </div>

          {/* Validation Controls */}
          <div className="p-4 border-t md:border-t-0 md:border-l border-slate-800 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <div className="font-arcade text-xs text-amber-400 uppercase">Character GLB</div>
              <select
                value={charId}
                onChange={(e) => setCharId(e.target.value as CharacterId)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              >
                {ALL_CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="font-arcade text-xs text-amber-400 uppercase">
                5 Validation Camera Views
              </div>
              <div className="grid gap-1.5">
                {VIEW_PRESETS.map((vp) => (
                  <button
                    key={vp.id}
                    onClick={() => applyView(vp.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold text-left border cursor-pointer transition ${
                      viewPreset === vp.id
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {vp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-arcade text-xs text-sky-400 uppercase">
                Skeletal Animation Blend
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ANIM_CHOICES.map((an) => (
                  <button
                    key={an}
                    onClick={() => setAnimName(an)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase border cursor-pointer ${
                      animName === an
                        ? 'bg-sky-500 text-slate-950 border-sky-300'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {an}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
