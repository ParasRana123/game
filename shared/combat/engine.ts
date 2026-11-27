import { CHARACTERS } from '../characters.js';
import {
  ArenaId,
  Box,
  CharacterId,
  CombatEvent,
  FighterState,
  InputState,
  MatchState,
  ProjectileState,
} from '../types.js';
import {
  AIR_DRAG,
  COMBO_RESET_FRAMES,
  COUNTDOWN_FRAMES,
  FIGHTER_BODY_WIDTH,
  FIGHTER_CROUCH_HEIGHT,
  FIGHTER_STAND_HEIGHT,
  GRAVITY,
  GROUND_FRICTION,
  GROUND_Y,
  INTRO_FRAMES,
  MAX_METER,
  MAX_ROUNDS,
  ROUNDS_TO_WIN,
  ROUND_OVER_FRAMES,
  ROUND_TIME_FRAMES,
  SPECIAL_COST,
  STAGE_LEFT,
  STAGE_RIGHT,
} from './constants.js';
import { computeAttackHitbox, getMoveTotalFrames, MOVES, MoveFrameData } from './moves.js';

export function emptyInput(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
    punch: false,
    kick: false,
    block: false,
    grab: false,
    special: false,
  };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function computeHurtbox(x: number, y: number, crouching: boolean): Box {
  const h = crouching ? FIGHTER_CROUCH_HEIGHT : FIGHTER_STAND_HEIGHT;
  return {
    x: x - FIGHTER_BODY_WIDTH * 0.5,
    y: y - h,
    w: FIGHTER_BODY_WIDTH,
    h,
  };
}

export function createFighterState(
  playerIndex: 0 | 1,
  characterId: CharacterId,
  isBoss = false
): FighterState {
  const def = CHARACTERS[characterId];
  const startX = playerIndex === 0 ? 360 : 920;
  const facing: 1 | -1 = playerIndex === 0 ? 1 : -1;
  const maxHp = isBoss && def.isBoss ? def.stats.maxHp : def.stats.maxHp;

  return {
    playerIndex,
    characterId,
    x: startX,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing,
    hp: maxHp,
    maxHp,
    meter: 0,
    action: 'intro',
    actionFrame: 0,
    movePhase: 'none',
    moveHitConnected: false,
    comboStep: 0,
    comboHitsReceived: 0,
    comboCounter: 0,
    comboTimer: 0,
    hitstunFrames: 0,
    blockstunFrames: 0,
    invulnFrames: 0,
    superArmorFrames: 0,
    grounded: true,
    crouching: false,
    blocking: false,
    hurtbox: computeHurtbox(startX, GROUND_Y, false),
    hitbox: null,
    roundsWon: 0,
    lastInput: emptyInput(),
    prevPressed: {
      punch: false,
      kick: false,
      grab: false,
      special: false,
      up: false,
    },
    bossPhase: def.isBoss ? 1 : undefined,
  };
}

export function createMatchState(
  p1Char: CharacterId,
  p2Char: CharacterId,
  arenaId: ArenaId,
  isBossFight = false
): MatchState {
  return {
    tick: 0,
    phase: 'intro',
    phaseFrames: INTRO_FRAMES,
    countdownSeconds: 3,
    round: 1,
    maxRounds: MAX_ROUNDS,
    timerFrames: ROUND_TIME_FRAMES,
    arenaId,
    isBossFight,
    specialBanner: null,
    hitstopFrames: 0,
    winnerIndex: null,
    fighters: [
      createFighterState(0, p1Char, false),
      createFighterState(1, p2Char, isBossFight),
    ],
    projectiles: [],
    events: [],
  };
}

function resetFighterForRound(fighter: FighterState): void {
  const def = CHARACTERS[fighter.characterId];
  fighter.x = fighter.playerIndex === 0 ? 360 : 920;
  fighter.y = GROUND_Y;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.facing = fighter.playerIndex === 0 ? 1 : -1;
  fighter.hp = fighter.maxHp;
  fighter.action = 'idle';
  fighter.actionFrame = 0;
  fighter.movePhase = 'none';
  fighter.moveHitConnected = false;
  fighter.comboStep = 0;
  fighter.comboHitsReceived = 0;
  fighter.comboCounter = 0;
  fighter.comboTimer = 0;
  fighter.hitstunFrames = 0;
  fighter.blockstunFrames = 0;
  fighter.invulnFrames = 0;
  fighter.superArmorFrames = 0;
  fighter.grounded = true;
  fighter.crouching = false;
  fighter.blocking = false;
  fighter.hitbox = null;
  fighter.hurtbox = computeHurtbox(fighter.x, fighter.y, false);
  if (def.isBoss) {
    fighter.bossPhase = 1;
  }
}

