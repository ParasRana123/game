import Phaser from 'phaser';
import {
  ArenaId,
  CharacterId,
  CombatEvent,
  Difficulty,
  GameMode,
  InputState,
  MatchState,
} from '@shared/types';
import { FIXED_DT, GROUND_Y, STAGE_HEIGHT, STAGE_WIDTH } from '@shared/combat/constants';
import { createMatchState, emptyInput, stepMatchState } from '@shared/combat/engine';
import { AIStateMemory, computeAIInput, createAIMemory } from '@shared/combat/ai';
import { AudioManager } from '@/audio/AudioManager';
import { SocketClient } from '@/network/SocketClient';
import { ArenaRenderer } from '../rendering/ArenaRenderer';
import { drawProjectile, FighterRenderer } from '../rendering/FighterRenderer';
import { FightSceneConfig, SceneLifecycleController } from './sceneLifecycle';

export type { FightSceneConfig };

interface FloatingText {
  obj: Phaser.GameObjects.Text;
  vy: number;
  life: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export class FightScene extends Phaser.Scene {
  private lifecycle: SceneLifecycleController;
  private cfg!: FightSceneConfig;
  private matchState!: MatchState;
  private arenaRenderer!: ArenaRenderer;
  private fighterRenderers!: [FighterRenderer, FighterRenderer];
  private projectileGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private debugGfx!: Phaser.GameObjects.Graphics;

  private accumulator = 0;
  private showHitboxes = false;
  private matchEndedSent = false;
  private startedAtMs = 0;
  private lastCountdownVal = -1;

  private aiMemory: AIStateMemory = createAIMemory();
  private touchInputs: [InputState, InputState] = [emptyInput(), emptyInput()];

  private keys!: {
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    f: Phaser.Input.Keyboard.Key;
    g: Phaser.Input.Keyboard.Key;
    h: Phaser.Input.Keyboard.Key;
    r: Phaser.Input.Keyboard.Key;
    t: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    rshift: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    l: Phaser.Input.Keyboard.Key;
    u: Phaser.Input.Keyboard.Key;
    i: Phaser.Input.Keyboard.Key;
    f9: Phaser.Input.Keyboard.Key;
  };

  private floatingTexts: FloatingText[] = [];
  private sparks: SparkParticle[] = [];
  private inputSeq = 0;
  private serverTargetState: MatchState | null = null;
  private socketBound = false;

  constructor(initialConfig?: FightSceneConfig) {
    super('FightScene');
    this.lifecycle = new SceneLifecycleController(initialConfig);
    const cfg = this.lifecycle.getConfig();
    if (cfg) {
      this.cfg = cfg;
    }
  }

  init(data?: FightSceneConfig): void {
    this.lifecycle.applyInitData(data);
    const cfg = this.lifecycle.getConfig();
    if (cfg) {
      this.cfg = cfg;
    }
    this.matchEndedSent = false;
    this.accumulator = 0;
    this.startedAtMs = performance.now();
    this.lastCountdownVal = -1;
    this.aiMemory = createAIMemory();
    this.floatingTexts = [];
    this.sparks = [];
    this.serverTargetState = null;
  }

  preload(): void {
    // Models are loaded asynchronously as 3D GLB rigs by ThreeFightCanvas
  }

  create(): void {
    if (!this.cfg) return;
    this.cameras.main.setBounds(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    this.matchState =
      this.cfg.initialMatchState
        ? structuredClone(this.cfg.initialMatchState)
        : createMatchState(
            this.cfg.p1Char,
            this.cfg.p2Char,
            this.cfg.arenaId,
            this.cfg.isBossFight
          );

    this.arenaRenderer = new ArenaRenderer(this, this.matchState.arenaId);
    this.fighterRenderers = [
      new FighterRenderer(this, this.matchState.fighters[0]),
      new FighterRenderer(this, this.matchState.fighters[1]),
    ];
    // 3D GLB fighter bodies are rendered by ThreeFightCanvas; keep Phaser FX & nameplates
    this.fighterRenderers[0].setBodyVisible(false);
    this.fighterRenderers[1].setBodyVisible(false);

    this.projectileGfx = this.add.graphics().setDepth(16);
    this.fxGfx = this.add.graphics().setDepth(22);
    this.debugGfx = this.add.graphics().setDepth(30);

    this.setupKeyboard();
    void AudioManager.preloadCharacter(this.cfg.p1Char);
    void AudioManager.preloadCharacter(this.cfg.p2Char);
    void AudioManager.playBgm(this.cfg.isBossFight ? 'bgm_boss' : 'bgm_fight');

    if (this.cfg.mode === 'online') {
      this.bindOnlineListeners();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.cfg.onHudUpdate(structuredClone(this.matchState));
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard!;
    this.keys = {
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      f: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      g: kb.addKey(Phaser.Input.Keyboard.KeyCodes.G),
      h: kb.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      r: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      t: kb.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      rshift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO),
      j: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      k: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      l: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      u: kb.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      i: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      f9: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F9),
    };
  }

  private bindOnlineListeners(): void {
    const socket = SocketClient.getSocket();
    if (!socket || this.socketBound) return;
    this.socketBound = true;

    socket.on('match:state', this.handleServerState);
    socket.on('match:ended', this.handleServerEnded);
  }

  private handleServerState = (snapshot: MatchState): void => {
    this.serverTargetState = snapshot;
    if (snapshot.events && snapshot.events.length > 0) {
      this.processEvents(snapshot.events);
    }
    this.matchState = structuredClone(snapshot);
    this.cfg.onHudUpdate(structuredClone(this.matchState));
  };

  private handleServerEnded = (payload: { matchState: MatchState }): void => {
    this.matchState = structuredClone(payload.matchState);
    this.cfg.onHudUpdate(structuredClone(this.matchState));
    if (!this.matchEndedSent) {
      this.matchEndedSent = true;
      const durationSec = Math.max(1, Math.round((performance.now() - this.startedAtMs) / 1000));
      this.cfg.onMatchEnd(structuredClone(this.matchState), durationSec);
    }
  };

  setPaused(paused: boolean): void {
    this.lifecycle.setPaused(paused);
  }

  isPaused(): boolean {
    return this.lifecycle.isPaused();
  }

  setTouchInput(slot: 0 | 1, patch: Partial<InputState>): void {
    this.touchInputs[slot] = { ...this.touchInputs[slot], ...patch };
  }

  private readPlayerInput(slot: 0 | 1): InputState {
    const t = this.touchInputs[slot];
    if (slot === 0) {
      // In single-player / online, allow either WASD or Arrow keys for movement convenience if local_2p is off
      const allowArrows = this.cfg.mode !== 'local_2p';
      return {
        left: this.keys.a.isDown || (allowArrows && this.keys.left.isDown) || t.left,
        right: this.keys.d.isDown || (allowArrows && this.keys.right.isDown) || t.right,
        up: this.keys.w.isDown || (allowArrows && this.keys.up.isDown) || t.up,
        down: this.keys.s.isDown || (allowArrows && this.keys.down.isDown) || t.down,
        sprint: this.keys.shift.isDown || t.sprint,
        punch: this.keys.f.isDown || (allowArrows && this.keys.j.isDown) || t.punch,
        kick: this.keys.g.isDown || (allowArrows && this.keys.k.isDown) || t.kick,
        block: this.keys.h.isDown || (allowArrows && this.keys.l.isDown) || t.block,
        grab: this.keys.r.isDown || (allowArrows && this.keys.u.isDown) || t.grab,
        special: this.keys.t.isDown || (allowArrows && this.keys.i.isDown) || t.special,
      };
    }
    return {
      left: this.keys.left.isDown || t.left,
      right: this.keys.right.isDown || t.right,
      up: this.keys.up.isDown || t.up,
      down: this.keys.down.isDown || t.down,
      sprint: this.keys.rshift.isDown || t.sprint,
      punch: this.keys.j.isDown || t.punch,
      kick: this.keys.k.isDown || t.kick,
      block: this.keys.l.isDown || t.block,
      grab: this.keys.u.isDown || t.grab,
      special: this.keys.i.isDown || t.special,
    };
  }

  update(time: number, delta: number): void {
    if (!this.cfg || !this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.f9)) {
      this.showHitboxes = !this.showHitboxes;
    }

    const timeSec = time / 1000;

    if (!this.lifecycle.isPaused()) {
      const clampedDelta = Math.min(delta / 1000, 0.08);
      this.accumulator += clampedDelta;

      while (this.accumulator >= FIXED_DT) {
        this.accumulator -= FIXED_DT;
        this.fixedStep();
      }
    }

    this.arenaRenderer.update(
      timeSec,
      Boolean(this.matchState.specialBanner),
      this.matchState.isBossFight
    );

    const lerp = this.cfg.mode === 'online' ? 0.38 : 0.72;
    this.fighterRenderers[0].update(this.matchState.fighters[0], timeSec, GROUND_Y, lerp);
    this.fighterRenderers[1].update(this.matchState.fighters[1], timeSec, GROUND_Y, lerp);
    this.cfg.onFrameSync?.(this.matchState);

    this.renderProjectiles(timeSec);
    this.renderParticles(clampedStepDelta(delta));
    this.renderDebugBoxes();
  }

