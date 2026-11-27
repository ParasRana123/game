import test from 'node:test';
import assert from 'node:assert/strict';
import { FightSceneConfig, SceneLifecycleController } from '../src/game/scenes/sceneLifecycle.js';

const baseConfig: FightSceneConfig = {
  mode: 'single_ai',
  p1Char: 'vikas_guru',
  p2Char: 'muffler_man',
  arenaId: 'parliament',
  difficulty: 'medium',
  isBossFight: false,
  onHudUpdate: () => undefined,
  onMatchEnd: () => undefined,
};

test('setPaused before init does not throw when config is not yet set', () => {
  const lc = new SceneLifecycleController();
  assert.doesNotThrow(() => lc.setPaused(true));
  assert.equal(lc.isPaused(), true);
  lc.applyInitData(baseConfig);
  assert.equal(lc.getConfig()?.mode, 'single_ai');
  assert.equal(lc.isPaused(), true);
});

test('applyInitData ignores empty or undefined Phaser auto-start payloads', () => {
  const lc = new SceneLifecycleController(baseConfig);
  lc.applyInitData(undefined);
  lc.applyInitData({});
  assert.equal(lc.getConfig()?.mode, 'single_ai');
  assert.equal(lc.getConfig()?.p1Char, 'vikas_guru');
});

test('online mode never pauses even if setPaused(true) was called early', () => {
  const lc = new SceneLifecycleController();
  lc.setPaused(true);
  assert.equal(lc.isPaused(), true);
  lc.applyInitData({ ...baseConfig, mode: 'online' });
  assert.equal(lc.isPaused(), false);
  lc.setPaused(true);
  assert.equal(lc.isPaused(), false);
});