function isAttackAction(action: FighterState['action']): action is MoveFrameData['action'] {
  return (
    action === 'punch' ||
    action === 'kick' ||
    action === 'uppercut' ||
    action === 'grab' ||
    action === 'special'
  );
}

function startAttack(
  state: MatchState,
  fighter: FighterState,
  action: MoveFrameData['action'],
  comboStep: number
): void {
  const def = CHARACTERS[fighter.characterId];
  const move = MOVES[action];
  fighter.action = action;
  fighter.actionFrame = 0;
  fighter.movePhase = 'startup';
  fighter.moveHitConnected = false;
  fighter.comboStep = comboStep;
  fighter.blocking = false;
  fighter.hitbox = null;

  if (action === 'special') {
    fighter.meter = Math.max(0, fighter.meter - SPECIAL_COST);
    fighter.invulnFrames = 18;
    fighter.superArmorFrames = def.specialKind === 'dash_slam' ? 28 : 14;
    state.specialBanner = {
      playerIndex: fighter.playerIndex,
      characterId: fighter.characterId,
      title: def.specialName,
      subtitle: def.specialSubtitle,
      framesLeft: fighter.characterId === 'vikas_guru' ? 180 : 95,
    };
    state.hitstopFrames = 10;
    state.events.push({
      type: 'special_activate',
      playerIndex: fighter.playerIndex,
      characterId: fighter.characterId,
      x: fighter.x,
      y: fighter.y - 90,
      label: def.specialName,
    });
    state.events.push({
      type: 'voice',
      playerIndex: fighter.playerIndex,
      characterId: fighter.characterId,
      voiceSlot: 'special',
    });
  } else if (action === 'punch' || action === 'kick' || action === 'uppercut') {
    if (fighter.grounded && move.lungeVx) {
      fighter.vx = fighter.facing * move.lungeVx;
    }
    state.events.push({
      type: 'whiff',
      playerIndex: fighter.playerIndex,
      characterId: fighter.characterId,
      x: fighter.x,
      y: fighter.y - 80,
      label: action,
    });
    if (action === 'uppercut' || (action === 'kick' && state.tick % 2 === 0)) {
      state.events.push({
        type: 'voice',
        playerIndex: fighter.playerIndex,
        characterId: fighter.characterId,
        voiceSlot: action === 'uppercut' ? 'attack2' : 'attack1',
      });
    }
  }
}

function spawnSpecialEffects(state: MatchState, fighter: FighterState): void {
  const def = CHARACTERS[fighter.characterId];
  const dir = fighter.facing;
  const baseDamage = Math.round(190 * def.stats.strength);

  const makeProj = (
    offsetIdx: number,
    xOff: number,
    yOff: number,
    vx: number,
    vy: number,
    radius: number,
    dmg: number,
    ttl = 110
  ): ProjectileState => ({
    id: `proj_${state.tick}_${fighter.playerIndex}_${offsetIdx}`,
    ownerIndex: fighter.playerIndex,
    characterId: fighter.characterId,
    kind: def.projectileKind,
    x: fighter.x + dir * xOff,
    y: fighter.y + yOff,
    vx,
    vy,
    radius,
    damage: dmg,
    knockbackX: 11.5,
    knockbackY: -8.5,
    ttlFrames: ttl,
    active: true,
  });

  if (def.specialKind === 'projectile') {
    if (fighter.characterId === 'vikas_guru') {
      state.projectiles.push(makeProj(0, 66, -96, dir * 13.5, 0, 44, Math.round(baseDamage * 0.72), 110));
      state.projectiles.push(makeProj(1, 24, -84, dir * 10.5, 0, 32, Math.round(baseDamage * 0.48), 125));
    } else {
      state.projectiles.push(makeProj(0, 62, -92, dir * 13.2, 0, 38, baseDamage, 100));
    }
  } else if (def.specialKind === 'barrage') {
    state.projectiles.push(makeProj(0, 56, -102, dir * 14.5, -1.0, 28, Math.round(baseDamage * 0.62), 95));
    state.projectiles.push(makeProj(1, 28, -68, dir * 11.5, 0.4, 28, Math.round(baseDamage * 0.62), 115));
    fighter.vx = dir * 10;
  } else if (def.specialKind === 'dash_slam') {
    fighter.vx = dir * 17.5;
    state.projectiles.push(makeProj(0, 48, -68, dir * 16.5, 0, 46, Math.round(baseDamage * 0.9), 26));
  } else if (def.specialKind === 'meteor') {
    // Boss multi-meteor + ground wave
    const opponent = state.fighters[fighter.playerIndex === 0 ? 1 : 0];
    const targetX = opponent.x;
    state.projectiles.push(
      {
        ...makeProj(0, 0, 0, (targetX - fighter.x) * 0.015, 11.5, 42, Math.round(baseDamage * 0.65), 85),
        x: Math.max(STAGE_LEFT + 60, Math.min(STAGE_RIGHT - 60, targetX - 90)),
        y: 60,
      },
      {
        ...makeProj(1, 0, 0, 0, 12.5, 44, Math.round(baseDamage * 0.7), 85),
        x: Math.max(STAGE_LEFT + 60, Math.min(STAGE_RIGHT - 60, targetX + 70)),
        y: 20,
      },
      makeProj(2, 54, -85, dir * 12.5, 0, 36, Math.round(baseDamage * 0.75), 95)
    );
  }
}