  private fixedStep(): void {
    if (this.cfg.mode === 'online') {
      const slot = this.cfg.localSlot ?? 0;
      const localInput = this.readPlayerInput(0); // Read unified local controls
      localInput.seq = ++this.inputSeq;
      SocketClient.sendInput(localInput);

      // Client-side prediction for local movement responsiveness between server snapshots
      if (this.matchState.phase === 'fighting') {
        const oppInput = this.matchState.fighters[slot === 0 ? 1 : 0].lastInput || emptyInput();
        if (slot === 0) {
          stepMatchState(this.matchState, localInput, oppInput);
        } else {
          stepMatchState(this.matchState, oppInput, localInput);
        }
      }
      return;
    }

    const in1 = this.readPlayerInput(0);
    const in2 =
      this.cfg.mode === 'local_2p'
        ? this.readPlayerInput(1)
        : computeAIInput(
            this.matchState,
            1,
            this.cfg.difficulty,
            this.aiMemory,
            this.cfg.isBossFight
          );

    const prevPhase = this.matchState.phase;
    stepMatchState(this.matchState, in1, in2);

    if (this.matchState.phase === 'countdown') {
      if (this.matchState.countdownSeconds !== this.lastCountdownVal && this.matchState.countdownSeconds > 0) {
        this.lastCountdownVal = this.matchState.countdownSeconds;
        void AudioManager.playSfx('countdown');
      }
    } else if (prevPhase === 'countdown' && this.matchState.phase === 'fighting') {
      this.lastCountdownVal = -1;
      void AudioManager.playSfx('fight');
    }

    if (this.matchState.events.length > 0) {
      this.processEvents(this.matchState.events);
    }

    if (this.matchState.tick % 2 === 0 || this.matchState.events.length > 0 || this.matchState.phase === 'match_over') {
      this.cfg.onHudUpdate(structuredClone(this.matchState));
    }

    if (this.matchState.phase === 'match_over' && !this.matchEndedSent) {
      this.matchEndedSent = true;
      const durationSec = Math.max(1, Math.round((performance.now() - this.startedAtMs) / 1000));
      this.cfg.onMatchEnd(structuredClone(this.matchState), durationSec);
    }
  }

