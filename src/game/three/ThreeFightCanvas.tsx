import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MatchState } from '@shared/types';
import { Fighter3DActor } from './Fighter3DActor';

interface ThreeFightCanvasProps {
  matchStateRef: React.MutableRefObject<MatchState | null>;
  paused: boolean;
  matchKey: number | string;
}

export const ThreeFightCanvas: React.FC<ThreeFightCanvasProps> = ({
  matchStateRef,
  paused,
  matchKey,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Camera matched 1:1 with 1280x720 stage coordinates and GROUND_Y = 612
    const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 100);
    camera.position.set(0, 2.8224, 13.188);
    camera.lookAt(0, 2.8224, 0);

    // Balanced 3-Point + Front-Fill Arcade Studio Lighting + Ground Shadow Plane
    const hemi = new THREE.HemisphereLight(0xfff5eb, 0x334155, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ea, 1.95);
    keyLight.position.set(4.5, 9.5, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.bias = -0.0008;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -2;
    scene.add(keyLight);

    const frontFill = new THREE.DirectionalLight(0xfffaf0, 0.95);
    frontFill.position.set(0.0, 3.2, 8.5);
    scene.add(frontFill);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-6.0, 5.0, -5.0);
    scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight(0xf97316, 0.55);
    warmFill.position.set(6.0, 3.0, -4.0);
    scene.add(warmFill);

    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 8),
      new THREE.ShadowMaterial({ opacity: 0.48 })
    );
    groundPlane.rotation.x = -Math.PI * 0.5;
    groundPlane.position.y = 0.0;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    const resize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let actors: [Fighter3DActor, Fighter3DActor] | null = null;
    let lastTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dtSec = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const state = matchStateRef.current;

      if (state) {
        if (!actors) {
          actors = [
            new Fighter3DActor(state.fighters[0]),
            new Fighter3DActor(state.fighters[1]),
          ];
          scene.add(actors[0].group);
          scene.add(actors[1].group);
        }

        const effectiveDt = pausedRef.current ? 0 : dtSec;
        const tSec = now / 1000;
        actors[0].update(state.fighters[0], effectiveDt, tSec, 0.72);
        actors[1].update(state.fighters[1], effectiveDt, tSec, 0.72);

        // Subtle camera impact shake when special or hitstop occurs
        if (state.hitstopFrames > 0) {
          camera.position.x = (Math.random() - 0.5) * 0.14;
          camera.position.y = 2.8224 + (Math.random() - 0.5) * 0.10;
        } else {
          camera.position.x = 0;
          camera.position.y = 2.8224;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (actors) {
        actors[0].dispose();
        actors[1].dispose();
      }
      groundPlane.geometry.dispose();
      (groundPlane.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [matchKey, matchStateRef]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 z-10 w-full h-full"
    />
  );
};