function updateFighterControlsAndPhysics(
  state: MatchState,
  fighter: FighterState,
  opponent: FighterState,
  input: InputState
): void {
  const def = CHARACTERS[fighter.characterId];
  fighter.lastInput = input;

  if (fighter.invulnFrames > 0) fighter.invulnFrames -= 1;
  if (fighter.superArmorFrames > 0) fighter.superArmorFrames -= 1;
  if (fighter.comboTimer > 0) {
    fighter.comboTimer -= 1;
    if (fighter.comboTimer === 0) fighter.comboCounter = 0;
  }

  // Boss Phase 2 enrage below 45% HP
  if (def.isBoss && fighter.bossPhase === 1 && fighter.hp <= fighter.maxHp * 0.45) {
    fighter.bossPhase = 2;
    fighter.meter = Math.min(MAX_METER, fighter.meter + 50);
    state.events.push({
      type: 'special_activate',
      playerIndex: fighter.playerIndex,
      characterId: fighter.characterId,
      x: fighter.x,
      y: fighter.y - 120,
      label: 'PHASE 2: EMERGENCY OVERDRIVE!',
    });
  }

  const punchJustPressed = input.punch && !fighter.prevPressed.punch;
  const kickJustPressed = input.kick && !fighter.prevPressed.kick;
  const grabJustPressed = input.grab && !fighter.prevPressed.grab;
  const specialJustPressed = input.special && !fighter.prevPressed.special;
  const upJustPressed = input.up && !fighter.prevPressed.up;

  fighter.prevPressed = {
    punch: input.punch,
    kick: input.kick,
    grab: input.grab,
    special: input.special,
    up: input.up,
  };

  // Hitstun / knockdown / blockstun states
  if (fighter.action === 'hitstun' || fighter.action === 'knockdown') {
    fighter.hitbox = null;
    fighter.blocking = false;
    fighter.actionFrame += 1;
    fighter.hitstunFrames -= 1;
    if (fighter.hitstunFrames <= 0 && fighter.grounded) {
      fighter.action = 'idle';
      fighter.actionFrame = 0;
      fighter.comboHitsReceived = 0;
    }
  } else if (fighter.action === 'block') {
    fighter.hitbox = null;
    fighter.actionFrame += 1;
    if (fighter.blockstunFrames > 0) {
      fighter.blockstunFrames -= 1;
    }
    const holdingBack =
      (fighter.facing === 1 && input.left) || (fighter.facing === -1 && input.right);
    if (fighter.blockstunFrames <= 0 && !input.block && !holdingBack) {
      fighter.action = 'idle';
      fighter.blocking = false;
      fighter.actionFrame = 0;
    }
  } else if (isAttackAction(fighter.action)) {
    const move = MOVES[fighter.action];
    fighter.actionFrame += 1;
    const total = getMoveTotalFrames(move);

    if (fighter.actionFrame <= move.startup) {
      fighter.movePhase = 'startup';
      fighter.hitbox = null;
    } else if (fighter.actionFrame <= move.startup + move.active) {
      if (fighter.movePhase === 'startup' && fighter.action === 'special') {
        spawnSpecialEffects(state, fighter);
      }
      fighter.movePhase = 'active';
      fighter.hitbox = computeAttackHitbox(
        fighter.x,
        fighter.y,
        fighter.facing,
        fighter.crouching,
        move
      );
    } else if (fighter.actionFrame < total) {
      fighter.movePhase = 'recovery';
      fighter.hitbox = null;
    } else {
      fighter.action = fighter.grounded ? 'idle' : 'jump';
      fighter.actionFrame = 0;
      fighter.movePhase = 'none';
      fighter.moveHitConnected = false;
      fighter.comboStep = 0;
      fighter.hitbox = null;
    }

    // Combo canceling on connected hit!
    if (
      fighter.moveHitConnected &&
      (fighter.movePhase === 'active' || fighter.movePhase === 'recovery')
    ) {
      if (specialJustPressed && fighter.meter >= SPECIAL_COST) {
        startAttack(state, fighter, 'special', 3);
      } else if (fighter.action === 'punch' && fighter.comboStep === 0 && kickJustPressed) {
        startAttack(state, fighter, 'kick', 1);
      } else if (
        fighter.action === 'kick' &&
        fighter.comboStep === 1 &&
        (punchJustPressed || kickJustPressed)
      ) {
        startAttack(state, fighter, 'uppercut', 2);
      }
    }
  } else {
    // Free movement / neutral state
    fighter.hitbox = null;
    fighter.movePhase = 'none';

    if (fighter.grounded) {
      fighter.facing = opponent.x >= fighter.x ? 1 : -1;
    }

    const holdingBack =
      (fighter.facing === 1 && input.left) || (fighter.facing === -1 && input.right);
    const opponentAttacking =
      isAttackAction(opponent.action) || state.projectiles.some((p) => p.ownerIndex !== fighter.playerIndex);

    fighter.crouching = fighter.grounded && input.down && !input.block;
    fighter.blocking =
      fighter.grounded && (input.block || (holdingBack && opponentAttacking));

    if (specialJustPressed && fighter.meter >= SPECIAL_COST) {
      startAttack(state, fighter, 'special', 0);
    } else if (grabJustPressed && fighter.grounded) {
      startAttack(state, fighter, 'grab', 0);
    } else if (punchJustPressed) {
      if (input.up && fighter.grounded) {
        startAttack(state, fighter, 'uppercut', 0);
      } else {
        startAttack(state, fighter, 'punch', 0);
      }
    } else if (kickJustPressed) {
      startAttack(state, fighter, 'kick', 0);
    } else if (fighter.blocking) {
      fighter.action = 'block';
      fighter.vx *= 0.6;
    } else if (fighter.crouching) {
      fighter.action = 'crouch';
      fighter.vx *= 0.6;
    } else {
      const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (moveDir !== 0) {
        const speed = input.sprint ? def.stats.runSpeed : def.stats.walkSpeed;
        fighter.vx = moveDir * (fighter.grounded ? speed : speed * 0.92);
        if (fighter.grounded) {
          fighter.action = input.sprint ? 'run' : 'walk';
        }
      } else if (fighter.grounded) {
        fighter.action = 'idle';
      }

      if (upJustPressed && fighter.grounded) {
        fighter.vy = def.stats.jumpVelocity;
        fighter.grounded = false;
        fighter.action = 'jump';
        state.events.push({
          type: 'jump',
          playerIndex: fighter.playerIndex,
          x: fighter.x,
          y: fighter.y,
        });
      }
    }
    fighter.actionFrame += 1;
  }

  // Physics integration
  if (!fighter.grounded) {
    fighter.vy += GRAVITY;
    fighter.vx *= AIR_DRAG;
  } else if (!isAttackAction(fighter.action) || fighter.movePhase === 'recovery') {
    if (
      fighter.action !== 'walk' &&
      fighter.action !== 'run' &&
      !(fighter.action === 'special' && fighter.movePhase === 'active')
    ) {
      fighter.vx *= GROUND_FRICTION;
    }
  }

  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  if (fighter.y >= GROUND_Y) {
    fighter.y = GROUND_Y;
    fighter.vy = 0;
    if (!fighter.grounded) {
      fighter.grounded = true;
      if (fighter.action === 'jump') {
        fighter.action = 'idle';
        fighter.actionFrame = 0;
      }
    }
  }

  // Stage bounds
  fighter.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, fighter.x));
  fighter.hurtbox = computeHurtbox(fighter.x, fighter.y, fighter.crouching);
}

