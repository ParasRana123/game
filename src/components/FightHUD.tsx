import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, LogOut, Smartphone, Flame, Crown } from 'lucide-react';
import { CHARACTERS } from '@shared/characters';
import { InputState, MatchState } from '@shared/types';
import { TICK_RATE } from '@shared/combat/constants';
import { AudioControls } from './AudioControls';
import { FighterPortrait } from './FighterPortrait';

interface FightHUDProps {
  matchState: MatchState;
  p1Label: string;
  p2Label: string;
  isOnline: boolean;
  paused: boolean;
  onTogglePause: () => void;
  onQuitMatch: () => void;
  onTouchInput: (slot: 0 | 1, patch: Partial<InputState>) => void;
}

export const FightHUD: React.FC<FightHUDProps> = ({
  matchState,
  p1Label,
  p2Label,
  isOnline,
  paused,
  onTogglePause,
  onQuitMatch,
  onTouchInput,
}) => {
  const [showTouchPad, setShowTouchPad] = useState(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || window.innerWidth < 768)
  );

  const [f1, f2] = matchState.fighters;
  const c1 = CHARACTERS[f1.characterId];
  const c2 = CHARACTERS[f2.characterId];

  const p1Pct = Math.max(0, Math.min(100, (f1.hp / f1.maxHp) * 100));
  const p2Pct = Math.max(0, Math.min(100, (f2.hp / f2.maxHp) * 100));
  const secondsLeft = Math.max(0, Math.ceil(matchState.timerFrames / TICK_RATE));

  const touchBtn = (label: string, patch: Partial<InputState>, color = 'bg-slate-800/80') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onTouchInput(0, patch);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      const reset: Partial<InputState> = {};
      for (const k of Object.keys(patch) as Array<keyof InputState>) {
        if (k !== 'seq') reset[k] = false;
      }
      onTouchInput(0, reset);
    },
    onPointerLeave: () => {
      const reset: Partial<InputState> = {};
      for (const k of Object.keys(patch) as Array<keyof InputState>) {
        if (k !== 'seq') reset[k] = false;
      }
      onTouchInput(0, reset);
    },
    label,
    color,
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* Top Arcade HUD */}
      <div className="space-y-2">
        {matchState.isBossFight && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-[11px] font-arcade font-bold text-amber-300 shadow-lg">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              FINAL SHOWDOWN BOSS — PHASE {f2.bossPhase || 1}
              {f2.bossPhase === 2 && <span className="text-rose-400 animate-pulse">(OVERDRIVE!)</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4 max-w-6xl mx-auto w-full">
          {/* P1 Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block shrink-0">
              <FighterPortrait characterId={f1.characterId} size={52} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-arcade font-bold text-amber-300 truncate">
                  {c1.name.toUpperCase()} <span className="text-slate-400 font-normal">({p1Label})</span>
                </span>
                <div className="flex gap-1">
                  {[0, 1].map((orb) => (
                    <span
                      key={orb}
                      className={`w-2.5 h-2.5 rounded-full border ${
                        f1.roundsWon > orb
                          ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#facc15]'
                          : 'bg-slate-900 border-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* HP Bar */}
              <div className="h-4 sm:h-5 rounded-md bg-slate-950/90 border-2 border-slate-700 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${p1Pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white drop-shadow">
                  {f1.hp} / {f1.maxHp}
                </span>
              </div>

              {/* Special Meter */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      f1.meter >= 100
                        ? 'bg-gradient-to-r from-amber-300 to-rose-500 animate-pulse'
                        : 'bg-sky-400'
                    }`}
                    style={{ width: `${f1.meter}%` }}
                  />
                </div>
                {f1.meter >= 100 && (
                  <span className="text-[10px] font-arcade font-bold text-amber-300 animate-bounce">
                    SPECIAL [T]
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Timer + Controls */}
          <div className="flex flex-col items-center gap-1">
            <div className="px-3 sm:px-4 py-1 rounded-xl bg-slate-950/95 border-2 border-amber-500/60 text-center shadow-lg">
              <div className="text-[9px] font-arcade text-amber-400 leading-none">
                ROUND {matchState.round}
              </div>
              <div className="font-arcade text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {secondsLeft}
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              {!isOnline && (
                <button
                  onClick={onTogglePause}
                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 cursor-pointer"
                  title="Pause"
                >
                  {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={() => setShowTouchPad((v) => !v)}
                className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-sky-400 text-slate-200 cursor-pointer"
                title="Toggle On-Screen Controls"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <AudioControls compact />
            </div>
          </div>

          {/* P2 Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-row-reverse">
            <div className="hidden sm:block shrink-0">
              <FighterPortrait characterId={f2.characterId} size={52} flip />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs flex-row-reverse">
                <span className="font-arcade font-bold text-sky-300 truncate">
                  {c2.name.toUpperCase()} <span className="text-slate-400 font-normal">({p2Label})</span>
                </span>
                <div className="flex gap-1">
                  {[0, 1].map((orb) => (
                    <span
                      key={orb}
                      className={`w-2.5 h-2.5 rounded-full border ${
                        f2.roundsWon > orb
                          ? 'bg-sky-400 border-sky-200 shadow-[0_0_8px_#38bdf8]'
                          : 'bg-slate-900 border-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="h-4 sm:h-5 rounded-md bg-slate-950/90 border-2 border-slate-700 overflow-hidden relative">
                <div
                  className={`h-full ml-auto transition-all duration-150 ${
                    matchState.isBossFight
                      ? 'bg-gradient-to-l from-rose-600 via-purple-500 to-amber-400'
                      : 'bg-gradient-to-l from-sky-500 via-cyan-400 to-emerald-400'
                  }`}
                  style={{ width: `${p2Pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-end px-2 text-[10px] font-bold text-white drop-shadow">
                  {f2.hp} / {f2.maxHp}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-row-reverse">
                <div className="flex-1 h-2 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                  <div
                    className={`h-full ml-auto transition-all duration-150 ${
                      f2.meter >= 100
                        ? 'bg-gradient-to-l from-amber-300 to-rose-500 animate-pulse'
                        : 'bg-purple-400'
                    }`}
                    style={{ width: `${f2.meter}%` }}
                  />
                </div>
                {f2.meter >= 100 && (
                  <span className="text-[10px] font-arcade font-bold text-sky-300 animate-bounce">
                    SPECIAL READY
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Combo Counters */}
        <div className="max-w-6xl mx-auto w-full flex justify-between px-2">
          <div>
            {f1.comboCounter >= 2 && (
              <div className="font-arcade text-xl sm:text-2xl font-extrabold text-amber-400 drop-shadow-[0_2px_10px_rgba(249,115,22,0.8)] animate-pulse">
                {f1.comboCounter} HIT COMBO!
              </div>
            )}
          </div>
          <div>
            {f2.comboCounter >= 2 && (
              <div className="font-arcade text-xl sm:text-2xl font-extrabold text-sky-400 drop-shadow-[0_2px_10px_rgba(56,189,248,0.8)] animate-pulse">
                {f2.comboCounter} HIT COMBO!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Dramatic Announcements & Special Banner */}
      <div className="flex flex-col items-center justify-start gap-3 my-auto pt-2">
        <AnimatePresence>
          {matchState.specialBanner && (
            <motion.div
              key={matchState.specialBanner.title}
              initial={{ scale: 0.75, opacity: 0, y: -12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600/95 via-amber-500/95 to-rose-600/95 border-2 border-yellow-200 shadow-2xl text-center"
            >
              <div className="flex items-center justify-center gap-2 font-arcade text-xl sm:text-2xl font-extrabold text-slate-950">
                <Flame className="w-5 h-5" />
                {matchState.specialBanner.title}
              </div>
              <div className="text-xs font-bold text-slate-950/90 italic">
                &ldquo;{matchState.specialBanner.subtitle}&rdquo;
              </div>
              <div className="mt-1 inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-950/85 text-[10px] font-arcade font-bold text-amber-300 tracking-wider">
                UNBLOCKABLE • SUPREME DAMAGE • OPPONENT ATTACKS LOCKED
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {matchState.phase === 'intro' && (
          <div className="px-6 py-2 rounded-xl bg-slate-950/80 border border-amber-500/40 font-arcade text-xl sm:text-2xl font-bold text-amber-300">
            GET READY!
          </div>
        )}

        {matchState.phase === 'countdown' && (
          <motion.div
            key={matchState.countdownSeconds}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-arcade text-6xl sm:text-8xl font-extrabold text-amber-400 drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
          >
            {matchState.countdownSeconds > 0 ? matchState.countdownSeconds : 'FIGHT!'}
          </motion.div>
        )}

        {matchState.phase === 'fighting' && matchState.timerFrames > 5880 && (
          <div className="font-arcade text-5xl sm:text-7xl font-extrabold text-emerald-400 drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            FIGHT!
          </div>
        )}

        {matchState.phase === 'round_over' && (
          <div className="px-8 py-4 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-center shadow-2xl">
            <div className="font-arcade text-4xl sm:text-5xl font-extrabold text-rose-400">
              {f1.hp <= 0 || f2.hp <= 0 ? 'K.O.!' : 'TIME OVER!'}
            </div>
            <div className="font-arcade text-lg text-amber-300 mt-1">
              {f1.hp > f2.hp ? `${c1.name} WINS THE ROUND!` : f2.hp > f1.hp ? `${c2.name} WINS THE ROUND!` : 'DRAW ROUND!'}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Touch Controls for Mobile / Toggle */}
      {showTouchPad ? (
        <div className="pointer-events-auto flex items-end justify-between gap-2 pb-1">
          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1.5 w-36">
            <div />
            <TouchPadBtn {...touchBtn('▲', { up: true })} />
            <div />
            <TouchPadBtn {...touchBtn('◀', { left: true })} />
            <TouchPadBtn {...touchBtn('▼', { down: true })} />
            <TouchPadBtn {...touchBtn('▶', { right: true })} />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <TouchPadBtn {...touchBtn('PUNCH', { punch: true }, 'bg-orange-600/85')} />
            <TouchPadBtn {...touchBtn('KICK', { kick: true }, 'bg-amber-600/85')} />
            <TouchPadBtn {...touchBtn('BLOCK', { block: true }, 'bg-sky-600/85')} />
            <TouchPadBtn {...touchBtn('GRAB', { grab: true }, 'bg-emerald-600/85')} />
            <TouchPadBtn
              {...touchBtn(
                'SPECIAL',
                { special: true },
                f1.meter >= 100 ? 'bg-rose-600 animate-pulse col-span-2' : 'bg-slate-700/70 col-span-2'
              )}
              wide
            />
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex justify-center">
          <div className="px-3 py-1 rounded-full bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
            P1: <strong className="text-slate-200">WASD</strong> Move • <strong className="text-slate-200">F</strong> Punch • <strong className="text-slate-200">G</strong> Kick • <strong className="text-slate-200">H</strong> Block • <strong className="text-slate-200">R</strong> Grab • <strong className="text-amber-300">T</strong> Special
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {paused && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-amber-500/40 p-6 space-y-5 text-center">
            <h2 className="font-arcade text-3xl font-extrabold text-amber-400">MATCH PAUSED</h2>
            <AudioControls />
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onTogglePause}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade font-bold cursor-pointer"
              >
                RESUME FIGHT
              </button>
              <button
                onClick={onQuitMatch}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-rose-500/40 hover:bg-rose-500/15 text-rose-300 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Quit to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TouchPadBtn: React.FC<{
  label: string;
  color: string;
  wide?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerLeave: () => void;
}> = ({ label, color, wide, onPointerDown, onPointerUp, onPointerLeave }) => (
  <button
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerLeave}
    onPointerLeave={onPointerLeave}
    className={`${color} ${
      wide ? 'col-span-2 px-4' : 'px-2.5'
    } py-2.5 rounded-xl border border-white/25 text-white font-arcade text-[11px] font-bold active:scale-95 touch-none`}
  >
    {label}
  </button>
);
