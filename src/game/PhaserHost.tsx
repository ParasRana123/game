import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@shared/combat/constants';
import { InputState, MatchState } from '@shared/types';
import { FightScene, FightSceneConfig } from './scenes/FightScene';
import { ThreeFightCanvas } from './three/ThreeFightCanvas';

interface PhaserHostProps {
  config: FightSceneConfig;
  paused: boolean;
  onSceneReady?: (controls: {
    setTouchInput: (slot: 0 | 1, patch: Partial<InputState>) => void;
  }) => void;
}

export const PhaserHost: React.FC<PhaserHostProps> = ({ config, paused, onSceneReady }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<FightScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const matchStateRef = useRef<MatchState | null>(config.initialMatchState || null);
  const pausedRef = useRef<boolean>(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sceneCfg: FightSceneConfig = {
      ...config,
      onFrameSync: (s) => {
        matchStateRef.current = s;
      },
      onHudUpdate: (s) => {
        matchStateRef.current = s;
        config.onHudUpdate(s);
      },
    };

    const scene = new FightScene(sceneCfg);
    scene.setPaused(pausedRef.current);
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      backgroundColor: '#09090f',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    });

    gameRef.current = game;

    onSceneReady?.({
      setTouchInput: (slot, patch) => {
        sceneRef.current?.setTouchInput(slot, patch);
      },
    });

    return () => {
      scene.shutdown();
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
      matchStateRef.current = null;
    };
    // Re-create Phaser instance only when a new match identity starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.mode,
    config.p1Char,
    config.p2Char,
    config.arenaId,
    config.difficulty,
    config.isBossFight,
    config.localSlot,
  ]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  const matchKey = `${config.mode}_${config.p1Char}_${config.p2Char}_${config.arenaId}_${config.isBossFight}`;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-amber-500/20 shadow-2xl bg-black">
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
      />
      <ThreeFightCanvas matchStateRef={matchStateRef} paused={paused} matchKey={matchKey} />
    </div>
  );
};
