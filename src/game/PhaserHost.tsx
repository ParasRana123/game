import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@shared/combat/constants';
import { InputState } from '@shared/types';
import { FightScene, FightSceneConfig } from './scenes/FightScene';

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

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new FightScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
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
    game.scene.start('FightScene', config);

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

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-xl border border-amber-500/20 shadow-2xl"
    />
  );
};
