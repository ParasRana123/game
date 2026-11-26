import { Difficulty, FighterState, InputState, MatchState } from '../types.js';
import { emptyInput } from './engine.js';
import { SPECIAL_COST, STAGE_LEFT, STAGE_RIGHT } from './constants.js';

export interface AIStateMemory {
  decisionCooldown: number;
  currentIntent: 'approach' | 'retreat' | 'block' | 'attack' | 'jump_in' | 'dodge';
  comboStage: number;
}

export function createAIMemory(): AIStateMemory {
  return {
    decisionCooldown: 0,
    currentIntent: 'approach',
    comboStage: 0,
  };
}

function deterministicRoll(tick: number, salt: number): number {
  const x = Math.sin((tick + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function computeAIInput(
  state: MatchState,
  aiIndex: 0 | 1,
  difficulty: Difficulty,
  memory: AIStateMemory,
  isBoss = false
): InputState {
  const input = emptyInput();
  if (state.phase !== 'fighting') return input;

  const ai: FighterState = state.fighters[aiIndex];
  const target: FighterState = state.fighters[aiIndex === 0 ? 1 : 0];
  const dx = target.x - ai.x;
  const dist = Math.abs(dx);
  const towardLeft = dx < 0;

  const reactionRate =
    difficulty === 'easy' ? 0.25 : difficulty === 'medium' ? 0.58 : isBoss ? 0.88 : 0.78;
  const aggression =
    difficulty === 'easy' ? 0.28 : difficulty === 'medium' ? 0.56 : isBoss ? 0.84 : 0.76;

  // React to incoming projectiles or active melee attacks
  const incomingProjectile = state.projectiles.find(
    (p) => p.ownerIndex !== aiIndex && Math.abs(p.x - ai.x) < 230
  );
  const targetAttacking =
    target.action === 'punch' ||
    target.action === 'kick' ||
    target.action === 'uppercut' ||
    target.action === 'special';

  const roll = deterministicRoll(state.tick, aiIndex + 7);
  const roll2 = deterministicRoll(state.tick, aiIndex + 31);

  if (incomingProjectile && ai.grounded) {
    if (roll < reactionRate * 0.6) {
      input.up = true; // Jump over projectile!
      return input;
    } else if (roll < reactionRate) {
      input.block = true;
      return input;
    }
  }

  if (targetAttacking && dist < 145 && roll < reactionRate * 0.75) {
    input.block = true;
    return input;
  }

  // Combo continuation if AI already landed a hit
  if (ai.moveHitConnected && (ai.movePhase === 'active' || ai.movePhase === 'recovery')) {
    if (ai.action === 'punch' && roll < aggression) {
      input.kick = true;
      return input;
    }
    if (ai.action === 'kick' && roll < aggression * 0.85) {
      if (ai.meter >= SPECIAL_COST) {
        input.special = true;
      } else {
        input.punch = true; // Chains into uppercut
      }
      return input;
    }
  }

  // Use special attack when meter is full and opponent is in range or mid-screen
  if (ai.meter >= SPECIAL_COST && dist < 440 && roll < aggression * 0.14) {
    input.special = true;
    return input;
  }

  if (memory.decisionCooldown > 0) {
    memory.decisionCooldown -= 1;
  } else {
    memory.decisionCooldown = difficulty === 'easy' ? 24 : difficulty === 'medium' ? 14 : 9;
    if (dist > 155) {
      memory.currentIntent = roll < 0.18 && dist < 320 ? 'jump_in' : 'approach';
    } else if (dist < 76 && target.blocking && roll < reactionRate * 0.48) {
      memory.currentIntent = 'attack';
    } else if (ai.hp < ai.maxHp * 0.3 && roll < 0.25 && ai.x > STAGE_LEFT + 140 && ai.x < STAGE_RIGHT - 140) {
      memory.currentIntent = 'dodge';
    } else if (roll2 < aggression) {
      memory.currentIntent = 'attack';
    } else {
      memory.currentIntent = 'retreat';
    }
  }

  // Execute intent
  if (memory.currentIntent === 'approach' || memory.currentIntent === 'jump_in') {
    if (towardLeft) input.left = true;
    else input.right = true;
    if (dist > 260 && difficulty !== 'easy') input.sprint = true;
    if (memory.currentIntent === 'jump_in' && ai.grounded && dist < 260) {
      input.up = true;
    }
    if (!ai.grounded && dist < 130 && roll < aggression) {
      input.kick = true;
    }
  } else if (memory.currentIntent === 'retreat' || memory.currentIntent === 'dodge') {
    if (towardLeft) input.right = true;
    else input.left = true;
    if (memory.currentIntent === 'dodge') input.sprint = true;
  } else if (memory.currentIntent === 'attack') {
    if (dist > 115) {
      if (towardLeft) input.left = true;
      else input.right = true;
    } else {
      // Choose attack mix: grab beats blocking!
      if (target.blocking && dist < 85 && roll < reactionRate * 0.65) {
        input.grab = true;
      } else if (!target.grounded && dist < 120 && roll < reactionRate) {
        input.up = true;
        input.punch = true; // Anti-air uppercut
      } else if (roll2 < 0.45) {
        input.punch = true;
      } else if (roll2 < 0.8) {
        input.kick = true;
      } else {
        input.up = true;
        input.punch = true;
      }
    }
  }

  return input;
}
