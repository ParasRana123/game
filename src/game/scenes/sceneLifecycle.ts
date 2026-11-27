import { ArenaId, CharacterId, Difficulty, GameMode, MatchState } from '@shared/types';

export interface FightSceneConfig {
  mode: GameMode;
  p1Char: CharacterId;
  p2Char: CharacterId;
  arenaId: ArenaId;
  difficulty: Difficulty;
  isBossFight: boolean;
  localSlot?: 0 | 1;
  initialMatchState?: MatchState;
  onHudUpdate: (state: MatchState) => void;
  onMatchEnd: (state: MatchState, durationSec: number) => void;
}

/**
 * Pure lifecycle guard for FightScene config and pause state so React effects
 * firing before Phaser's SceneManager boots never throw on undefined config.
 */
export class SceneLifecycleController {
  private cfg: FightSceneConfig | null = null;
  private paused = false;

  constructor(initialConfig?: FightSceneConfig) {
    if (initialConfig && 'mode' in initialConfig) {
      this.cfg = initialConfig;
    }
  }

  applyInitData(data?: Partial<FightSceneConfig> | null): void {
    if (data && typeof data === 'object' && 'mode' in data && data.mode) {
      this.cfg = data as FightSceneConfig;
    }
    if (this.cfg?.mode === 'online') {
      this.paused = false;
    }
  }

  getConfig(): FightSceneConfig | null {
    return this.cfg;
  }

  setPaused(paused: boolean): boolean {
    if (this.cfg?.mode === 'online') {
      this.paused = false;
      return this.paused;
    }
    this.paused = Boolean(paused);
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }
}