function resolvePushbox(f1: FighterState, f2: FighterState): void {
  if (!f1.grounded && !f2.grounded) return;
  const minDist = FIGHTER_BODY_WIDTH * 0.85;
  const dx = f2.x - f1.x;
  const absDx = Math.abs(dx);
  const dy = Math.abs(f2.y - f1.y);
  if (absDx < minDist && dy < 110) {
    const push = (minDist - absDx) * 0.5;
    const sign = dx >= 0 ? 1 : -1;
    f1.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f1.x - sign * push));
    f2.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f2.x + sign * push));
    f1.hurtbox = computeHurtbox(f1.x, f1.y, f1.crouching);
    f2.hurtbox = computeHurtbox(f2.x, f2.y, f2.crouching);
  }
}

function applyHit(
  state: MatchState,
  attacker: FighterState,
  defender: FighterState,
  damage: number,
  hitstun: number,
  blockstun: number,
  knockbackX: number,
  knockbackY: number,
  unblockable: boolean,
  launches: boolean,
  isSpecialOrProj: boolean
): void {
  if (defender.invulnFrames > 0) return;

  const isCounterHit =
    isAttackAction(defender.action) &&
    (defender.movePhase === 'startup' || defender.movePhase === 'active');

  const blocked =
    !unblockable &&
    defender.blocking &&
    !isCounterHit &&
    defender.action !== 'hitstun' &&
    defender.action !== 'knockdown';

  const dir = attacker.x <= defender.x ? 1 : -1;

  if (blocked) {
    const chip = Math.max(4, Math.round(damage * (isSpecialOrProj ? 0.2 : 0.1)));
    defender.hp = Math.max(1, defender.hp - chip);
    defender.blockstunFrames = blockstun;
    defender.action = 'block';
    defender.vx = dir * knockbackX * 0.45;
    attacker.meter = Math.min(MAX_METER, attacker.meter + 4);
    defender.meter = Math.min(MAX_METER, defender.meter + 6);
    state.hitstopFrames = 3;
    state.events.push({
      type: 'block',
      playerIndex: defender.playerIndex,
      x: (attacker.x + defender.x) * 0.5,
      y: defender.y - 95,
      damage: chip,
    });
    return;
  }

  // Combo damage scaling so combos feel rewarding without instant 100-0
  const scaling = Math.max(0.55, 1 - defender.comboHitsReceived * 0.08);
  const critBonus = isCounterHit || attacker.comboCounter >= 2 ? 1.18 : 1.0;
  const finalDamage = Math.max(8, Math.round(damage * scaling * critBonus));

  defender.hp = Math.max(0, defender.hp - finalDamage);
  attacker.comboCounter += 1;
  attacker.comboTimer = COMBO_RESET_FRAMES;
  defender.comboHitsReceived += 1;

  // Super armor reduces stun/knockback unless special or grab
  if (defender.superArmorFrames > 0 && !unblockable && !isSpecialOrProj) {
    state.hitstopFrames = 3;
  } else {
    defender.hitbox = null;
    defender.movePhase = 'none';
    defender.hitstunFrames = hitstun;
    defender.action = launches || knockbackY <= -8 ? 'knockdown' : 'hitstun';
    defender.actionFrame = 0;
    defender.vx = dir * knockbackX;
    if (knockbackY < 0) {
      defender.vy = knockbackY;
      defender.grounded = false;
    }
    state.hitstopFrames = isSpecialOrProj || critBonus > 1 ? 6 : 4;
  }

  defender.meter = Math.min(MAX_METER, defender.meter + 8);
  if (!isSpecialOrProj) {
    attacker.meter = Math.min(MAX_METER, attacker.meter + 10);
  }

  const hitX = (attacker.x + defender.x) * 0.5;
  const hitY = defender.y - 96;

  if (unblockable) {
    state.events.push({
      type: 'grab',
      playerIndex: attacker.playerIndex,
      x: hitX,
      y: hitY,
      damage: finalDamage,
      combo: attacker.comboCounter,
      label: 'POLITICAL THROW!',
    });
  } else if (critBonus > 1) {
    state.events.push({
      type: 'crit',
      playerIndex: attacker.playerIndex,
      x: hitX,
      y: hitY,
      damage: finalDamage,
      combo: attacker.comboCounter,
      label: isCounterHit ? 'COUNTER!' : 'CRITICAL!',
    });
  } else {
    state.events.push({
      type: 'hit',
      playerIndex: attacker.playerIndex,
      x: hitX,
      y: hitY,
      damage: finalDamage,
      combo: attacker.comboCounter,
    });
  }

  if (state.tick % 2 === 0 || finalDamage >= 100) {
    state.events.push({
      type: 'voice',
      playerIndex: defender.playerIndex,
      characterId: defender.characterId,
      voiceSlot: 'hit',
    });
  }
}