  private processEvents(events: CombatEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'voice' && ev.characterId && ev.voiceSlot) {
        void AudioManager.playVoice(
          ev.characterId,
          ev.voiceSlot,
          `p${ev.playerIndex ?? 0}`
        );
      } else if (ev.type === 'hit') {
        void AudioManager.playSfx(ev.damage && ev.damage >= 80 ? 'kick' : 'punch');
        this.spawnSparks(ev.x ?? 640, ev.y ?? 480, 0xf97316, 12);
        this.spawnFloatingText(ev.x ?? 640, (ev.y ?? 480) - 24, `-${ev.damage}`, '#fbbf24');
        this.cameras.main.shake(90, 0.004);
      } else if (ev.type === 'crit') {
        void AudioManager.playSfx('crit');
        this.spawnSparks(ev.x ?? 640, ev.y ?? 480, 0xfef08a, 22);
        this.spawnFloatingText(
          ev.x ?? 640,
          (ev.y ?? 480) - 34,
          `${ev.label || 'CRIT!'} -${ev.damage}`,
          '#f43f5e'
        );
        this.cameras.main.shake(150, 0.0085);
      } else if (ev.type === 'grab') {
        void AudioManager.playSfx('grab');
        this.spawnSparks(ev.x ?? 640, ev.y ?? 480, 0x38bdf8, 16);
        this.spawnFloatingText(
          ev.x ?? 640,
          (ev.y ?? 480) - 34,
          `${ev.label || 'THROW!'} -${ev.damage}`,
          '#38bdf8'
        );
        this.cameras.main.shake(140, 0.007);
      } else if (ev.type === 'block') {
        void AudioManager.playSfx('block');
        this.spawnSparks(ev.x ?? 640, ev.y ?? 480, 0x38bdf8, 8);
        this.spawnFloatingText(ev.x ?? 640, (ev.y ?? 480) - 18, 'BLOCKED', '#7dd3fc');
      } else if (ev.type === 'special_activate') {
        this.spawnSparks(ev.x ?? 640, ev.y ?? 480, 0xfacc15, 28);
        this.cameras.main.shake(220, 0.011);
        this.cameras.main.flash(180, 255, 200, 80, false);
      } else if (ev.type === 'ko') {
        void AudioManager.playSfx('ko');
        this.cameras.main.shake(320, 0.014);
      }
    }
  }

  private spawnSparks(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 7;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  }

  private spawnFloatingText(x: number, y: number, label: string, color: string): void {
    const obj = this.add
      .text(x, y, label, {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color,
        stroke: '#09090f',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.floatingTexts.push({ obj, vy: -1.6, life: 45 });
  }

  private renderProjectiles(timeSec: number): void {
    this.projectileGfx.clear();
    for (const p of this.matchState.projectiles) {
      drawProjectile(this.projectileGfx, p, timeSec);
    }
  }

  private renderParticles(dtSec: number): void {
    this.fxGfx.clear();
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.25;
      s.life -= dtSec;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      this.fxGfx.fillStyle(s.color, Math.max(0, s.life / s.maxLife));
      this.fxGfx.fillCircle(s.x, s.y, s.size);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.obj.y += ft.vy;
      ft.life -= 1;
      ft.obj.setAlpha(Math.min(1, ft.life / 18));
      if (ft.life <= 0) {
        ft.obj.destroy();
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private renderDebugBoxes(): void {
    this.debugGfx.clear();
    if (!this.showHitboxes) return;
    for (const f of this.matchState.fighters) {
      this.debugGfx.lineStyle(2, 0x22c55e, 0.9);
      this.debugGfx.strokeRect(f.hurtbox.x, f.hurtbox.y, f.hurtbox.w, f.hurtbox.h);
      if (f.hitbox) {
        this.debugGfx.lineStyle(2, 0xef4444, 0.95);
        this.debugGfx.strokeRect(f.hitbox.x, f.hitbox.y, f.hitbox.w, f.hitbox.h);
      }
    }
  }

  shutdown(): void {
    AudioManager.stopAllVoices();
    const socket = SocketClient.getSocket();
    if (socket && this.socketBound) {
      socket.off('match:state', this.handleServerState);
      socket.off('match:ended', this.handleServerEnded);
      this.socketBound = false;
    }
  }
}

function clampedStepDelta(deltaMs: number): number {
  return Math.min(deltaMs / 1000, 0.05);
}
