import { CharacterDef } from '@shared/types';
import { hexToRgba, makeCanvas, shadeHex } from './CanvasArtHelpers';

export type HeadExpression = 'neutral' | 'fierce' | 'hurt';

/**
 * Paints a richly shaded 2.5D caricature head (facing right by default)
 * onto a 120x120 canvas centered around (60, 62).
 */
export function paintDetailedHeadCanvas(
  def: CharacterDef,
  expression: HeadExpression = 'neutral',
  size = 120
): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const s = size / 120;
  ctx.scale(s, s);
  drawDetailedHead(ctx, def, 58, 60, expression);
  return canvas;
}

export function drawDetailedHead(
  ctx: CanvasRenderingContext2D,
  def: CharacterDef,
  cx: number,
  cy: number,
  expression: HeadExpression
): void {
  const { skin, hair, accent } = def.palette;

  ctx.save();
  ctx.translate(cx, cy);

  // Back hair / saree bun behind head
  if (def.headgear === 'saree_bun') {
    const bunGrad = ctx.createRadialGradient(-24, -6, 2, -22, -4, 15);
    bunGrad.addColorStop(0, shadeHex(hair, 20));
    bunGrad.addColorStop(1, shadeHex(hair, -28));
    ctx.fillStyle = bunGrad;
    ctx.beginPath();
    ctx.arc(-22, -5, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();
  }

  // Neck + neck shadow
  const neckGrad = ctx.createLinearGradient(0, 14, 0, 38);
  neckGrad.addColorStop(0, shadeHex(skin, -28));
  neckGrad.addColorStop(1, shadeHex(skin, -8));
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.roundRect(-10, 14, 21, 24, 6);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(12,16,28,0.75)';
  ctx.stroke();

  // Sculpted Skull + Jawline (3/4 profile facing right)
  const faceGrad = ctx.createRadialGradient(7, -8, 4, 0, 0, 32);
  faceGrad.addColorStop(0, shadeHex(skin, 20));
  faceGrad.addColorStop(0.62, skin);
  faceGrad.addColorStop(1, shadeHex(skin, -26));

  ctx.beginPath();
  ctx.moveTo(-21, -8);
  ctx.bezierCurveTo(-22, -30, 18, -32, 22, -10); // Forehead/cranium
  ctx.bezierCurveTo(25, 2, 23, 14, 15, 23); // Cheek & chin
  ctx.bezierCurveTo(6, 29, -10, 26, -18, 13); // Jawline
  ctx.closePath();
  ctx.fillStyle = faceGrad;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#0b101d';
  ctx.stroke();

  // Subtle cheekbone & temple warm shading
  ctx.fillStyle = hexToRgba('#b45309', 0.14);
  ctx.beginPath();
  ctx.ellipse(9, 7, 7, 4.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Ear (left side in 3/4 view)
  ctx.fillStyle = shadeHex(skin, -10);
  ctx.beginPath();
  ctx.ellipse(-18, 2, 5.5, 8.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#0b101d';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-18, 2, 2.6, -1, 1.5);
  ctx.strokeStyle = shadeHex(skin, -34);
  ctx.stroke();

  // Sculpted Nose bridge + tip + nostril shadow
  ctx.fillStyle = shadeHex(skin, 14);
  ctx.beginPath();
  ctx.moveTo(10, -7);
  ctx.quadraticCurveTo(18, 2, 16, 7);
  ctx.quadraticCurveTo(13, 9, 9, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shadeHex(skin, -36);
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(11, -6);
  ctx.quadraticCurveTo(19, 3, 16, 7.5);
  ctx.quadraticCurveTo(12, 9.5, 9.5, 7);
  ctx.stroke();

  // Eyes & Eyebrows
  const drawEye = (ex: number, ey: number, rx: number) => {
    if (expression === 'hurt') {
      ctx.strokeStyle = '#0b101d';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey - 3);
      ctx.lineTo(ex + 4, ey + 3);
      ctx.moveTo(ex + 4, ey - 3);
      ctx.lineTo(ex - 4, ey + 3);
      ctx.stroke();
      return;
    }
    // Sclera
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Iris + Pupil
    ctx.fillStyle = def.isBoss ? '#dc2626' : '#1e293b';
    ctx.beginPath();
    ctx.arc(ex + 1, ey, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(ex + 1.2, ey, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 1.8, ey - 1, 0.85, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEye(2, -4, 4.6);
  drawEye(15, -4, 4.0);

  // Expressive Brows
  ctx.strokeStyle = shadeHex(hair, -18);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const browTilt = expression === 'fierce' ? 2.5 : expression === 'hurt' ? -2 : 0.8;
  ctx.beginPath();
  ctx.moveTo(-3, -10 - browTilt * 0.4);
  ctx.quadraticCurveTo(3, -12, 7, -9 + browTilt);
  ctx.moveTo(11, -9 + browTilt);
  ctx.quadraticCurveTo(15, -12, 20, -10 - browTilt * 0.4);
  ctx.stroke();

  // Mouth
  if (expression === 'fierce') {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(10, 14, 7.2, 4.5, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(5, 11, 10, 2.2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  } else if (expression === 'hurt') {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(9, 15, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = shadeHex(skin, -45);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.quadraticCurveTo(10, 17, 16, 13.5);
    ctx.stroke();
  }

  // Character-Specific Hair, Beards, Glasses & Headgear
  drawCharacterHeadgear(ctx, def, accent, hair);
  ctx.restore();
}

function drawCharacterHeadgear(
  ctx: CanvasRenderingContext2D,
  def: CharacterDef,
  accent: string,
  hair: string
): void {
  const hg = def.headgear;

  if (hg === 'beard_glasses') {
    // Mitron: Swept silver-white hair + full sculpted silver beard & mustache + rimless glasses
    const hairGrad = ctx.createLinearGradient(-20, -32, 20, -14);
    hairGrad.addColorStop(0, shadeHex(hair, -18));
    hairGrad.addColorStop(0.5, hair);
    hairGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -6);
    ctx.bezierCurveTo(-24, -32, 16, -34, 22, -16);
    ctx.bezierCurveTo(10, -21, -6, -21, -15, -10);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // Sculpted white beard
    const beardGrad = ctx.createLinearGradient(-10, 4, 18, 30);
    beardGrad.addColorStop(0, '#ffffff');
    beardGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = beardGrad;
    ctx.beginPath();
    ctx.moveTo(-14, 5);
    ctx.quadraticCurveTo(-12, 28, 7, 30);
    ctx.quadraticCurveTo(22, 27, 21, 9);
    ctx.quadraticCurveTo(14, 15, 7, 11);
    ctx.quadraticCurveTo(-4, 14, -14, 5);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    // Mustache
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(9, 10, 9.5, 3.2, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Rimless gold spectacles with subtle sheen
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.9;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(2, -4, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(15, -4, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(10, -4);
    ctx.moveTo(-4, -5);
    ctx.lineTo(-17, -2);
    ctx.stroke();
  } else if (hg === 'youth_hair') {
    const hgGrad = ctx.createLinearGradient(-20, -32, 20, -10);
    hgGrad.addColorStop(0, shadeHex(hair, 18));
    hgGrad.addColorStop(1, shadeHex(hair, -16));
    ctx.fillStyle = hgGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.bezierCurveTo(-24, -32, 12, -35, 24, -14);
    ctx.quadraticCurveTo(8, -22, -14, -12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Stylish light stubble
    ctx.fillStyle = 'rgba(30, 41, 59, 0.18)';
    ctx.beginPath();
    ctx.ellipse(6, 17, 13, 8, 0, 0, Math.PI);
    ctx.fill();
  } else if (hg === 'gandhi_cap_muffler') {
    // Classic boat cap
    const capGrad = ctx.createLinearGradient(-20, -32, 20, -14);
    capGrad.addColorStop(0, '#ffffff');
    capGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -13);
    ctx.quadraticCurveTo(-2, -37, 23, -15);
    ctx.quadraticCurveTo(0, -10, -22, -13);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Mustache
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(9, 10, 8.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hg === 'saree_bun') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-22, -5);
    ctx.bezierCurveTo(-22, -30, 14, -32, 20, -14);
    ctx.quadraticCurveTo(2, -20, -15, -10);
    ctx.closePath();
    ctx.fill();
    // Bindi
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(9, -11, 2.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (hg === 'cinema_shades') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-22, -5);
    ctx.bezierCurveTo(-24, -32, 18, -34, 24, -13);
    ctx.quadraticCurveTo(6, -22, -14, -10);
    ctx.closePath();
    ctx.fill();
    // Mustache
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(9, 10, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gold-rimmed dark aviators with sheen
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-4, -9, 12, 9, 3);
    ctx.roundRect(10, -9, 11, 9, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-1, -7);
    ctx.lineTo(3, -2);
    ctx.moveTo(13, -7);
    ctx.lineTo(17, -2);
    ctx.stroke();
  } else if (hg === 'saffron_bald') {
    // Specular dome highlight + crimson tilak + sharp dark shades
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(4, -20, 10, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Tilak
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(8, -19, 3.2, 9);
    // Shades
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(-4, -9, 12, 8.5, 2);
    ctx.roundRect(10, -9, 11, 8.5, 2);
    ctx.fill();
  } else if (hg === 'rustic_hair') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.bezierCurveTo(-24, -33, 14, -34, 22, -14);
    ctx.quadraticCurveTo(6, -21, -15, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Thick white mustache
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(9, 10, 10, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hg === 'tactical_beard') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-21, -6);
    ctx.bezierCurveTo(-22, -29, 12, -30, 19, -15);
    ctx.quadraticCurveTo(4, -20, -14, -10);
    ctx.closePath();
    ctx.fill();
    // Trimmed salt & pepper beard
    ctx.fillStyle = shadeHex(hair, -25);
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.quadraticCurveTo(-8, 25, 7, 27);
    ctx.quadraticCurveTo(20, 24, 20, 10);
    ctx.closePath();
    ctx.fill();
  } else if (hg === 'golden_crown') {
    const crownGrad = ctx.createLinearGradient(-18, -42, 18, -14);
    crownGrad.addColorStop(0, '#fef08a');
    crownGrad.addColorStop(0.5, '#f59e0b');
    crownGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(-19, -14);
    ctx.lineTo(-14, -35);
    ctx.lineTo(-6, -22);
    ctx.lineTo(2, -41);
    ctx.lineTo(10, -22);
    ctx.lineTo(18, -35);
    ctx.lineTo(21, -14);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#451a03';
    ctx.stroke();

    // Crown ruby
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(2, -23, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