function resolveCombatCollisions(state: MatchState): void {
  const [f1, f2] = state.fighters;

  const checkMelee = (attacker: FighterState, defender: FighterState) => {
    if (
      !attacker.hitbox ||
      attacker.moveHitConnected ||
      !isAttackAction(attacker.action) ||
      attacker.movePhase !== 'active'
    ) {
      return;
    }
    if (boxesOverlap(attacker.hitbox, defender.hurtbox)) {
      const move = MOVES[attacker.action];
      const str = CHARACTERS[attacker.characterId].stats.strength;
      attacker.moveHitConnected = true;
      attacker.meter = Math.min(MAX_METER, attacker.meter + move.meterGainOnHit);
      applyHit(
        state,
        attacker,
        defender,
        Math.round(move.damage * str),
        move.hitstun,
        move.blockstun,
        move.knockbackX,
        move.knockbackY,
        Boolean(move.unblockable),
        Boolean(move.launches),
        attacker.action === 'special'
      );
    }
  };

  checkMelee(f1, f2);
  checkMelee(f2, f1);

  // Projectiles
  for (const proj of state.projectiles) {
    if (!proj.active) continue;
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.ttlFrames -= 1;

    if (
      proj.ttlFrames <= 0 ||
      proj.x < STAGE_LEFT - 120 ||
      proj.x > STAGE_RIGHT + 120 ||
      proj.y > GROUND_Y + 40
    ) {
      proj.active = false;
      continue;
    }

    const defender = state.fighters[proj.ownerIndex === 0 ? 1 : 0];
    const attacker = state.fighters[proj.ownerIndex];
    const projBox: Box = {
      x: proj.x - proj.radius,
      y: proj.y - proj.radius,
      w: proj.radius * 2,
      h: proj.radius * 2,
    };

    if (boxesOverlap(projBox, defender.hurtbox)) {
      proj.active = false;
      applyHit(
        state,
        attacker,
        defender,
        proj.damage,
        28,
        16,
        proj.knockbackX,
        proj.knockbackY,
        false,
        true,
        true
      );
    }
  }

  state.projectiles = state.projectiles.filter((p) => p.active);
}

