/**
 * 2.5D painterly canvas helpers for realistic lighting, skin shading,
 * cloth folds, and anatomical limb rendering used across Phaser texture baking
 * and UI portraits.
 */

export function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `rgb(${r}, ${g}, ${b})`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function drawShadedCapsule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number,
  baseColor: string,
  outlineColor = 'rgba(10, 14, 26, 0.78)'
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const grad = ctx.createLinearGradient(x1 + nx * r1, y1 + ny * r1, x1 - nx * r1, y1 - ny * r1);
  grad.addColorStop(0, shadeHex(baseColor, 18));
  grad.addColorStop(0.5, baseColor);
  grad.addColorStop(1, shadeHex(baseColor, -24));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = outlineColor;
  ctx.stroke();

  // Subtle rim highlight along top-left edge
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (r1 * 0.65), y1 + ny * (r1 * 0.65));
  ctx.lineTo(x2 + nx * (r2 * 0.65), y2 + ny * (r2 * 0.65));
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

export function drawClothFolds(
  ctx: CanvasRenderingContext2D,
  lines: Array<[number, number, number, number, number, number]>,
  color: string,
  alpha = 0.28
): void {
  ctx.save();
  ctx.strokeStyle = hexToRgba(color, alpha);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [x1, y1, cx, cy, x2, y2] of lines) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}
