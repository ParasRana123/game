import React from 'react';
import { CHARACTERS } from '@shared/characters';
import { CharacterId } from '@shared/types';

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
  const def = CHARACTERS[characterId];
  const { skin, primary, secondary, accent, hair, aura } = def.palette;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <defs>
        <radialGradient id={`bg_${characterId}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={aura} stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="18" fill={`url(#bg_${characterId})`} stroke={accent} strokeWidth="3" />

      {/* Shoulders / Kurta */}
      <path d="M18 96 C20 70, 80 70, 82 96 Z" fill={primary} />
      <path d="M35 96 L38 74 L62 74 L65 96 Z" fill={secondary} opacity="0.9" />

      {def.headgear === 'beard_glasses' && (
        <>
          <polygon points="41,72 59,72 50,87" fill="#ffffff" />
          <rect x="64" y="79" width="8" height="4" rx="1" fill="#facc15" />
        </>
      )}

      {def.headgear === 'gandhi_cap_muffler' && (
        <rect x="26" y="68" width="48" height="12" rx="6" fill={secondary} />
      )}

      {/* Head */}
      <circle cx="50" cy="46" r="21" fill={skin} stroke="#0f172a" strokeWidth="2" />

      {/* Eyes */}
      <circle cx="43" cy="43" r="2.8" fill="#0f172a" />
      <circle cx="57" cy="43" r="2.8" fill="#0f172a" />

      {/* Smile / Grin */}
      <path d="M43 54 Q50 59 57 54" stroke="#0f172a" strokeWidth="2.4" fill="none" strokeLinecap="round" />

      {/* Headgear variations */}
      {def.headgear === 'beard_glasses' && (
        <>
          <ellipse cx="50" cy="27" rx="19" ry="7" fill={hair} />
          <path d="M32 50 Q50 76 68 50 L62 67 Q50 74 38 67 Z" fill={hair} />
          <circle cx="43" cy="43" r="6" fill="none" stroke={accent} strokeWidth="2" />
          <circle cx="57" cy="43" r="6" fill="none" stroke={accent} strokeWidth="2" />
          <line x1="49" y1="43" x2="51" y2="43" stroke={accent} strokeWidth="2" />
        </>
      )}

      {def.headgear === 'youth_hair' && (
        <path d="M29 42 Q32 20 53 22 Q70 22 71 41 Q58 31 39 33 Z" fill={hair} />
      )}

      {def.headgear === 'gandhi_cap_muffler' && (
        <>
          <path d="M30 33 Q50 14 70 33 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="42" y="49" width="16" height="3" rx="1.5" fill={hair} />
        </>
      )}

      {def.headgear === 'saree_bun' && (
        <>
          <circle cx="28" cy="38" r="9" fill={hair} />
          <ellipse cx="50" cy="28" rx="19" ry="8" fill={hair} />
        </>
      )}

      {def.headgear === 'cinema_shades' && (
        <>
          <ellipse cx="50" cy="27" rx="20" ry="8" fill={hair} />
          <rect x="33" y="37" width="14" height="9" rx="2" fill="#020617" stroke={accent} strokeWidth="1.5" />
          <rect x="53" y="37" width="14" height="9" rx="2" fill="#020617" stroke={accent} strokeWidth="1.5" />
          <line x1="47" y1="41" x2="53" y2="41" stroke={accent} strokeWidth="2" />
        </>
      )}

      {def.headgear === 'saffron_bald' && (
        <>
          <rect x="48.5" y="29" width="3" height="8" rx="1" fill="#dc2626" />
          <rect x="34" y="38" width="13" height="8" rx="2" fill="#0f172a" />
          <rect x="53" y="38" width="13" height="8" rx="2" fill="#0f172a" />
        </>
      )}

      {def.headgear === 'rustic_hair' && (
        <>
          <path d="M28 40 Q35 20 50 22 Q65 20 72 40 Q56 28 38 30 Z" fill={hair} />
          <rect x="42" y="49" width="16" height="3.5" rx="1.5" fill="#475569" />
        </>
      )}

      {def.headgear === 'tactical_beard' && (
        <>
          <ellipse cx="50" cy="27" rx="18" ry="6" fill={hair} />
          <path d="M34 49 Q50 70 66 49 L62 63 Q50 69 38 63 Z" fill={hair} />
        </>
      )}

      {def.headgear === 'golden_crown' && (
        <>
          <polygon points="32,30 38,12 45,27 50,8 55,27 62,12 68,30" fill="#facc15" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="50" cy="23" r="3" fill="#ef4444" />
        </>
      )}
    </svg>
  );
};
