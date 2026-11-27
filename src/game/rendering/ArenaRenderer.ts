import Phaser from 'phaser';
import { ARENAS } from '@shared/arenas';
import { ArenaId } from '@shared/types';
import { GROUND_Y, STAGE_HEIGHT, STAGE_LEFT, STAGE_RIGHT, STAGE_WIDTH } from '@shared/combat/constants';

export class ArenaRenderer {
  private bgLayer: Phaser.GameObjects.Graphics;
  private animLayer: Phaser.GameObjects.Graphics;
  private floorLayer: Phaser.GameObjects.Graphics;
  private lights: Phaser.GameObjects.Graphics;
  private floatingItems: Array<{ x: number; y: number; vx: number; vy: number; rot: number; color: number }> = [];
  private rickshawX = -120;
  private chopperX = 950;

  constructor(private scene: Phaser.Scene, private arenaId: ArenaId) {
    this.bgLayer = scene.add.graphics().setDepth(0);
    this.animLayer = scene.add.graphics().setDepth(2);
    this.lights = scene.add.graphics().setDepth(3);
    this.floorLayer = scene.add.graphics().setDepth(5);

    for (let i = 0; i < 16; i++) {
      this.floatingItems.push({
        x: Math.random() * STAGE_WIDTH,
        y: 80 + Math.random() * 380,
        vx: (Math.random() - 0.5) * 0.9,
        vy: 0.25 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        color: [0xfacc15, 0xf97316, 0x22c55e, 0x38bdf8, 0xf8fafc][i % 5],
      });
    }

    this.drawStaticBackdrop();
    this.drawFloor();
  }