function finishRound(state: MatchState, winnerIndex: 0 | 1 | 'draw'): void {
  state.phase = 'round_over';
  state.phaseFrames = ROUND_OVER_FRAMES;
  state.projectiles = [];
  const [f1, f2] = state.fighters;
  f1.hitbox = null;
  f2.hitbox = null;

  if (winnerIndex === 0) {
    f1.roundsWon += 1;
    f1.action = 'victory';
    f2.action = 'defeat';
    state.events.push({
      type: 'ko',
      playerIndex: 0,
      characterId: f1.characterId,
      label: f2.hp <= 0 ? 'K.O.!' : 'TIME OVER!',
    });
    state.events.push({ type: 'voice', playerIndex: 0, characterId: f1.characterId, voiceSlot: 'win' });
    state.events.push({ type: 'voice', playerIndex: 1, characterId: f2.characterId, voiceSlot: 'lose' });
  } else if (winnerIndex === 1) {
    f2.roundsWon += 1;
    f2.action = 'victory';
    f1.action = 'defeat';
    state.events.push({
      type: 'ko',
      playerIndex: 1,
      characterId: f2.characterId,
      label: f1.hp <= 0 ? 'K.O.!' : 'TIME OVER!',
    });
    state.events.push({ type: 'voice', playerIndex: 1, characterId: f2.characterId, voiceSlot: 'win' });
    state.events.push({ type: 'voice', playerIndex: 0, characterId: f1.characterId, voiceSlot: 'lose' });
  } else {
    f1.action = 'defeat';
    f2.action = 'defeat';
    state.events.push({ type: 'ko', label: 'DOUBLE K.O.!' });
  }
}

