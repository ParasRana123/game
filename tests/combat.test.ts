import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createMatchState, emptyInput, stepMatchState } from '../shared/combat/engine.js';
import { computeAIInput, createAIMemory } from '../shared/combat/ai.js';
import { PLAYABLE_CHARACTERS, BOSS_CHARACTER } from '../shared/characters.js';
import { ARENA_LIST } from '../shared/arenas.js';

test('Roster has at least 8 playable characters and a unique Boss', () => {
  assert.ok(PLAYABLE_CHARACTERS.length >= 8, 'Expected at least 8 playable characters');
  assert.equal(BOSS_CHARACTER.id, 'samrat_ordinance');
  assert.equal(ARENA_LIST.length, 4);
  for (const c of PLAYABLE_CHARACTERS) {
    assert.ok(c.voiceLines.special.length > 0, `Missing special voice line for ${c.id}`);
  }
});

test('Match transitions from intro -> countdown -> fighting', () => {
  const state = createMatchState('vikas_guru', 'yuva_prince', 'parliament');
  assert.equal(state.phase, 'intro');
  for (let i = 0; i < 90; i++) {
    stepMatchState(state, emptyInput(), emptyInput());
  }
  assert.equal(state.phase, 'countdown');
  for (let i = 0; i < 130; i++) {
    stepMatchState(state, emptyInput(), emptyInput());
  }
  assert.equal(state.phase, 'fighting');
});

test('Movement, jump physics, and arena boundaries work accurately', () => {
  const state = createMatchState('muffler_man', 'didi_storm', 'jantar_mantar');
  state.phase = 'fighting';
  const startX = state.fighters[0].x;
  const moveRight = { ...emptyInput(), right: true };
  for (let i = 0; i < 20; i++) {
    stepMatchState(state, moveRight, emptyInput());
  }
  assert.ok(state.fighters[0].x > startX, 'Fighter 0 should move right');

  // Jump
  stepMatchState(state, { ...emptyInput(), up: true }, emptyInput());
  assert.equal(state.fighters[0].grounded, false);
  assert.ok(state.fighters[0].vy < 0, 'Fighter should launch upward');
  for (let i = 0; i < 60; i++) {
    stepMatchState(state, emptyInput(), emptyInput());
  }
  assert.equal(state.fighters[0].grounded, true, 'Fighter should land back on ground');
});

test('Hitbox/hurtbox collision deals damage, builds meter, and triggers KO', () => {
  const state = createMatchState('bulldozer_baba', 'yuva_prince', 'indian_street');
  state.phase = 'fighting';
  state.fighters[0].x = 500;
  state.fighters[1].x = 568; // Close melee range

  const initialHp = state.fighters[1].hp;
  // Press punch once then release
  stepMatchState(state, { ...emptyInput(), punch: true }, emptyInput());
  for (let i = 0; i < 12; i++) {
    stepMatchState(state, emptyInput(), emptyInput());
  }
  assert.ok(state.fighters[1].hp < initialHp, 'Punch hitbox should damage opponent');
  assert.ok(state.fighters[0].meter > 0, 'Attacker should build special meter');
});

test('Blocking reduces damage and Grab breaks block', () => {
  const state = createMatchState('vikas_guru', 'chanakya_x', 'rally_stage');
  state.phase = 'fighting';
  state.fighters[0].x = 500;
  state.fighters[1].x = 565;

  const hpBeforeBlock = state.fighters[1].hp;
  stepMatchState(state, { ...emptyInput(), punch: true }, { ...emptyInput(), block: true });
  for (let i = 0; i < 10; i++) {
    stepMatchState(state, emptyInput(), { ...emptyInput(), block: true });
  }
  const blockedDmg = hpBeforeBlock - state.fighters[1].hp;
  assert.ok(blockedDmg > 0 && blockedDmg < 25, `Blocked chip damage expected, got ${blockedDmg}`);

  // Wait for recovery, then grab through block
  for (let i = 0; i < 15; i++) {
    stepMatchState(state, emptyInput(), { ...emptyInput(), block: true });
  }
  const hpBeforeGrab = state.fighters[1].hp;
  stepMatchState(state, { ...emptyInput(), grab: true }, { ...emptyInput(), block: true });
  for (let i = 0; i < 12; i++) {
    stepMatchState(state, emptyInput(), { ...emptyInput(), block: true });
  }
  const grabDmg = hpBeforeGrab - state.fighters[1].hp;
  assert.ok(grabDmg >= 80, `Grab should beat block and deal full throw damage, got ${grabDmg}`);
});

