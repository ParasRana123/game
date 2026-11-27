import React, { useEffect, useRef } from 'react';
import { CHARACTERS } from '@shared/characters';
import { CharacterId } from '@shared/types';
import { hexToRgba, shadeHex } from '@/game/rendering/CanvasArtHelpers';
import { drawDetailedHead } from '@/game/rendering/FighterHeadBaker';

interface FighterPortraitProps {
  characterId: CharacterId;
  size?: number;
  flip?: boolean;
  className?: string;
}

export const FighterPortrait: React.FC<FighterPortraitProps> = ({
  characterId,
  size = 72,
  flip = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const def = CHARACTERS[characterId];

  useEffect(() => {
    if (def.portraitImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = 2;
    const res = 120 * dpr;
    canvas.width = res;
    canvas.height = res;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 120, 120);

    const { primary, secondary, accent, aura } = def.palette;

    // Rounded card clipping
    ctx.beginPath();
    ctx.roundRect(3, 3, 114, 114, 20);
    ctx.clip();

    // Dramatic radial fight-card backdrop
    const bgGrad = ctx.createRadialGradient(60, 44, 6, 60, 60, 74);
    bgGrad.addColorStop(0, hexToRgba(aura, 0.58));
    bgGrad.addColorStop(0.55, '#14192b');
    bgGrad.addColorStop(1, '#070912');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 120, 120);

    // Subtle arcade diagonal speed lines
    ctx.strokeStyle = hexToRgba(accent, 0.14);
    ctx.lineWidth = 3;
    for (let x = -20; x < 140; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x + 48, 0);
      ctx.stroke();
    }

    // Shoulders & Detailed Attire
    const shoulderGrad = ctx.createLinearGradient(18, 76, 102, 120);
    shoulderGrad.addColorStop(0, shadeHex(primary, 18));
    shoulderGrad.addColorStop(1, shadeHex(primary, -28));
    ctx.fillStyle = shoulderGrad;
    ctx.beginPath();
    ctx.moveTo(14, 120);
    ctx.quadraticCurveTo(22, 82, 60, 82);
    ctx.quadraticCurveTo(98, 82, 106, 120);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    if (def.headgear === 'beard_glasses') {
      // Mitron cream kurta V-collar + pocket square
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(46, 82);
      ctx.lineTo(74, 82);
      ctx.lineTo(60, 108);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(79, 98, 12, 6);
    } else if (def.headgear === 'gandhi_cap_muffler') {
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.roundRect(30, 80, 60, 16, 7);
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.stroke();
    } else if (def.headgear === 'saree_bun') {
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.moveTo(28, 88);
      ctx.lineTo(86, 120);
      ctx.lineTo(66, 120);
      ctx.lineTo(20, 98);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.moveTo(44, 83);
      ctx.lineTo(76, 83);
      ctx.lineTo(60, 106);
      ctx.closePath();
      ctx.fill();
    }

    // 2.5D Shaded Head
    drawDetailedHead(ctx, def, 58, 52, def.isBoss ? 'fierce' : 'neutral');

    // Card rim border
    ctx.restore();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(3, 3, 114, 114, 20);
    ctx.stroke();
    ctx.restore();
  }, [characterId, def]);

  if (def.portraitImage) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl shadow-lg bg-slate-950 ${className}`}
        style={{
          width: size,
          height: size,
          border: `2.5px solid ${def.palette.accent}`,
          boxShadow: `0 0 18px ${hexToRgba(def.palette.aura, 0.45)}`,
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      >
        <img
          src={def.portraitImage}
          alt={def.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={240}
      aria-label={def.name}
      className={`rounded-2xl shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    />
  );
};
