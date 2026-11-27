import Phaser from 'phaser';
import { CHARACTERS } from '@shared/characters';
import { CharacterDef, CharacterId } from '@shared/types';
import { drawClothFolds, drawShadedCapsule, makeCanvas, shadeHex } from './CanvasArtHelpers';
import { paintDetailedHeadCanvas } from './FighterHeadBaker';

export interface FighterTextureKeys {
  headNeutral: string;
  headFierce: string;
  headHurt: string;
  torso: string;
  upperArm: string;
  forearm: string;
  thigh: string;
  shin: string;
  prop: string;
}

function registerCanvas(
  scene: Phaser.Scene,
  key: string,
  canvas: HTMLCanvasElement
): void {
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, canvas);
  }
}

export function ensureFighterTextures(
  scene: Phaser.Scene,
  charId: CharacterId
): FighterTextureKeys {
  const def = CHARACTERS[charId];
  const prefix = `nk_${charId}`;

  const keys: FighterTextureKeys = {
    headNeutral: `${prefix}_head_neutral`,
    headFierce: `${prefix}_head_fierce`,
    headHurt: `${prefix}_head_hurt`,
    torso: `${prefix}_torso`,
    upperArm: `${prefix}_upper_arm`,
    forearm: `${prefix}_forearm`,
    thigh: `${prefix}_thigh`,
    shin: `${prefix}_shin`,
    prop: `${prefix}_prop`,
  };

  if (def.portraitImage) {
    bakePhotoHeadTextures(scene, def, keys);
  } else {
    registerCanvas(scene, keys.headNeutral, paintDetailedHeadCanvas(def, 'neutral', 120));
    registerCanvas(scene, keys.headFierce, paintDetailedHeadCanvas(def, 'fierce', 120));
    registerCanvas(scene, keys.headHurt, paintDetailedHeadCanvas(def, 'hurt', 120));
  }
  registerCanvas(scene, keys.torso, bakeTorsoCanvas(def));
  registerCanvas(scene, keys.upperArm, bakeUpperArmCanvas(def));
  registerCanvas(scene, keys.forearm, bakeForearmAndFistCanvas(def));
  registerCanvas(scene, keys.thigh, bakeThighCanvas(def));
  registerCanvas(scene, keys.shin, bakeShinAndShoeCanvas(def));
  registerCanvas(scene, keys.prop, bakePropCanvas(def));

  return keys;
}

