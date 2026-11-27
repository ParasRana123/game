import Phaser from 'phaser';
import { CHARACTERS } from '@shared/characters';
import { FighterState, ProjectileState } from '@shared/types';
import { ensureFighterTextures, FighterTextureKeys } from './FighterTextureBaker';

function hexNum(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class FighterRenderer {
  private root: Phaser.GameObjects.Container;
  private rig: Phaser.GameObjects.Container;
  private fxGfx: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Ellipse;
  private nameTag: Phaser.GameObjects.Text;
  private keys: FighterTextureKeys;

  private backThigh: Phaser.GameObjects.Image;
  private backShin: Phaser.GameObjects.Image;
  private backUpperArm: Phaser.GameObjects.Image;
  private backForearm: Phaser.GameObjects.Image;
  private torso: Phaser.GameObjects.Image;
  private head: Phaser.GameObjects.Image;
  private frontThigh: Phaser.GameObjects.Image;
  private frontShin: Phaser.GameObjects.Image;
  private frontUpperArm: Phaser.GameObjects.Image;
  private frontForearm: Phaser.GameObjects.Image;
  private prop: Phaser.GameObjects.Image;

  private renderX: number;
  private renderY: number;

  constructor(private scene: Phaser.Scene, initial: FighterState) {
    const def = CHARACTERS[initial.characterId];
    this.keys = ensureFighterTextures(scene, initial.characterId);
    this.renderX = initial.x;
    this.renderY = initial.y;

    this.shadow = scene.add.ellipse(initial.x, 616, 86, 20, 0x000000, 0.5).setDepth(9);
    this.root = scene.add.container(initial.x, initial.y).setDepth(12);
    this.fxGfx = scene.add.graphics();
    this.rig = scene.add.container(0, 0);

    // Skeletal layers ordered back-to-front for natural 2.5D overlap
    this.backThigh = scene.add.image(0, 0, this.keys.thigh).setOrigin(0.5, 0.22);
    this.backShin = scene.add.image(0, 0, this.keys.shin).setOrigin(0.41, 0.18);
    this.backUpperArm = scene.add.image(0, 0, this.keys.upperArm).setOrigin(0.5, 0.22);
    this.backForearm = scene.add.image(0, 0, this.keys.forearm).setOrigin(0.5, 0.18);

    this.torso = scene.add.image(0, 0, this.keys.torso).setOrigin(0.5, 0.88);
    this.head = scene.add.image(0, 0, this.keys.headNeutral).setOrigin(0.48, 0.72);

    this.frontThigh = scene.add.image(0, 0, this.keys.thigh).setOrigin(0.5, 0.22);
    this.frontShin = scene.add.image(0, 0, this.keys.shin).setOrigin(0.41, 0.18);
    this.frontUpperArm = scene.add.image(0, 0, this.keys.upperArm).setOrigin(0.5, 0.22);
    this.frontForearm = scene.add.image(0, 0, this.keys.forearm).setOrigin(0.5, 0.18);
    this.prop = scene.add.image(0, 0, this.keys.prop).setOrigin(0.32, 0.72);

    this.rig.add([
      this.backUpperArm,
      this.backForearm,
      this.backThigh,
      this.backShin,
      this.torso,
      this.head,
      this.frontThigh,
      this.frontShin,
      this.frontUpperArm,
      this.frontForearm,
      this.prop,
    ]);

    const rigScale = def.isBoss ? 1.12 : 1.0;
    this.rig.setScale(rigScale);

    this.nameTag = scene.add
      .text(0, -184 * rigScale, def.name.toUpperCase(), {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#09090f',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.root.add([this.fxGfx, this.rig, this.nameTag]);
  }

  update(state: FighterState, timeSec: number, groundY: number, lerpFactor = 0.55): void {
    this.renderX = Phaser.Math.Linear(this.renderX, state.x, lerpFactor);
    this.renderY = Phaser.Math.Linear(this.renderY, state.y, lerpFactor);
    this.root.setPosition(this.renderX, this.renderY);

    const heightAboveGround = Math.max(0, groundY - this.renderY);
    const shadowScale = Math.max(0.4, 1 - heightAboveGround / 280);
    this.shadow.setPosition(this.renderX, groundY + 5);
    this.shadow.setScale(shadowScale, shadowScale);

    this.animateRig(state, timeSec);
  }

  private animateRig(s: FighterState, timeSec: number): void {
    const def = CHARACTERS[s.characterId];
    const scale = def.isBoss ? 1.12 : 1.0;
    const accent = hexNum(def.palette.accent);
    const aura = hexNum(def.palette.aura);

    // Flip skeletal rig cleanly along X so right-facing baked art faces opponent
    this.rig.scaleX = s.facing * scale;
    this.rig.scaleY = scale;

    // Select dynamic facial expression texture
    const headTex =
      s.action === 'hitstun' || s.action === 'knockdown' || s.action === 'defeat'
        ? this.keys.headHurt
        : s.action === 'punch' ||
          s.action === 'kick' ||
          s.action === 'uppercut' ||
          s.action === 'special' ||
          s.action === 'victory'
        ? this.keys.headFierce
        : this.keys.headNeutral;
    if (this.head.texture.key !== headTex) {
      this.head.setTexture(headTex);
    }

    // Joint kinematics (angles in radians, local to right-facing rig)
    let hipY = -64;
    let torsoRot = 0.04;
    let headRot = 0;
    let fThighRot = -0.22;
    let fShinRot = 0.24;
    let bThighRot = 0.25;
    let bShinRot = 0.08;
    let fShoulderRot = -0.35;
    let fElbowRot = -1.15;
    let bShoulderRot = 0.22;
    let bElbowRot = -0.95;
    let hitFlash = false;

    const breathe = Math.sin(timeSec * 5.2 + s.playerIndex) * 2.2;
    hipY += breathe;

    switch (s.action) {
      case 'idle':
        fShoulderRot = -0.25 + Math.sin(timeSec * 4) * 0.05;
        bShoulderRot = 0.28 - Math.sin(timeSec * 4) * 0.05;
        break;
      case 'walk':
      case 'run': {
        const freq = s.action === 'run' ? 16 : 10;
        const amp = s.action === 'run' ? 0.62 : 0.42;
        const swing = Math.sin(timeSec * freq) * amp;
        hipY = -66 + Math.abs(Math.cos(timeSec * freq)) * -5;
        torsoRot = s.action === 'run' ? 0.2 : 0.08;
        fThighRot = swing;
        fShinRot = Math.max(0.05, -swing * 0.65 + 0.25);
        bThighRot = -swing;
        bShinRot = Math.max(0.05, swing * 0.65 + 0.25);
        fShoulderRot = -swing * 0.85;
        bShoulderRot = swing * 0.85;
        break;
      }
      case 'jump':
        hipY = -68;
        torsoRot = 0.1;
        fThighRot = -0.65;
        fShinRot = 0.95;
        bThighRot = 0.15;
        bShinRot = 0.55;
        fShoulderRot = -0.8;
        bShoulderRot = -0.3;
        break;
      case 'crouch':
        hipY = -44;
        torsoRot = 0.22;
        fThighRot = -0.95;
        fShinRot = 1.45;
        bThighRot = -0.55;
        bShinRot = 1.25;
        break;
      case 'block':
        hipY = -58;
        torsoRot = -0.1;
        fShoulderRot = -1.25;
        fElbowRot = -1.45;
        bShoulderRot = -1.05;
        bElbowRot = -1.35;
        break;
      case 'punch': {
        const ext = s.movePhase === 'active' ? 1.0 : s.movePhase === 'startup' ? -0.3 : 0.35;
        torsoRot = 0.18 * ext;
        fShoulderRot = -1.55 * ext;
        fElbowRot = ext > 0.5 ? -0.08 : -1.1;
        bShoulderRot = 0.45;
        break;
      }
      case 'kick': {
        const ext = s.movePhase === 'active' ? 1.0 : s.movePhase === 'startup' ? 0.2 : 0.4;
        hipY = -68;
        torsoRot = -0.22 * ext;
        fThighRot = -1.48 * ext;
        fShinRot = ext > 0.5 ? 0.05 : 0.75;
        bThighRot = 0.18;
        bShinRot = 0.12;
        fShoulderRot = 0.4;
        break;
      }
      case 'uppercut': {
        const ext = s.movePhase === 'active' ? 1.0 : 0.35;
        hipY = -74 * ext - 20 * (1 - ext);
        torsoRot = -0.14 * ext;
        fShoulderRot = -2.45 * ext;
        fElbowRot = -0.45;
        break;
      }
      case 'grab':
        torsoRot = 0.26;
        fShoulderRot = -1.45;
        fElbowRot = -0.25;
        bShoulderRot = -1.35;
        bElbowRot = -0.25;
        break;
      case 'special':
        if (s.characterId === 'vikas_guru') {
          hipY = -80 + Math.sin(timeSec * 14) * 4;
          torsoRot = s.movePhase === 'active' ? 0.14 : -0.12;
          headRot = -0.1;
          fShoulderRot = s.movePhase === 'active' ? -1.55 + Math.sin(timeSec * 18) * 0.14 : -2.6;
          fElbowRot = -0.25;
          bShoulderRot = s.movePhase === 'active' ? -2.25 : -0.7;
          bElbowRot = -0.45;
        } else {
          hipY = -74;
          torsoRot = s.movePhase === 'active' ? 0.22 : -0.14;
          fShoulderRot = s.movePhase === 'active' ? -1.6 : -2.5;
          fElbowRot = -0.2;
          bShoulderRot = s.movePhase === 'active' ? -1.4 : -2.2;
        }
        break;
      case 'hitstun':
        hitFlash = s.actionFrame % 4 < 2;
        torsoRot = -0.26;
        headRot = -0.22;
        fShoulderRot = 0.5;
        bShoulderRot = 0.7;
        break;
      case 'knockdown':
      case 'defeat':
        hitFlash = s.action === 'knockdown' && s.actionFrame % 4 < 2;
        hipY = -28;
        torsoRot = -1.1;
        headRot = -0.35;
        fThighRot = -0.3;
        bThighRot = 0.2;
        break;
      case 'intro':
      case 'victory':
        hipY = -66 + Math.sin(timeSec * 7) * 3;
        fShoulderRot = -2.35 + Math.sin(timeSec * 9) * 0.18;
        fElbowRot = -0.35;
        bShoulderRot = 0.3;
        break;
    }

    // Apply torso & head transforms
    this.torso.setPosition(0, hipY + 8);
    this.torso.setRotation(torsoRot);

    const shoulderOffsetX = Math.sin(torsoRot) * 66;
    const shoulderOffsetY = hipY + 8 - Math.cos(torsoRot) * 66;

    this.head.setPosition(shoulderOffsetX + Math.sin(torsoRot) * 8, shoulderOffsetY - 6);
    this.head.setRotation(torsoRot * 0.5 + headRot);

    // Legs (2-bone thigh -> shin kinematics)
    const placeLeg = (
      thigh: Phaser.GameObjects.Image,
      shin: Phaser.GameObjects.Image,
      hipX: number,
      tRot: number,
      sRot: number
    ) => {
      thigh.setPosition(hipX, hipY);
      thigh.setRotation(tRot);
      const kneeX = hipX - Math.sin(tRot) * 34;
      const kneeY = hipY + Math.cos(tRot) * 34;
      shin.setPosition(kneeX, kneeY);
      shin.setRotation(tRot + sRot);
    };

    placeLeg(this.backThigh, this.backShin, -8, bThighRot, bShinRot);
    placeLeg(this.frontThigh, this.frontShin, 8, fThighRot, fShinRot);

    // Arms (2-bone upperArm -> forearm kinematics)
    const placeArm = (
      upper: Phaser.GameObjects.Image,
      fore: Phaser.GameObjects.Image,
      sx: number,
      sy: number,
      uRot: number,
      fRot: number
    ) => {
      upper.setPosition(sx, sy);
      upper.setRotation(uRot);
      const elbowX = sx - Math.sin(uRot) * 29;
      const elbowY = sy + Math.cos(uRot) * 29;
      fore.setPosition(elbowX, elbowY);
      const totalRot = uRot + fRot;
      fore.setRotation(totalRot);
      const handX = elbowX - Math.sin(totalRot) * 32;
      const handY = elbowY + Math.cos(totalRot) * 32;
      return { handX, handY, totalRot };
    };

    placeArm(
      this.backUpperArm,
      this.backForearm,
      shoulderOffsetX - 12,
      shoulderOffsetY + 6,
      bShoulderRot,
      bElbowRot
    );
    const frontHand = placeArm(
      this.frontUpperArm,
      this.frontForearm,
      shoulderOffsetX + 12,
      shoulderOffsetY + 6,
      fShoulderRot,
      fElbowRot
    );

    this.prop.setPosition(frontHand.handX, frontHand.handY);
    this.prop.setRotation(frontHand.totalRot + 0.55);

    // Hit flash tint
    const parts = [
      this.backThigh,
      this.backShin,
      this.backUpperArm,
      this.backForearm,
      this.torso,
      this.head,
      this.frontThigh,
      this.frontShin,
      this.frontUpperArm,
      this.frontForearm,
    ];
    for (const p of parts) {
      if (hitFlash) p.setTintFill(0xffffff);
      else p.clearTint();
    }

    // FX Layer (Aura, Super Armor, Mitron Chakra Mandala, Block Shield, Attack Smears)
    const g = this.fxGfx;
    g.clear();
    const dir = s.facing;

    if (s.meter >= 100 || s.action === 'special') {
      const pulse = 0.26 + Math.sin(timeSec * 12) * 0.12;
      g.fillStyle(aura, s.action === 'special' ? 0.42 : pulse);
      g.fillEllipse(0, -82 * scale, 102 * scale, 174 * scale);
      g.lineStyle(3, accent, 0.8);
      g.strokeEllipse(0, -82 * scale, 108 * scale, 180 * scale);
    }

    if (s.characterId === 'vikas_guru' && s.action === 'special') {
      const cx = 0;
      const cy = -100 * scale;
      const haloR = 76 + Math.sin(timeSec * 16) * 8;
      g.lineStyle(3.5, 0xfacc15, 0.92);
      g.strokeCircle(cx, cy, haloR);
      g.lineStyle(2.5, 0xf97316, 0.78);
      g.strokeCircle(cx, cy, haloR * 0.72);
      for (let i = 0; i < 12; i++) {
        const ang = timeSec * 4.5 + (i / 12) * Math.PI * 2;
        g.lineStyle(3, i % 2 === 0 ? 0xfacc15 : 0xf97316, 0.88);
        g.lineBetween(
          cx + Math.cos(ang) * (haloR * 0.48),
          cy + Math.sin(ang) * (haloR * 0.48),
          cx + Math.cos(ang) * (haloR + 14),
          cy + Math.sin(ang) * (haloR + 14)
        );
      }

      // Concentric sonic rings from Mitron's mic
      const micWorldX = dir * frontHand.handX * scale;
      const micWorldY = frontHand.handY * scale;
      for (let r = 0; r < 3; r++) {
        const phase = (timeSec * 3.5 + r * 0.33) % 1;
        g.lineStyle(3, r % 2 === 0 ? 0xfacc15 : 0xf97316, (1 - phase) * 0.9);
        g.strokeCircle(micWorldX + dir * 16, micWorldY - 12, 12 + phase * 62);
      }
    }

    if (s.superArmorFrames > 0) {
      g.lineStyle(4, 0xfacc15, 0.85);
      g.strokeRoundedRect(-42 * scale, -162 * scale, 84 * scale, 162 * scale, 20);
    }

    if (s.action === 'block' || s.blocking) {
      g.fillStyle(0x38bdf8, 0.25);
      g.lineStyle(3, 0x38bdf8, 0.92);
      g.fillRoundedRect(dir * 20, -142 * scale, 18, 122 * scale, 8);
      g.strokeRoundedRect(dir * 20, -142 * scale, 18, 122 * scale, 8);
    }

    if (
      s.movePhase === 'active' &&
      (s.action === 'punch' || s.action === 'kick' || s.action === 'uppercut')
    ) {
      g.fillStyle(accent, 0.38);
      if (s.action === 'kick') {
        g.fillEllipse(dir * 54, -74, 72, 26);
      } else if (s.action === 'uppercut') {
        g.fillEllipse(dir * 42, -122, 38, 82);
      } else {
        g.fillEllipse(dir * 48, -102, 64, 22);
      }
    }
  }

  destroy(): void {
    this.shadow.destroy();
    this.root.destroy();
  }
}

export function drawProjectile(
  g: Phaser.GameObjects.Graphics,
  proj: ProjectileState,
  timeSec: number
): void {
  const { x, y, radius, kind } = proj;
  if (kind === 'speech_wave') {
    const pulse = 1 + Math.sin(timeSec * 20) * 0.12;
    g.fillStyle(0xf97316, 0.24);
    g.fillCircle(x, y, radius * 1.12 * pulse);
    g.lineStyle(5, 0xf97316, 0.95);
    g.strokeCircle(x, y, radius * pulse);
    g.lineStyle(3.5, 0xfacc15, 0.9);
    g.strokeCircle(x, y, radius * 0.68);
    g.lineStyle(2.5, 0xffffff, 0.85);
    g.strokeCircle(x, y, radius * 0.36);
    g.fillStyle(0xfef08a, 0.5);
    g.fillCircle(x, y, radius * 0.28);
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
    g.lineBetween(
      x + Math.cos(a) * radius,
      y + Math.sin(a) * radius,
      x - Math.cos(a) * radius,
      y - Math.sin(a) * radius
    );
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