export function stepMatchState(
  state: MatchState,
  input1: InputState,
  input2: InputState
): MatchState {
  state.tick += 1;
  state.events = [];

  if (state.specialBanner) {
    state.specialBanner.framesLeft -= 1;
    if (state.specialBanner.framesLeft <= 0) {
      state.specialBanner = null;
    }
  }

  if (state.hitstopFrames > 0) {
    state.hitstopFrames -= 1;
    return state;
  }

  const [f1, f2] = state.fighters;

  if (state.phase === 'intro') {
    if (state.phaseFrames === INTRO_FRAMES) {
      state.events.push({
        type: 'voice',
        playerIndex: 0,
        characterId: f1.characterId,
        voiceSlot: 'intro',
      });
    } else if (state.phaseFrames === Math.floor(INTRO_FRAMES * 0.45)) {
      state.events.push({
        type: 'voice',
        playerIndex: 1,
        characterId: f2.characterId,
        voiceSlot: 'intro',
      });
    }
    f1.action = 'intro';
    f2.action = 'intro';
    f1.actionFrame += 1;
    f2.actionFrame += 1;
    state.phaseFrames -= 1;
    if (state.phaseFrames <= 0) {
      state.phase = 'countdown';
      state.phaseFrames = COUNTDOWN_FRAMES;
      state.countdownSeconds = 3;
      f1.action = 'idle';
      f2.action = 'idle';
    }
    return state;
  }

  if (state.phase === 'countdown') {
    f1.actionFrame += 1;
    f2.actionFrame += 1;
    state.phaseFrames -= 1;
    state.countdownSeconds = Math.max(0, Math.ceil(state.phaseFrames / 40));
    if (state.phaseFrames <= 0) {
      state.phase = 'fighting';
      state.timerFrames = ROUND_TIME_FRAMES;
      state.events.push({ type: 'round_start', label: `ROUND ${state.round} - FIGHT!` });
    }
    return state;
  }

  if (state.phase === 'round_over') {
    f1.actionFrame += 1;
    f2.actionFrame += 1;
    for (const f of [f1, f2]) {
      if (!f.grounded) {
        f.vy += GRAVITY;
        f.y = Math.min(GROUND_Y, f.y + f.vy);
        if (f.y >= GROUND_Y) {
          f.y = GROUND_Y;
          f.vy = 0;
          f.grounded = true;
        }
      }
    }
    state.phaseFrames -= 1;
    if (state.phaseFrames <= 0) {
      if (f1.roundsWon >= ROUNDS_TO_WIN || f2.roundsWon >= ROUNDS_TO_WIN) {
        state.phase = 'match_over';
        state.winnerIndex =
          f1.roundsWon > f2.roundsWon ? 0 : f2.roundsWon > f1.roundsWon ? 1 : 'draw';
      } else {
        state.round += 1;
        resetFighterForRound(f1);
        resetFighterForRound(f2);
        state.phase = 'countdown';
        state.phaseFrames = COUNTDOWN_FRAMES;
        state.countdownSeconds = 3;
      }
    }
    return state;
  }

  if (state.phase === 'match_over') {
    f1.actionFrame += 1;
    f2.actionFrame += 1;
    return state;
  }

  // Fighting phase
  if (state.timerFrames > 0) {
    state.timerFrames -= 1;
  }

  updateFighterControlsAndPhysics(state, f1, f2, input1);
  updateFighterControlsAndPhysics(state, f2, f1, input2);
  resolvePushbox(f1, f2);
  resolveCombatCollisions(state);

  // Check KO or Timeout
  if (f1.hp <= 0 && f2.hp <= 0) {
    finishRound(state, 'draw');
  } else if (f1.hp <= 0) {
    finishRound(state, 1);
  } else if (f2.hp <= 0) {
    finishRound(state, 0);
  } else if (state.timerFrames <= 0) {
    const p1Pct = f1.hp / f1.maxHp;
    const p2Pct = f2.hp / f2.maxHp;
    if (Math.abs(p1Pct - p2Pct) < 0.001) {
      finishRound(state, 'draw');
    } else {
      finishRound(state, p1Pct > p2Pct ? 0 : 1);
    }
  }

  return state;
}