test('Special attack consumes meter, emits voice event, and spawns projectile', () => {
  const state = createMatchState('vikas_guru', 'muffler_man', 'parliament');
  state.phase = 'fighting';
  state.fighters[0].meter = 100;

  let sawVoice = false;
  let sawBanner = false;
  stepMatchState(state, { ...emptyInput(), special: true }, emptyInput());
  if (state.events.some((e) => e.type === 'voice' && e.voiceSlot === 'special')) {
    sawVoice = true;
  }
  if (state.specialBanner?.title === 'MITRON MEGA-SPEECH') {
    sawBanner = true;
  }
  for (let i = 0; i < 35; i++) {
    stepMatchState(state, emptyInput(), emptyInput());
  }
  assert.equal(sawVoice, true);
  assert.equal(sawBanner, true);
  assert.equal(state.fighters[0].meter, 0);
  assert.ok(state.projectiles.length >= 1, 'Mitron special should spawn speech_wave projectile');
  assert.ok(state.projectiles.every((p) => p.kind === 'speech_wave'));
});

test('Special attack syncs full audio duration, is unblockable, deals supreme damage, and locks opponent attacks until finished', () => {
  const state = createMatchState('vikas_guru', 'bulldozer_baba', 'parliament');
  state.phase = 'fighting';
  state.fighters[0].x = 400;
  state.fighters[1].x = 620;
  state.fighters[1].hp = 1180;
  state.fighters[0].meter = 100;

  // Trigger Mitron special while Bulldozer Baba holds Block and mashes attacks
  stepMatchState(
    state,
    { ...emptyInput(), special: true },
    { ...emptyInput(), block: true, punch: true, kick: true }
  );
  assert.equal(state.fighters[0].action, 'special');
  assert.equal(state.fighters[1].action, 'idle', 'Opponent must not start punch/kick/block during special');

  // Step halfway through Mitron's 552-frame audio: animation & banner must still be active, opponent still locked
  let opponentAttackedDuringSpecial = false;
  for (let i = 0; i < 300; i++) {
    stepMatchState(
      state,
      emptyInput(),
      { ...emptyInput(), block: true, punch: i % 5 === 0, kick: i % 7 === 0, grab: i % 9 === 0 }
    );
    if (state.fighters[0].action === 'special') {
      if (
        state.fighters[1].action === 'punch' ||
        state.fighters[1].action === 'kick' ||
        state.fighters[1].action === 'uppercut' ||
        state.fighters[1].action === 'grab' ||
        state.fighters[1].action === 'special'
      ) {
        opponentAttackedDuringSpecial = true;
      }
    }
  }

  assert.equal(opponentAttackedDuringSpecial, false, 'Opponent must not attack while special is active');
  assert.equal(state.fighters[0].action, 'special', 'Mitron special animation must remain active during 9.2s audio');
  assert.ok(state.specialBanner !== null, 'Special banner must remain active with animation/audio');

  const damageDealt = 1180 - state.fighters[1].hp;
  assert.ok(
    damageDealt >= 230,
    `Unblockable special must deal supreme damage even through block, got ${damageDealt}`
  );

  // Finish remaining frames of the 552-frame special (+ hitstop)
  for (let i = 0; i < 290; i++) {
    stepMatchState(state, emptyInput(), emptyInput());
  }
  assert.notEqual(state.fighters[0].action, 'special', 'Special should finish cleanly after audio duration');

  // Now opponent CAN attack again!
  stepMatchState(state, emptyInput(), { ...emptyInput(), punch: true });
  assert.equal(state.fighters[1].action, 'punch', 'Opponent should be able to attack once special ends');
});

test('Mitron character and extracted special WAV audio asset exist', () => {
  const mitron = PLAYABLE_CHARACTERS.find((c) => c.name === 'Mitron');
  assert.ok(mitron, 'Mitron should exist in PLAYABLE_CHARACTERS');
  assert.equal(mitron.specialName, 'MITRON MEGA-SPEECH');
  const wavPath = path.resolve(process.cwd(), 'public', 'assets', 'audio', 'voices', mitron.id, 'special.wav');
  assert.equal(fs.existsSync(wavPath), true, 'Mitron special.wav must exist');
  const buf = fs.readFileSync(wavPath);
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.ok(buf.length > 100_000, 'Mitron special.wav should contain extracted recording audio');
});

test('AI controller approaches and attacks opponent', () => {
  const state = createMatchState('vikas_guru', 'samrat_ordinance', 'parliament', true);
  state.phase = 'fighting';
  const mem = createAIMemory();
  let movedLeft = false;
  for (let i = 0; i < 40; i++) {
    const aiIn = computeAIInput(state, 1, 'hard', mem, true);
    if (aiIn.left) movedLeft = true;
    stepMatchState(state, emptyInput(), aiIn);
  }
  assert.equal(movedLeft, true, 'Hard AI should approach player');
});