function bakeTorsoCanvas(def: CharacterDef): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(96, 114);
  const { primary, secondary, accent } = def.palette;

  // Tailored torso silhouette (broad shoulders -> tapered waist -> kurta hem)
  const bodyGrad = ctx.createLinearGradient(16, 12, 80, 96);
  bodyGrad.addColorStop(0, shadeHex(primary, 18));
  bodyGrad.addColorStop(0.55, primary);
  bodyGrad.addColorStop(1, shadeHex(primary, -28));

  ctx.beginPath();
  ctx.moveTo(16, 20);
  ctx.quadraticCurveTo(48, 8, 80, 20); // Shoulders
  ctx.lineTo(74, 72);
  ctx.lineTo(78, 102); // Kurta/shirt hem
  ctx.quadraticCurveTo(48, 108, 18, 102);
  ctx.lineTo(22, 72);
  ctx.closePath();

  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#090d16';
  ctx.stroke();

  // Character-specific garment details
  if (def.headgear === 'beard_glasses') {
    // Mitron: Cream kurta under saffron Nehru jacket + white collar V + buttons + pocket square
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(35, 14);
    ctx.lineTo(61, 14);
    ctx.lineTo(48, 42);
    ctx.closePath();
    ctx.fill();

    // Jacket center placket & buttons
    ctx.strokeStyle = shadeHex(primary, -34);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 40);
    ctx.lineTo(48, 86);
    ctx.stroke();
    for (let by = 46; by <= 74; by += 13) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(52, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pocket square
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(58, 34);
    ctx.lineTo(70, 34);
    ctx.lineTo(66, 27);
    ctx.lineTo(61, 29);
    ctx.closePath();
    ctx.fill();
  } else if (def.headgear === 'gandhi_cap_muffler') {
    // Muffler Man: Red knitted muffler wrapped tightly around collar + hanging end
    const mufGrad = ctx.createLinearGradient(20, 12, 76, 36);
    mufGrad.addColorStop(0, shadeHex(secondary, 16));
    mufGrad.addColorStop(1, shadeHex(secondary, -24));
    ctx.fillStyle = mufGrad;
    ctx.beginPath();
    ctx.roundRect(22, 12, 52, 22, 9);
    ctx.roundRect(24, 24, 16, 46, 6);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();
  } else if (def.headgear === 'saree_bun') {
    // Didi Storm: Blue-bordered cotton saree pallu diagonally across torso
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(22, 20);
    ctx.lineTo(76, 80);
    ctx.lineTo(68, 94);
    ctx.lineTo(18, 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else if (def.isBoss) {
    // Samrat Ordinance: Gold shoulder pauldrons & central emblem
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(20, 22, 13, 9, -0.3, 0, Math.PI * 2);
    ctx.ellipse(76, 22, 13, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(48, 46, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    // Waistcoat / Sash / Belt
    ctx.fillStyle = secondary;
    ctx.fillRect(23, 70, 50, 11);
    ctx.fillStyle = accent;
    ctx.fillRect(42, 68, 12, 15);
  }

  // Cloth folds for realistic drape
  drawClothFolds(
    ctx,
    [
      [28, 36, 36, 52, 26, 68],
      [68, 38, 60, 55, 70, 72],
      [38, 84, 48, 92, 62, 86],
    ],
    '#000000',
    0.22
  );

  return canvas;
}

function bakeUpperArmCanvas(def: CharacterDef): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(40, 58);
  const sleeveColor =
    def.headgear === 'beard_glasses'
      ? def.palette.secondary // Mitron wears cream kurta sleeves under saffron jacket
      : def.palette.primary;
  drawShadedCapsule(ctx, 20, 13, 20, 44, 11, 9, sleeveColor);
  return canvas;
}

function bakeForearmAndFistCanvas(def: CharacterDef): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(40, 62);
  const { skin } = def.palette;
  // Muscular forearm
  drawShadedCapsule(ctx, 20, 12, 20, 42, 9, 7.5, skin);

  // Shaded clenched fist with knuckles
  const fistGrad = ctx.createRadialGradient(22, 46, 2, 20, 48, 11);
  fistGrad.addColorStop(0, shadeHex(skin, 18));
  fistGrad.addColorStop(1, shadeHex(skin, -26));
  ctx.fillStyle = fistGrad;
  ctx.beginPath();
  ctx.roundRect(11, 40, 18, 16, 6);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#090d16';
  ctx.stroke();

  // Knuckle creases
  ctx.strokeStyle = shadeHex(skin, -36);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(15, 45);
  ctx.lineTo(15, 52);
  ctx.moveTo(20, 45);
  ctx.lineTo(20, 52);
  ctx.moveTo(25, 45);
  ctx.lineTo(25, 52);
  ctx.stroke();
  return canvas;
}

function bakeThighCanvas(def: CharacterDef): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(46, 62);
  drawShadedCapsule(ctx, 23, 14, 23, 48, 13.5, 11, def.palette.secondary);
  return canvas;
}

function bakeShinAndShoeCanvas(def: CharacterDef): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(54, 68);
  drawShadedCapsule(ctx, 22, 12, 22, 46, 10.5, 8, def.palette.secondary);

  // Detailed Shoe / Mojari / Boot facing right
  const shoeColor = def.isBoss ? '#78350f' : '#1e293b';
  const shoeGrad = ctx.createLinearGradient(12, 46, 46, 62);
  shoeGrad.addColorStop(0, shadeHex(shoeColor, 20));
  shoeGrad.addColorStop(1, '#020617');

  ctx.fillStyle = shoeGrad;
  ctx.beginPath();
  ctx.moveTo(12, 44);
  ctx.lineTo(31, 44);
  ctx.quadraticCurveTo(47, 48, 46, 58);
  ctx.lineTo(11, 59);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#020617';
  ctx.stroke();

  // Sole strip
  ctx.fillStyle = def.palette.accent;
  ctx.fillRect(12, 57, 33, 3);
  return canvas;
}

