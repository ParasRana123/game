import Phaser from 'phaser';
import { CHARACTERS } from '@shared/characters';
import { FighterState, ProjectileState } from '@shared/types';

function hexNum(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class FighterRenderer {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Ellipse;
  private nameTag: Phaser.GameObjects.Text;
  private renderX: number;
  private renderY: number;

  constructor(private scene: Phaser.Scene, initial: FighterState) {
    const def = CHARACTERS[initial.characterId];
    this.renderX = initial.x;
    this.renderY = initial.y;

    this.shadow = scene.add.ellipse(initial.x, 616, 74, 18, 0x000000, 0.45).setDepth(9);
    this.container = scene.add.container(initial.x, initial.y).setDepth(12);
    this.graphics = scene.add.graphics();
    this.nameTag = scene.add
      .text(0, -176, def.name.toUpperCase(), {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#09090f',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.container.add([this.graphics, this.nameTag]);
  }

  update(state: FighterState, timeSec: number, groundY: number, lerpFactor = 0.55): void {
    // Smooth interpolation for crisp 60fps visuals
    this.renderX = Phaser.Math.Linear(this.renderX, state.x, lerpFactor);
    this.renderY = Phaser.Math.Linear(this.renderY, state.y, lerpFactor);
    this.container.setPosition(this.renderX, this.renderY);

    const heightAboveGround = Math.max(0, groundY - this.renderY);
    const shadowScale = Math.max(0.4, 1 - heightAboveGround / 280);
    this.shadow.setPosition(this.renderX, groundY + 5);
    this.shadow.setScale(shadowScale, shadowScale);

    this.drawFighter(state, timeSec);
  }

  private drawFighter(s: FighterState, timeSec: number): void {
    const def = CHARACTERS[s.characterId];
    const g = this.graphics;
    g.clear();

    const dir = s.facing;
    const scale = def.isBoss ? 1.14 : 1.0;
    const skin = hexNum(def.palette.skin);
    const primary = hexNum(def.palette.primary);
    const secondary = hexNum(def.palette.secondary);
    const accent = hexNum(def.palette.accent);
    const hair = hexNum(def.palette.hair);
    const aura = hexNum(def.palette.aura);

    // Aura glow when full meter or special active
    if (s.meter >= 100 || s.action === 'special') {
      const pulse = 0.28 + Math.sin(timeSec * 12) * 0.14;
      g.fillStyle(aura, s.action === 'special' ? 0.45 : pulse);
      g.fillEllipse(0, -78 * scale, 92 * scale, 165 * scale);
      g.lineStyle(3, accent, 0.8);
      g.strokeEllipse(0, -78 * scale, 96 * scale, 170 * scale);
    }

    // Super armor golden outline
    if (s.superArmorFrames > 0) {
      g.lineStyle(4, 0xfacc15, 0.85);
      g.strokeRoundedRect(-38 * scale, -156 * scale, 76 * scale, 156 * scale, 18);
    }

    // Pose kinematics
    let bob = Math.sin(timeSec * 6 + s.playerIndex) * 2.5;
    let torsoLean = 0;
    let crouchFactor = 1.0;
    let frontArmAngle = 0.2;
    let backArmAngle = -0.35;
    let frontLegAngle = 0.1;
    let backLegAngle = -0.1;
    let hitFlash = false;

    switch (s.action) {
      case 'walk':
      case 'run': {
        const freq = s.action === 'run' ? 18 : 11;
        const swing = Math.sin(timeSec * freq) * (s.action === 'run' ? 0.65 : 0.42);
        bob = Math.abs(Math.cos(timeSec * freq)) * -5;
        torsoLean = s.action === 'run' ? 0.16 : 0.06;
        frontLegAngle = swing;
        backLegAngle = -swing;
        frontArmAngle = -swing * 0.8;
        backArmAngle = swing * 0.8;
        break;
      }
      case 'jump':
        bob = 0;
        frontLegAngle = -0.45;
        backLegAngle = 0.35;
        frontArmAngle = -0.7;
        backArmAngle = -0.4;
        break;
      case 'crouch':
        crouchFactor = 0.68;
        bob = 0;
        torsoLean = 0.14;
        break;
      case 'block':
        torsoLean = -0.1;
        frontArmAngle = -1.25;
        backArmAngle = -1.05;
        break;
      case 'punch': {
        const ext = s.movePhase === 'active' ? 1.0 : s.movePhase === 'startup' ? -0.35 : 0.3;
        torsoLean = ext * 0.16;
        frontArmAngle = -1.55 * ext;
        backArmAngle = 0.35;
        break;
      }
      case 'kick': {
        const ext = s.movePhase === 'active' ? 1.0 : s.movePhase === 'startup' ? 0.25 : 0.4;
        torsoLean = -0.18 * ext;
        frontLegAngle = -1.45 * ext;
        backLegAngle = 0.2;
        frontArmAngle = 0.5;
        break;
      }
      case 'uppercut': {
        const ext = s.movePhase === 'active' ? 1.0 : 0.3;
        bob = -14 * ext;
        torsoLean = 0.1;
        frontArmAngle = -2.4 * ext;
        break;
      }
      case 'grab':
        torsoLean = 0.22;
        frontArmAngle = -1.45;
        backArmAngle = -1.35;
        break;
      case 'special':
        bob = -10;
        torsoLean = s.movePhase === 'active' ? 0.24 : -0.12;
        frontArmAngle = s.movePhase === 'active' ? -1.65 : -2.6;
        backArmAngle = s.movePhase === 'active' ? -1.45 : -2.4;
        break;
      case 'hitstun':
        hitFlash = s.actionFrame % 4 < 2;
        torsoLean = -0.25;
        frontArmAngle = 0.7;
        backArmAngle = 0.9;
        break;
      case 'knockdown':
      case 'defeat':
        hitFlash = s.action === 'knockdown' && s.actionFrame % 4 < 2;
        crouchFactor = 0.48;
        torsoLean = -0.85;
        frontArmAngle = 1.1;
        backArmAngle = 0.9;
        break;
      case 'intro':
      case 'victory':
        bob = Math.sin(timeSec * 8) * 4 - 4;
        frontArmAngle = -2.35 + Math.sin(timeSec * 10) * 0.2;
        backArmAngle = -0.4;
        break;
    }

    const bodyColor = hitFlash ? 0xffffff : primary;
    const pantsColor = hitFlash ? 0xffffff : secondary;
    const hipY = -56 * crouchFactor * scale + bob;
    const shoulderY = hipY - 52 * crouchFactor * scale;
    const headY = shoulderY - 26 * scale;
    const leanX = dir * torsoLean * 28;

    // Back Leg
    this.drawLimb(g, -dir * 8 * scale, hipY, dir * Math.sin(backLegAngle) * 44 * scale, 52 * crouchFactor * scale, 14 * scale, pantsColor);
    // Front Leg
    this.drawLimb(g, dir * 10 * scale, hipY, dir * Math.sin(frontLegAngle) * 48 * scale, 52 * crouchFactor * scale, 15 * scale, pantsColor);

    // Back Arm
    this.drawLimb(
      g,
      leanX - dir * 14 * scale,
      shoulderY + 6,
      dir * Math.sin(-backArmAngle) * 42 * scale,
      Math.cos(backArmAngle) * 40 * scale,
      12 * scale,
      skin
    );

    // Torso (Kurta / Suit / Saree)
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(leanX - 24 * scale, shoulderY - 4, 48 * scale, 58 * crouchFactor * scale, 12);
    // Waistcoat / Sash accent
    g.fillStyle(accent, 0.92);
    g.fillRoundedRect(leanX - 18 * scale, shoulderY, 36 * scale, 22 * crouchFactor * scale, 6);

    // Saree / Muffler / Cape flair
    if (def.headgear === 'gandhi_cap_muffler') {
      g.fillStyle(secondary, 1);
      g.fillRoundedRect(leanX - 20, shoulderY - 6, 40, 14, 6);
      g.fillRoundedRect(leanX - dir * 24, shoulderY + 4, 16, 36, 5);
    } else if (def.headgear === 'saree_bun') {
      g.lineStyle(8, secondary, 1);
      g.lineBetween(leanX - dir * 18, shoulderY, leanX + dir * 18, hipY);
    } else if (def.isBoss) {
      // Royal cape
      g.fillStyle(0x991b1b, 0.85);
      g.fillTriangle(leanX - dir * 18, shoulderY, leanX - dir * 56, hipY + 34, leanX + dir * 10, hipY + 20);
    }

    // Head
    const hx = leanX + dir * 2 * scale;
    const hy = headY;
    g.fillStyle(hitFlash ? 0xffffff : skin, 1);
    g.fillCircle(hx, hy, 22 * scale);
    g.lineStyle(2, 0x0f172a, 0.6);
    g.strokeCircle(hx, hy, 22 * scale);

    // Character-specific Headgear, Hair, Beards, Glasses
    this.drawHeadFeatures(g, def.headgear, hx, hy, dir, scale, hair, accent, s.action);

    // Front Arm + Prop
    const armTipX = leanX + dir * 14 * scale + dir * Math.sin(-frontArmAngle) * 46 * scale;
    const armTipY = shoulderY + 6 + Math.cos(frontArmAngle) * 42 * scale;
    this.drawLimb(
      g,
      leanX + dir * 14 * scale,
      shoulderY + 6,
      dir * Math.sin(-frontArmAngle) * 46 * scale,
      Math.cos(frontArmAngle) * 42 * scale,
      13 * scale,
      skin
    );

    // Fist / Prop
    g.fillStyle(skin, 1);
    g.fillCircle(armTipX, armTipY, 8 * scale);
    this.drawProp(g, def.propType, armTipX, armTipY, dir, scale, accent);

    // Block shield visual
    if (s.action === 'block' || s.blocking) {
      g.fillStyle(0x38bdf8, 0.25);
      g.lineStyle(3, 0x38bdf8, 0.9);
      g.fillRoundedRect(dir * 16, -138 * scale, 18, 118 * scale, 8);
      g.strokeRoundedRect(dir * 16, -138 * scale, 18, 118 * scale, 8);
    }

    // Active melee smear arc
    if (s.movePhase === 'active' && (s.action === 'punch' || s.action === 'kick' || s.action === 'uppercut')) {
      g.fillStyle(accent, 0.35);
      if (s.action === 'kick') {
        g.fillEllipse(dir * 52, -72, 68, 26);
      } else if (s.action === 'uppercut') {
        g.fillEllipse(dir * 40, -118, 36, 78);
      } else {
        g.fillEllipse(dir * 46, -100, 60, 22);
      }
    }
  }

  private drawLimb(
    g: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    thickness: number,
    color: number
  ): void {
    g.lineStyle(thickness, color, 1);
    g.lineBetween(sx, sy, sx + dx, sy + dy);
    g.fillStyle(color, 1);
    g.fillCircle(sx + dx, sy + dy, thickness * 0.45);
  }

  private drawHeadFeatures(
    g: Phaser.GameObjects.Graphics,
    headgear: string,
    hx: number,
    hy: number,
    dir: number,
    scale: number,
    hair: number,
    accent: number,
    action: FighterState['action']
  ): void {
    // Eyes
    const eyeX = hx + dir * 7 * scale;
    const eyeY = hy - 3 * scale;
    if (action === 'hitstun' || action === 'defeat' || action === 'knockdown') {
      g.lineStyle(2.5, 0x0f172a, 1);
      g.lineBetween(eyeX - 4, eyeY - 4, eyeX + 4, eyeY + 4);
      g.lineBetween(eyeX + 4, eyeY - 4, eyeX - 4, eyeY + 4);
    } else {
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(eyeX, eyeY, 3.2 * scale);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX + dir, eyeY - 1, 1.2 * scale);
    }

    // Mouth expression
    if (action === 'special' || action === 'uppercut' || action === 'victory') {
      g.fillStyle(0x7f1d1d, 1);
      g.fillEllipse(hx + dir * 8 * scale, hy + 9 * scale, 10 * scale, 7 * scale);
    } else {
      g.lineStyle(2, 0x0f172a, 0.9);
      g.lineBetween(hx + dir * 4 * scale, hy + 9 * scale, hx + dir * 12 * scale, hy + 8 * scale);
    }

    if (headgear === 'beard_glasses') {
      // Hair + flowing white beard + round spectacles
      g.fillStyle(hair, 1);
      g.fillEllipse(hx, hy - 18 * scale, 38 * scale, 14 * scale);
      g.fillTriangle(hx - 14 * scale, hy + 4, hx + 16 * scale, hy + 4, hx + dir * 4, hy + 28 * scale);
      g.lineStyle(2.5, accent, 1);
      g.strokeCircle(eyeX, eyeY, 7 * scale);
    } else if (headgear === 'youth_hair') {
      g.fillStyle(hair, 1);
      g.fillEllipse(hx - dir * 2, hy - 17 * scale, 40 * scale, 16 * scale);
      g.fillTriangle(hx + dir * 6, hy - 26, hx + dir * 22, hy - 16, hx, hy - 14);
    } else if (headgear === 'gandhi_cap_muffler') {
      // Classic white boat cap
      g.fillStyle(0xf8fafc, 1);
      g.fillRoundedRect(hx - 20 * scale, hy - 30 * scale, 40 * scale, 15 * scale, 6);
      g.fillStyle(hair, 1);
      g.fillRect(hx + dir * 3, hy + 3, 12, 3); // Mustache
    } else if (headgear === 'saree_bun') {
      g.fillStyle(hair, 1);
      g.fillEllipse(hx, hy - 17 * scale, 38 * scale, 14 * scale);
      g.fillCircle(hx - dir * 20 * scale, hy - 10 * scale, 10 * scale);
    } else if (headgear === 'cinema_shades') {
      g.fillStyle(hair, 1);
      g.fillEllipse(hx, hy - 18 * scale, 40 * scale, 16 * scale);
      g.fillStyle(0x020617, 1);
      g.fillRoundedRect(eyeX - 10, eyeY - 6, 20, 10, 3);
      g.lineStyle(2, accent, 1);
      g.strokeRoundedRect(eyeX - 10, eyeY - 6, 20, 10, 3);
    } else if (headgear === 'saffron_bald') {
      // Tilak mark + shades
      g.fillStyle(0xdc2626, 1);
      g.fillRect(hx + dir * 10, hy - 14, 4, 9);
      g.fillStyle(0x0f172a, 1);
      g.fillRoundedRect(eyeX - 9, eyeY - 5, 18, 9, 2);
    } else if (headgear === 'rustic_hair') {
      g.fillStyle(hair, 1);
      g.fillEllipse(hx, hy - 18 * scale, 42 * scale, 16 * scale);
      g.fillRect(hx + dir * 2, hy + 3, 14, 4);
    } else if (headgear === 'tactical_beard') {
      g.fillStyle(hair, 1);
      g.fillEllipse(hx, hy - 17 * scale, 38 * scale, 13 * scale);
      g.fillRoundedRect(hx - 12 * scale, hy + 3, 28 * scale, 18 * scale, 8);
    } else if (headgear === 'golden_crown') {
      g.fillStyle(0xfacc15, 1);
      g.fillTriangle(hx - 18, hy - 18, hx - 10, hy - 40, hx - 2, hy - 18);
      g.fillTriangle(hx - 6, hy - 18, hx + 2, hy - 44, hx + 10, hy - 18);
      g.fillTriangle(hx + 6, hy - 18, hx + 14, hy - 40, hx + 20, hy - 18);
      g.fillStyle(0xef4444, 1);
      g.fillCircle(hx + 2, hy - 25, 4);
    }
  }

  private drawProp(
    g: Phaser.GameObjects.Graphics,
    propType: string,
    x: number,
    y: number,
    dir: number,
    scale: number,
    accent: number
  ): void {
    if (propType === 'mic') {
      g.lineStyle(4, 0x334155, 1);
      g.lineBetween(x, y, x + dir * 12 * scale, y - 16 * scale);
      g.fillStyle(accent, 1);
      g.fillCircle(x + dir * 14 * scale, y - 18 * scale, 6 * scale);
    } else if (propType === 'broom') {
      g.lineStyle(4, 0x92400e, 1);
      g.lineBetween(x, y, x + dir * 26 * scale, y - 22 * scale);
      g.fillStyle(0xfde047, 1);
      g.fillTriangle(
        x + dir * 22 * scale,
        y - 18 * scale,
        x + dir * 44 * scale,
        y - 38 * scale,
        x + dir * 32 * scale,
        y - 42 * scale
      );
    } else if (propType === 'chappal') {
      g.fillStyle(0x38bdf8, 1);
      g.fillEllipse(x + dir * 10, y - 6, 18, 9);
    } else if (propType === 'lantern') {
      g.fillStyle(0xf59e0b, 1);
      g.fillRoundedRect(x + dir * 4, y - 4, 14, 18, 4);
      g.fillStyle(0xfef08a, 0.9);
      g.fillCircle(x + dir * 11, y + 5, 5);
    } else if (propType === 'bulldozer') {
      g.fillStyle(0xfacc15, 1);
      g.fillRect(x + dir * 4, y - 12, 18, 14);
      g.fillStyle(0x334155, 1);
      g.fillRect(x + dir * 20, y - 14, 6, 18);
    } else if (propType === 'scepter') {
      g.lineStyle(5, 0xfacc15, 1);
      g.lineBetween(x, y + 10, x + dir * 16, y - 34);
      g.fillStyle(0xef4444, 1);
      g.fillCircle(x + dir * 16, y - 36, 8);
    } else if (propType === 'gold_bar') {
      g.fillStyle(0xfacc15, 1);
      g.fillRoundedRect(x + dir * 2, y - 8, 16, 10, 3);
    } else if (propType === 'chess') {
      g.fillStyle(0xc084fc, 0.9);
      g.fillCircle(x + dir * 8, y - 10, 8);
    }
  }

  destroy(): void {
    this.shadow.destroy();
    this.container.destroy();
  }
}

export function drawProjectile(
  g: Phaser.GameObjects.Graphics,
  proj: ProjectileState,
  timeSec: number
): void {
  const { x, y, radius, kind } = proj;
  if (kind === 'speech_wave') {
    g.lineStyle(5, 0xf97316, 0.95);
    g.strokeCircle(x, y, radius);
    g.lineStyle(3, 0xfacc15, 0.8);
    g.strokeCircle(x, y, radius * 0.62);
    g.fillStyle(0xfef08a, 0.35);
    g.fillCircle(x, y, radius * 0.45);
  } else if (kind === 'gold_potato') {
    g.fillStyle(0xfacc15, 1);
    g.fillEllipse(x, y, radius * 1.4, radius * 1.0);
    g.lineStyle(3, 0xfef08a, 0.9);
    g.strokeCircle(x, y, radius * 0.9);
  } else if (kind === 'broom_cyclone') {
    g.fillStyle(0x22d3ee, 0.4);
    g.fillCircle(x, y, radius);
    g.lineStyle(4, 0xfde047, 0.95);
    const a = timeSec * 16;
    g.lineBetween(x + Math.cos(a) * radius, y + Math.sin(a) * radius, x - Math.cos(a) * radius, y - Math.sin(a) * radius);
  } else if (kind === 'chappal_spin') {
    g.fillStyle(0x0ea5e9, 0.95);
    g.fillEllipse(x, y, radius * 1.6, radius * 0.8);
    g.lineStyle(3, 0xf8fafc, 0.9);
    g.strokeCircle(x, y, radius);
  } else if (kind === 'lantern_fire') {
    g.fillStyle(0xf97316, 0.85);
    g.fillCircle(x, y, radius);
    g.fillStyle(0xfef08a, 0.9);
    g.fillCircle(x, y, radius * 0.55);
  } else if (kind === 'ordinance_meteor') {
    g.fillStyle(0x7e22ce, 0.9);
    g.fillCircle(x, y, radius);
    g.fillStyle(0xef4444, 0.85);
    g.fillCircle(x, y, radius * 0.65);
    g.lineStyle(3, 0xfacc15, 1);
    g.strokeCircle(x, y, radius + 4);
  } else {
    g.fillStyle(0xfacc15, 0.85);
    g.fillCircle(x, y, radius * 0.8);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(x, y, radius);
  }
}
