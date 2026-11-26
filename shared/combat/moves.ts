import { Box, FighterAction } from '../types.js';

export interface MoveFrameData {
  action: Exclude<
    FighterAction,
    'idle' | 'walk' | 'run' | 'jump' | 'crouch' | 'block' | 'hitstun' | 'knockdown' | 'intro' | 'victory' | 'defeat'
  >;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  knockbackY: number;
  meterGainOnHit: number;
  meterGainOnWhiff: number;
  rangeX: number;
  reachYOffset: number;
  boxW: number;
  boxH: number;
  unblockable?: boolean;
  launches?: boolean;
  lungeVx?: number;
}

export const MOVES: Record<MoveFrameData['action'], MoveFrameData> = {
  punch: {
    action: 'punch',
    startup: 5,
    active: 4,
    recovery: 9,
    damage: 55,
    hitstun: 15,
    blockstun: 8,
    knockbackX: 4.8,
    knockbackY: 0,
    meterGainOnHit: 9,
    meterGainOnWhiff: 2,
    rangeX: 42,
    reachYOffset: -102,
    boxW: 68,
    boxH: 36,
    lungeVx: 1.8,
  },
  kick: {
    action: 'kick',
    startup: 8,
    active: 5,
    recovery: 13,
    damage: 85,
    hitstun: 20,
    blockstun: 11,
    knockbackX: 7.8,
    knockbackY: -2.2,
    meterGainOnHit: 13,
    meterGainOnWhiff: 3,
    rangeX: 48,
    reachYOffset: -74,
    boxW: 78,
    boxH: 42,
    lungeVx: 2.8,
  },
  uppercut: {
    action: 'uppercut',
    startup: 10,
    active: 6,
    recovery: 18,
    damage: 125,
    hitstun: 28,
    blockstun: 14,
    knockbackX: 6.5,
    knockbackY: -11.5,
    meterGainOnHit: 17,
    meterGainOnWhiff: 4,
    rangeX: 38,
    reachYOffset: -136,
    boxW: 66,
    boxH: 82,
    launches: true,
    lungeVx: 3.4,
  },
  grab: {
    action: 'grab',
    startup: 6,
    active: 4,
    recovery: 20,
    damage: 110,
    hitstun: 30,
    blockstun: 0,
    knockbackX: 11.5,
    knockbackY: -8.5,
    meterGainOnHit: 14,
    meterGainOnWhiff: 0,
    rangeX: 34,
    reachYOffset: -110,
    boxW: 54,
    boxH: 64,
    unblockable: true,
    launches: true,
  },
  special: {
    action: 'special',
    startup: 16,
    active: 10,
    recovery: 20,
    damage: 215,
    hitstun: 34,
    blockstun: 18,
    knockbackX: 13.0,
    knockbackY: -10.5,
    meterGainOnHit: 0,
    meterGainOnWhiff: 0,
    rangeX: 46,
    reachYOffset: -124,
    boxW: 88,
    boxH: 76,
    launches: true,
    lungeVx: 5.5,
  },
};

export function getMoveTotalFrames(move: MoveFrameData): number {
  return move.startup + move.active + move.recovery;
}

export function computeAttackHitbox(
  x: number,
  y: number,
  facing: 1 | -1,
  crouching: boolean,
  move: MoveFrameData
): Box {
  const crouchShift = crouching ? 32 : 0;
  const centerOffset = move.rangeX + move.boxW * 0.5;
  const boxCenterX = x + facing * centerOffset;
  return {
    x: boxCenterX - move.boxW * 0.5,
    y: y + move.reachYOffset + crouchShift,
    w: move.boxW,
    h: move.boxH,
  };
}
