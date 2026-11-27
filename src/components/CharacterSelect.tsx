import React, { useState } from 'react';
import { ArrowLeft, Swords, Volume2, Shield, Zap, Gauge, Flame, Eye } from 'lucide-react';
import { PLAYABLE_CHARACTERS, CHARACTERS } from '@shared/characters';
import { ARENA_LIST } from '@shared/arenas';
import { ArenaId, CharacterId, Difficulty } from '@shared/types';
import { AudioManager } from '@/audio/AudioManager';
import { FighterPortrait } from './FighterPortrait';
import { Character3DInspectorModal } from './Character3DInspectorModal';

interface CharacterSelectProps {
  mode: 'single_ai' | 'local_2p';
  initialP1Char?: CharacterId;
  onBack: () => void;
  onStartMatch: (cfg: {
    p1Char: CharacterId;
    p2Char: CharacterId;
    arenaId: ArenaId;
    difficulty: Difficulty;
  }) => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  mode,
  initialP1Char = 'vikas_guru',
  onBack,
  onStartMatch,
}) => {
  const [p1Char, setP1Char] = useState<CharacterId>(initialP1Char);
  const [p2Char, setP2Char] = useState<CharacterId>('muffler_man');
  const [arenaId, setArenaId] = useState<ArenaId>('parliament');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [pickingSlot, setPickingSlot] = useState<0 | 1>(0);
  const [inspectChar, setInspectChar] = useState<CharacterId | null>(null);

  const p1Def = CHARACTERS[p1Char];
  const p2Def = CHARACTERS[p2Char];

  const handleSelectChar = (id: CharacterId) => {
    AudioManager.unlock();
    void AudioManager.playVoice(id, 'select', `select_${pickingSlot}`);
    if (pickingSlot === 0) {
      setP1Char(id);
    } else {
      setP2Char(id);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-arcade text-2xl sm:text-3xl font-bold text-amber-400">
            {mode === 'local_2p' ? 'LOCAL 2P — SELECT FIGHTERS' : 'SINGLE PLAYER — CHARACTER SELECT'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPickingSlot(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                pickingSlot === 0
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              Picking: P1
            </button>
            <button
              onClick={() => setPickingSlot(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                pickingSlot === 1
                  ? 'bg-sky-500 text-slate-950 border-sky-300'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              Picking: {mode === 'local_2p' ? 'P2' : 'CPU'}
            </button>
          </div>
        </div>

        {/* Selected Matchup Banner */}
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <FighterCardPreview label="PLAYER 1" def={p1Def} accent="amber" onInspect3D={() => setInspectChar(p1Def.id)} />
          <div className="font-arcade text-3xl font-extrabold text-rose-500 text-center px-2">
            VS
          </div>
          <FighterCardPreview
            label={mode === 'local_2p' ? 'PLAYER 2' : `CPU (${difficulty.toUpperCase()})`}
            def={p2Def}
            accent="sky"
            flip
            onInspect3D={() => setInspectChar(p2Def.id)}
          />
        </div>

        {/* 9-Character Roster Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {PLAYABLE_CHARACTERS.map((c) => {
            const isP1 = p1Char === c.id;
            const isP2 = p2Char === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectChar(c.id)}
                className={`relative p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  isP1 && isP2
                    ? 'border-emerald-400 bg-emerald-500/15'
                    : isP1
                    ? 'border-amber-400 bg-amber-500/15'
                    : isP2
                    ? 'border-sky-400 bg-sky-500/15'
                    : 'border-slate-800 bg-slate-900/75 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-center mb-1.5">
                  <FighterPortrait characterId={c.id} size={60} />
                </div>
                <div className="font-arcade text-xs font-bold text-white truncate">{c.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{c.title}</div>
                {(isP1 || isP2) && (
                  <div className="mt-1 flex justify-center gap-1">
                    {isP1 && (
                      <span className="text-[10px] px-1.5 rounded bg-amber-500 text-slate-950 font-bold">
                        P1
                      </span>
                    )}
                    {isP2 && (
                      <span className="text-[10px] px-1.5 rounded bg-sky-500 text-slate-950 font-bold">
                        {mode === 'local_2p' ? 'P2' : 'CPU'}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Arena & Difficulty Controls */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <div className="font-arcade text-xs uppercase tracking-wider text-slate-400">
              Select Arena
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ARENA_LIST.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    void AudioManager.playSfx('ui_click');
                    setArenaId(a.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    arenaId === a.id
                      ? 'border-amber-400 bg-amber-500/15'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                  }`}
                >
                  <div className="font-arcade text-xs font-bold text-white">{a.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{a.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mode === 'single_ai' && (
              <div className="space-y-1.5">
                <div className="font-arcade text-xs uppercase tracking-wider text-slate-400">
                  AI Difficulty
                </div>
                <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-3.5 py-2 text-xs font-bold uppercase cursor-pointer ${
                        difficulty === d
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                AudioManager.unlock();
                void AudioManager.playSfx('fight');
                onStartMatch({ p1Char, p2Char, arenaId, difficulty });
              }}
              className="arcade-glow flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-arcade text-lg font-extrabold tracking-wider hover:scale-105 transition cursor-pointer"
            >
              <Swords className="w-5 h-5" />
              START FIGHT
            </button>
          </div>
        </div>
      </div>
      {inspectChar && (
        <Character3DInspectorModal
          initialCharId={inspectChar}
          onClose={() => setInspectChar(null)}
        />
      )}
    </div>
  );
};

const FighterCardPreview: React.FC<{
  label: string;
  def: (typeof CHARACTERS)[CharacterId];
  accent: 'amber' | 'sky';
  flip?: boolean;
  onInspect3D: () => void;
}> = ({ label, def, accent, flip, onInspect3D }) => {
  const border = accent === 'amber' ? 'border-amber-500/40' : 'border-sky-500/40';
  const badge = accent === 'amber' ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-slate-950';
  return (
    <div className={`p-4 rounded-2xl bg-slate-900/85 border ${border} space-y-3`}>
      <div className="flex items-center gap-3.5">
        <FighterPortrait characterId={def.id} size={76} flip={flip} />
        <div className="flex-1 min-w-0">
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${badge}`}>{label}</span>
          <h2 className="font-arcade text-xl font-bold text-white truncate mt-1">{def.name}</h2>
          <p className="text-xs text-slate-400 truncate">{def.title}</p>
        </div>
        <button
          onClick={onInspect3D}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer"
          title="Inspect 3D Model (5 Angles)"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            AudioManager.unlock();
            void AudioManager.playVoice(def.id, 'special', `preview_${label}`);
          }}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
          title="Preview Special Voice"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-[11px]">
        <StatPill icon={<Gauge className="w-3 h-3 text-sky-400" />} label="SPD" val={def.stats.speedRating} />
        <StatPill icon={<Zap className="w-3 h-3 text-orange-400" />} label="PWR" val={def.stats.powerRating} />
        <StatPill icon={<Shield className="w-3 h-3 text-emerald-400" />} label="DEF" val={def.stats.defenseRating} />
        <StatPill icon={<Flame className="w-3 h-3 text-rose-400" />} label="SPC" val={def.stats.specialRating} />
      </div>

      <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-amber-300 truncate">
        Special: <strong>{def.specialName}</strong>
      </div>
    </div>
  );
};

const StatPill: React.FC<{ icon: React.ReactNode; label: string; val: number }> = ({
  icon,
  label,
  val,
}) => (
  <div className="px-2 py-1 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between">
    <span className="flex items-center gap-1 text-slate-400">
      {icon}
      {label}
    </span>
    <span className="font-bold text-white">{val}</span>
  </div>
);