function bakePropCanvas(def: CharacterDef): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(72, 72);
  const { accent } = def.palette;

  if (def.propType === 'mic') {
    // Golden podium/handheld condenser mic
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(22, 56);
    ctx.lineTo(42, 26);
    ctx.stroke();

    const micGrad = ctx.createRadialGradient(44, 20, 2, 45, 22, 11);
    micGrad.addColorStop(0, '#fef08a');
    micGrad.addColorStop(0.55, '#f59e0b');
    micGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = micGrad;
    ctx.beginPath();
    ctx.arc(45, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();
  } else if (def.propType === 'broom') {
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(14, 58);
    ctx.lineTo(40, 32);
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(36, 36);
    ctx.lineTo(62, 10);
    ctx.lineTo(66, 26);
    ctx.lineTo(46, 42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (def.propType === 'chappal') {
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.ellipse(36, 36, 20, 10, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (def.propType === 'lantern') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(26, 22, 20, 28, 5);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(36, 36, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (def.propType === 'bulldozer') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 28, 28, 20);
    ctx.fillStyle = '#334155';
    ctx.fillRect(44, 24, 10, 26);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 28, 28, 20);
  } else if (def.propType === 'scepter') {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(22, 60);
    ctx.lineTo(48, 16);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(49, 15, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (def.propType === 'gold_bar') {
    const g = ctx.createLinearGradient(18, 28, 54, 46);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(1, '#d97706');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(18, 28, 34, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (def.propType === 'chess') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(36, 34, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (def.propType === 'megaphone') {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(22, 46);
    ctx.lineTo(54, 18);
    ctx.lineTo(60, 42);
    ctx.lineTo(26, 52);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, 46, 10, 12);
  }
  return canvas;
}

function paintPhotoHeadFrame(
  def: CharacterDef,
  sourceImg: HTMLImageElement | HTMLCanvasElement | null,
  expression: 'neutral' | 'fierce' | 'hurt'
): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(120, 120);
  const { skin, accent } = def.palette;

  // Shaded neck
  const neckGrad = ctx.createLinearGradient(0, 74, 0, 104);
  neckGrad.addColorStop(0, shadeHex(skin, -24));
  neckGrad.addColorStop(1, shadeHex(skin, -4));
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.roundRect(48, 76, 24, 24, 6);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#090d16';
  ctx.stroke();

  // Clip head oval/circle and draw uploaded photo
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(58, 53, 35, 38, 0, 0, Math.PI * 2);
  ctx.clip();

  if (sourceImg) {
    ctx.drawImage(sourceImg, 18, 12, 80, 82);
  } else {
    ctx.fillStyle = skin;
    ctx.fillRect(20, 12, 76, 82);
  }

  if (expression === 'fierce') {
    ctx.fillStyle = 'rgba(236, 72, 153, 0.16)';
    ctx.fillRect(0, 0, 120, 120);
  } else if (expression === 'hurt') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    ctx.fillRect(0, 0, 120, 120);
  }
  ctx.restore();

  // Crisp silhouette border
  ctx.lineWidth = expression === 'fierce' ? 3.2 : 2.5;
  ctx.strokeStyle = expression === 'fierce' ? accent : '#0b101d';
  ctx.beginPath();
  ctx.ellipse(58, 53, 35, 38, 0, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function bakePhotoHeadTextures(
  scene: Phaser.Scene,
  def: CharacterDef,
  keys: FighterTextureKeys
): void {
  const rawKey = `${def.id}_photo_raw`;
  const source = scene.textures.exists(rawKey)
    ? (scene.textures.get(rawKey).getSourceImage() as HTMLImageElement)
    : null;

  registerCanvas(scene, keys.headNeutral, paintPhotoHeadFrame(def, source, 'neutral'));
  registerCanvas(scene, keys.headFierce, paintPhotoHeadFrame(def, source, 'fierce'));
  registerCanvas(scene, keys.headHurt, paintPhotoHeadFrame(def, source, 'hurt'));

  if (!source && def.portraitImage) {
    const img = new Image();
    img.onload = () => {
      const updateTex = (k: string, expr: 'neutral' | 'fierce' | 'hurt') => {
        const tex = scene.textures.get(k);
        if (tex && tex.getSourceImage() instanceof HTMLCanvasElement) {
          const targetCanvas = tex.getSourceImage() as HTMLCanvasElement;
          const fresh = paintPhotoHeadFrame(def, img, expr);
          const ctx = targetCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
            ctx.drawImage(fresh, 0, 0);
            (tex as Phaser.Textures.CanvasTexture).refresh();
          }
        }
      };
      updateTex(keys.headNeutral, 'neutral');
      updateTex(keys.headFierce, 'fierce');
      updateTex(keys.headHurt, 'hurt');
    };
    img.src = def.portraitImage;
  }
}