  private drawStaticBackdrop(): void {
    const def = ARENAS[this.arenaId];
    const g = this.bgLayer;
    g.clear();

    const topCol = Phaser.Display.Color.HexStringToColor(def.skyTop).color;
    const botCol = Phaser.Display.Color.HexStringToColor(def.skyBottom).color;
    g.fillGradientStyle(topCol, topCol, botCol, botCol, 1);
    g.fillRect(0, 0, STAGE_WIDTH, GROUND_Y);

    if (this.arenaId === 'parliament') {
      // Grand rotunda dome & red sandstone arches
      g.fillStyle(0x451a14, 0.95);
      g.fillRect(0, 120, STAGE_WIDTH, GROUND_Y - 120);

      // Dome ceiling rays
      g.fillStyle(0x7c2d12, 0.4);
      g.fillEllipse(STAGE_WIDTH / 2, 110, 1120, 260);

      // Sandstone pillars
      for (let x = 80; x <= STAGE_WIDTH - 80; x += 186) {
        g.fillStyle(0x9a3412, 1);
        g.fillRect(x - 24, 130, 48, GROUND_Y - 130);
        g.fillStyle(0xc2410c, 0.7);
        g.fillRect(x - 16, 130, 12, GROUND_Y - 130);
        // Arch capital
        g.fillStyle(0xd97706, 0.9);
        g.fillRect(x - 32, 122, 64, 18);
      }

      // Speaker's podium + golden emblem in center
      g.fillStyle(0x78350f, 1);
      g.fillRoundedRect(STAGE_WIDTH / 2 - 140, 390, 280, GROUND_Y - 390, 8);
      g.lineStyle(4, 0xf59e0b, 0.9);
      g.strokeCircle(STAGE_WIDTH / 2, 270, 56);
      g.fillStyle(0xf59e0b, 0.25);
      g.fillCircle(STAGE_WIDTH / 2, 270, 52);
      // Chakra spokes
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        g.lineBetween(
          STAGE_WIDTH / 2,
          270,
          STAGE_WIDTH / 2 + Math.cos(ang) * 44,
          270 + Math.sin(ang) * 44
        );
      }
    } else if (this.arenaId === 'jantar_mantar') {
      // Sunset glow
      g.fillStyle(0xf97316, 0.28);
      g.fillCircle(980, 220, 120);
      g.fillStyle(0xfde047, 0.45);
      g.fillCircle(980, 220, 62);

      // Terracotta Samrat Yantra sundial ramp
      g.fillStyle(0xb45309, 1);
      g.fillTriangle(180, GROUND_Y, 540, 220, 580, GROUND_Y);
      g.fillStyle(0xd97706, 1);
      g.fillRect(540, 220, 48, GROUND_Y - 220);

      // Observatory arches
      for (let i = 0; i < 4; i++) {
        const bx = 660 + i * 145;
        g.fillStyle(0x9a3412, 0.95);
        g.fillRect(bx, 340, 115, GROUND_Y - 340);
        g.fillStyle(0x451a03, 0.9);
        g.fillRoundedRect(bx + 22, 375, 70, 140, { tl: 35, tr: 35, bl: 0, br: 0 });
      }

      // Protest tents
      g.fillStyle(0xe11d48, 0.9);
      g.fillTriangle(80, 460, 260, 460, 170, 395);
      g.fillStyle(0xfef3c7, 0.9);
      g.fillRect(92, 460, 156, GROUND_Y - 460);
    } else if (this.arenaId === 'indian_street') {
      // Old Delhi skyline buildings
      const buildings = [
        { x: 30, w: 185, h: 340, c: 0x312e81 },
        { x: 225, w: 210, h: 390, c: 0x3730a3 },
        { x: 445, w: 195, h: 320, c: 0x4c1d95 },
        { x: 650, w: 220, h: 410, c: 0x3b0764 },
        { x: 880, w: 190, h: 350, c: 0x1e1b4b },
        { x: 1080, w: 185, h: 380, c: 0x312e81 },
      ];
      for (const b of buildings) {
        g.fillStyle(b.c, 1);
        g.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
        // Glowing windows
        g.fillStyle(0xfef08a, 0.72);
        for (let wy = GROUND_Y - b.h + 34; wy < GROUND_Y - 140; wy += 52) {
          for (let wx = b.x + 22; wx < b.x + b.w - 36; wx += 48) {
            g.fillRect(wx, wy, 24, 30);
          }
        }
      }
      // Neon shop signs
      g.lineStyle(3, 0x22c55e, 0.95);
      g.fillStyle(0x052e16, 0.9);
      g.fillRoundedRect(120, 380, 210, 56, 8);
      g.strokeRoundedRect(120, 380, 210, 56, 8);

      g.lineStyle(3, 0xfacc15, 0.95);
      g.fillStyle(0x422006, 0.9);
      g.fillRoundedRect(870, 360, 240, 58, 8);
      g.strokeRoundedRect(870, 360, 240, 58, 8);

      // Chai stall counter
      g.fillStyle(0x78350f, 1);
      g.fillRect(510, 485, 190, GROUND_Y - 485);
      g.fillStyle(0xd97706, 1);
      g.fillRect(496, 474, 218, 16);
    } else {
      // Rally Stage at night
      // Stars
      g.fillStyle(0xe2e8f0, 0.75);
      for (let i = 0; i < 45; i++) {
        g.fillCircle(((i * 197) % STAGE_WIDTH), ((i * 89) % 280) + 18, (i % 3) + 1);
      }
      // Giant LED Truss Frame
      g.lineStyle(6, 0x334155, 1);
      g.strokeRect(240, 150, 800, 320);
      g.fillStyle(0x0f172a, 0.92);
      g.fillRect(244, 154, 792, 312);
      // Glowing LED equalizer bars
      for (let bx = 270; bx < 1010; bx += 42) {
        const bh = 80 + ((bx * 17) % 160);
        g.fillStyle(bx % 84 === 0 ? 0xf97316 : 0x38bdf8, 0.35);
        g.fillRect(bx, 456 - bh, 26, bh);
      }
    }
  }

  private drawFloor(): void {
    const def = ARENAS[this.arenaId];
    const g = this.floorLayer;
    g.clear();

    const floorCol = Phaser.Display.Color.HexStringToColor(def.floorColor).color;
    const trimCol = Phaser.Display.Color.HexStringToColor(def.trimColor).color;

    // Main stage floor
    g.fillStyle(floorCol, 1);
    g.fillRect(0, GROUND_Y, STAGE_WIDTH, STAGE_HEIGHT - GROUND_Y);

    // Top trim strip & arena boundary markers
    g.fillStyle(trimCol, 1);
    g.fillRect(0, GROUND_Y, STAGE_WIDTH, 7);

    // Subtle perspective grid lines on floor
    g.lineStyle(2, 0xffffff, 0.08);
    for (let x = 0; x <= STAGE_WIDTH; x += 80) {
      g.lineBetween(x, GROUND_Y + 7, (x - STAGE_WIDTH / 2) * 1.45 + STAGE_WIDTH / 2, STAGE_HEIGHT);
    }

    // Corner boundary posts
    g.fillStyle(trimCol, 0.75);
    g.fillRect(STAGE_LEFT - 14, GROUND_Y - 12, 8, 12);
    g.fillRect(STAGE_RIGHT + 6, GROUND_Y - 12, 8, 12);
  }

  update(timeSec: number, specialActive: boolean, isBossFight: boolean): void {
    const g = this.animLayer;
    const lg = this.lights;
    g.clear();
    lg.clear();

    // Animate arena-specific elements
    if (this.arenaId === 'parliament') {
      // Animated MP crowd silhouettes bobbing in gallery with colorful kurtas/waistcoats
      const mpColors = [0xf8fafc, 0xf97316, 0x0284c7, 0x16a34a, 0xe2e8f0];
      for (let i = 0; i < 18; i++) {
        const cx = 110 + i * 62;
        const bob = Math.sin(timeSec * 5 + i * 1.3) * 5;
        g.fillStyle(0x8d5524, 0.85);
        g.fillCircle(cx, 540 + bob, 13);
        g.fillStyle(mpColors[i % mpColors.length], 0.55);
        g.fillRoundedRect(cx - 16, 554 + bob, 32, 48, 7);
        if (i % 3 === 0) {
          // Waving placard
          g.fillStyle(0xfef3c7, 0.9);
          g.fillRect(cx + 8, 505 + bob, 26, 18);
        }
      }
      // Drifting paper bills
      for (const item of this.floatingItems) {
        item.x += item.vx + Math.sin(timeSec * 2 + item.y) * 0.4;
        item.y += item.vy;
        if (item.y > GROUND_Y - 20) {
          item.y = 90;
          item.x = Math.random() * STAGE_WIDTH;
        }
        g.fillStyle(0xfefce8, 0.55);
        g.fillRect(item.x, item.y, 14, 9);
      }
    } else if (this.arenaId === 'jantar_mantar') {
      // Pulsing megaphone sound waves
      const pulse = (timeSec * 1.8) % 1;
      lg.lineStyle(3, 0xfbbf24, (1 - pulse) * 0.65);
      lg.strokeCircle(170, 390, 20 + pulse * 85);
      lg.strokeCircle(1100, 420, 15 + ((pulse + 0.5) % 1) * 75);

      // Waving flags
      for (let i = 0; i < 6; i++) {
        const fx = 280 + i * 145;
        const wave = Math.sin(timeSec * 4 + i) * 7;
        g.lineStyle(3, 0xe2e8f0, 0.8);
        g.lineBetween(fx, GROUND_Y, fx, 500);
        g.fillStyle(i % 2 === 0 ? 0xf97316 : 0x22c55e, 0.85);
        g.fillTriangle(fx, 502, fx + 44, 514 + wave, fx, 532);
      }
    } else if (this.arenaId === 'indian_street') {
      // Overhead marigold garlands swaying
      g.lineStyle(2, 0x0f172a, 0.9);
      g.lineBetween(0, 160, STAGE_WIDTH, 190);
      for (let gx = 40; gx < STAGE_WIDTH; gx += 46) {
        const sway = Math.sin(timeSec * 2.5 + gx * 0.02) * 4;
        g.fillStyle(gx % 92 === 0 ? 0xf97316 : 0xfacc15, 0.92);
        g.fillCircle(gx + sway, 172 + (gx / STAGE_WIDTH) * 28, 9);
      }

      // Chai steam rising from kettle
      for (let s = 0; s < 5; s++) {
        const t = ((timeSec * 0.9 + s * 0.2) % 1);
        g.fillStyle(0xffffff, (1 - t) * 0.35);
        g.fillCircle(605 + Math.sin(timeSec * 3 + s) * 10, 468 - t * 65, 8 + t * 14);
      }

      // Auto-rickshaw cruising in background with windshield & headlight glow
      this.rickshawX += 2.1;
      if (this.rickshawX > STAGE_WIDTH + 160) this.rickshawX = -180;
      const rx = this.rickshawX;
      const ry = GROUND_Y - 46 + Math.sin(timeSec * 18) * 1.2;
      g.fillStyle(0x16a34a, 1);
      g.fillRoundedRect(rx, ry - 48, 108, 62, 14);
      g.fillStyle(0xfacc15, 1);
      g.fillRoundedRect(rx + 6, ry - 56, 92, 28, 10);
      g.fillStyle(0x38bdf8, 0.75);
      g.fillRoundedRect(rx + 66, ry - 48, 28, 22, 4);
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(rx + 20, ry + 18, 14);
      g.fillCircle(rx + 88, ry + 18, 14);
      g.fillStyle(0xfef08a, 0.7);
      g.fillCircle(rx + 108, ry - 8, 9);
      lg.fillStyle(0xfef08a, 0.16);
      lg.fillTriangle(rx + 108, ry - 8, rx + 210, ry - 30, rx + 210, ry + 18);
    } else {
      // Sweeping stage spotlights
      for (let i = 0; i < 3; i++) {
        const originX = 280 + i * 360;
        const sweep = Math.sin(timeSec * (1.2 + i * 0.35) + i) * 240;
        lg.fillStyle([0x38bdf8, 0xf97316, 0xfacc15][i], 0.12);
        lg.fillTriangle(originX, 70, originX - 90 + sweep, GROUND_Y, originX + 90 + sweep, GROUND_Y);
      }

      // Hovering helicopter
      this.chopperX = 930 + Math.sin(timeSec * 0.7) * 110;
      const cy = 115 + Math.cos(timeSec * 1.4) * 10;
      g.fillStyle(0x475569, 1);
      g.fillEllipse(this.chopperX, cy, 86, 30);
      g.fillRect(this.chopperX + 36, cy - 6, 48, 8);
      // Spinning rotor
      const rotorW = 60 + Math.sin(timeSec * 36) * 55;
      g.lineStyle(3, 0xe2e8f0, 0.85);
      g.lineBetween(this.chopperX - rotorW, cy - 22, this.chopperX + rotorW, cy - 22);

      // Confetti
      for (const item of this.floatingItems) {
        item.x += Math.sin(timeSec * 3 + item.rot) * 0.8;
        item.y += item.vy * 1.5;
        if (item.y > GROUND_Y - 10) {
          item.y = 140;
          item.x = Math.random() * STAGE_WIDTH;
        }
        g.fillStyle(item.color, 0.75);
        g.fillRect(item.x, item.y, 7, 7);
      }
    }

    // Special Attack / Boss Dramatic Lighting Overlay
    if (specialActive) {
      lg.fillStyle(0x020617, 0.42);
      lg.fillRect(0, 0, STAGE_WIDTH, GROUND_Y);
    } else if (isBossFight) {
      lg.fillStyle(0x7f1d1d, 0.1 + Math.sin(timeSec * 4) * 0.04);
      lg.fillRect(0, 0, STAGE_WIDTH, GROUND_Y);
    }
  }
}
