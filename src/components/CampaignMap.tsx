import React, { useState } from 'react';
import { ArrowLeft, Crown, Swords, CheckCircle2, Lock, Flame } from 'lucide-react';
import { BOSS_CHARACTER, CHARACTERS, PLAYABLE_CHARACTERS } from '@shared/characters';
import { ARENAS } from '@shared/arenas';
import { ArenaId, CharacterId, Difficulty } from '@shared/types';
import { AudioManager } from '@/audio/AudioManager';
import { FighterPortrait } from './FighterPortrait';

export interface CampaignStage {
  stage: number;
  title: string;
  opponent: CharacterId;
  arenaId: ArenaId;
  difficulty: Difficulty;
  isBoss: boolean;
}

export const CAMPAIGN_LADDER: CampaignStage[] = [
  { stage: 1, title: 'Street Skirmish', opponent: 'muffler_man', arenaId: 'indian_street', difficulty: 'easy', isBoss: false },
  { stage: 2, title: 'Protest Showdown', opponent: 'didi_storm', arenaId: 'jantar_mantar', difficulty: 'medium', isBoss: false },
  { stage: 3, title: 'Mega Rally Clash', opponent: 'bulldozer_baba', arenaId: 'rally_stage', difficulty: 'medium', isBoss: false },
  { stage: 4, title: 'Floor Test Duel', opponent: 'chanakya_x', arenaId: 'parliament', difficulty: 'hard', isBoss: false },
  { stage: 5, title: 'FINAL SHOWDOWN', opponent: 'samrat_ordinance', arenaId: 'parliament', difficulty: 'hard', isBoss: true },
];

interface CampaignMapProps {
  playerChar: CharacterId;
  unlockedStage: number;
  onSelectPlayerChar: (id: CharacterId) => void;
  onBack: () => void;
  onStartStage: (stage: CampaignStage) => void;
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  playerChar,
  unlockedStage,
  onSelectPlayerChar,
  onBack,
  onStartStage,
}) => {
  const [bossIntroStage, setBossIntroStage] = useState<CampaignStage | null>(null);

  if (bossIntroStage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-950 via-slate-950 to-black flex items-center justify-center p-6">
        <div className="max-w-2xl w-full rounded-3xl border-2 border-amber-400/60 bg-slate-950/90 p-8 text-center space-y-6 shadow-2xl shadow-rose-900/40">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold uppercase tracking-widest">
            <Flame className="w-4 h-4" /> FINAL SHOWDOWN — CINEMATIC BOSS INTRO
          </div>

          <div className="flex justify-center">
            <FighterPortrait characterId="samrat_ordinance" size={140} />
          </div>

          <div className="space-y-2">
            <h1 className="font-arcade text-4xl font-extrabold text-amber-400">
              {BOSS_CHARACTER.name.toUpperCase()}
            </h1>
            <p className="text-sm font-bold text-rose-400">{BOSS_CHARACTER.title}</p>
            <p className="text-sm text-slate-300 max-w-lg mx-auto">
              &ldquo;{BOSS_CHARACTER.voiceLines.intro}&rdquo;
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs text-left">
            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30">
              <div className="font-bold text-amber-300">1,450 HP Armor</div>
              <div className="text-slate-400">Enters Emergency Overdrive at 45% HP!</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30">
              <div className="font-bold text-amber-300">Ordinance Meteors</div>
              <div className="text-slate-400">Rains executive meteors across the arena!</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30">
              <div className="font-bold text-amber-300">Grand Prize</div>
              <div className="text-slate-400">Earn the Boss Slayer Leaderboard Crown!</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setBossIntroStage(null)}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold cursor-pointer"
            >
              Retreat
            </button>
            <button
              onClick={() => onStartStage(bossIntroStage)}
              className="arcade-glow px-8 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 text-slate-950 font-arcade text-lg font-extrabold cursor-pointer"
            >
              CHALLENGE FINAL BOSS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center">
            <h1 className="font-arcade text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-rose-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
              FINAL SHOWDOWN CAMPAIGN
            </h1>
            <p className="text-xs text-slate-400">
              Defeat 4 rivals across India to face {BOSS_CHARACTER.name}
            </p>
          </div>
          <div className="w-20" />
        </div>

        {/* Choose Campaign Hero */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="font-arcade text-xs uppercase tracking-wider text-amber-400">
            Your Campaign Fighter
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PLAYABLE_CHARACTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  AudioManager.unlock();
                  void AudioManager.playVoice(c.id, 'select', 'campaign_pick');
                  onSelectPlayerChar(c.id);
                }}
                className={`p-2 rounded-xl border text-center cursor-pointer transition ${
                  playerChar === c.id
                    ? 'border-amber-400 bg-amber-500/20'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-center">
                  <FighterPortrait characterId={c.id} size={46} />
                </div>
                <div className="text-[10px] font-bold text-white truncate mt-1">{c.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Ladder */}
        <div className="space-y-3">
          {CAMPAIGN_LADDER.map((st) => {
            const opp = CHARACTERS[st.opponent];
            const arena = ARENAS[st.arenaId];
            const cleared = st.stage < unlockedStage;
            const unlocked = st.stage <= unlockedStage;

            return (
              <div
                key={st.stage}
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition ${
                  st.isBoss
                    ? 'bg-gradient-to-r from-rose-950/70 to-purple-950/70 border-rose-500/50'
                    : unlocked
                    ? 'bg-slate-900/85 border-amber-500/35'
                    : 'bg-slate-900/40 border-slate-800/70 opacity-65'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-arcade font-bold ${
                      st.isBoss
                        ? 'bg-rose-500 text-white'
                        : cleared
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {st.isBoss ? <Crown className="w-5 h-5" /> : st.stage}
                  </div>
                  <FighterPortrait characterId={opp.id} size={60} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-arcade text-lg font-bold text-white">
                        {st.title}: {opp.name}
                      </span>
                      {cleared && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-xs text-slate-400">
                      Arena: {arena.name} • Difficulty: <span className="uppercase text-amber-300">{st.difficulty}</span>
                    </div>
                  </div>
                </div>

                {unlocked ? (
                  <button
                    onClick={() => {
                      AudioManager.unlock();
                      if (st.isBoss) {
                        void AudioManager.playVoice('samrat_ordinance', 'intro', 'boss_intro');
                        setBossIntroStage(st);
                      } else {
                        void AudioManager.playSfx('fight');
                        onStartStage(st);
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-arcade text-sm font-bold cursor-pointer ${
                      st.isBoss
                        ? 'bg-gradient-to-r from-rose-500 to-amber-400 text-slate-950'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                    {cleared ? 'REPLAY' : st.isBoss ? 'FACE BOSS' : 'FIGHT'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold px-4">
                    <Lock className="w-4 h-4" /> Beat Stage {st.stage - 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
