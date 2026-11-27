import React, { useEffect, useRef, useState } from 'react';
import { CHARACTERS } from '@shared/characters';
import { CharacterId } from '@shared/types';
import { hexToRgba, shadeHex } from '@/game/rendering/CanvasArtHelpers';
import { drawDetailedHead } from '@/game/rendering/FighterHeadBaker';
import { getCachedPortrait3D, renderPortrait3D } from '@/game/three/Portrait3DRenderer';

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
  const [modelUrl, setModelUrl] = useState<string | null>(() => getCachedPortrait3D(characterId));

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedPortrait3D(characterId);
    if (cached) {
      setModelUrl(cached);
      return;
    }
    setModelUrl(null);
    void renderPortrait3D(characterId).then((url) => {
      if (!cancelled && url) setModelUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  useEffect(() => {
    if (modelUrl) return;
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

    ctx.beginPath();
    ctx.roundRect(3, 3, 114, 114, 20);
    ctx.clip();

    const bgGrad = ctx.createRadialGradient(60, 44, 6, 60, 60, 74);
    bgGrad.addColorStop(0, hexToRgba(aura, 0.58));
    bgGrad.addColorStop(0.55, '#14192b');
    bgGrad.addColorStop(1, '#070912');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 120, 120);

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

    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(44, 83);
    ctx.lineTo(76, 83);
    ctx.lineTo(60, 106);
    ctx.closePath();
    ctx.fill();

    drawDetailedHead(ctx, def, 58, 52, def.isBoss ? 'fierce' : 'neutral');

    ctx.restore();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(3, 3, 114, 114, 20);
    ctx.stroke();
    ctx.restore();
  }, [characterId, def, modelUrl]);

  if (modelUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl shadow-lg ${className}`}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 50% 42%, ${hexToRgba(def.palette.aura, 0.55)}, #0a0e1a 78%)`,
          border: `2.5px solid ${def.palette.accent}`,
          boxShadow: `0 0 16px ${hexToRgba(def.palette.aura, 0.35)}`,
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      >
        <img
          src={modelUrl}
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
