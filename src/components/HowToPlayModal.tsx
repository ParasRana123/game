import React from 'react';
import { X, Keyboard, Flame, Shield, Swords } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-950 border border-amber-500/40 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-6 h-6 text-amber-400" />
            <h2 className="font-arcade text-2xl font-bold text-white">HOW TO PLAY & CONTROLS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/20 space-y-2">
            <h3 className="font-arcade text-sm font-bold text-amber-400">
              PLAYER 1 CONTROLS (Also Single Player / Online)
            </h3>
            <ul className="text-sm text-slate-300 space-y-1.5">
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">A / D</kbd> or <kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">← / →</kbd> — Walk Left / Right</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">Shift</kbd> + Move — Sprint / Dash</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">W</kbd> / <kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">S</kbd> — Jump / Crouch</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">F</kbd> — Light Punch (fast startup)</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">G</kbd> — Heavy Kick</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">W + F</kbd> — Anti-Air Uppercut Launcher</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">H</kbd> (or Hold Back) — Block Attacks</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">R</kbd> — Political Throw (Breaks Block!)</li>
              <li><kbd className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold">T</kbd> — Signature Special Attack (100% Meter)</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-500/20 space-y-2">
            <h3 className="font-arcade text-sm font-bold text-sky-400">
              PLAYER 2 CONTROLS (Local Couch 2P Mode)
            </h3>
            <ul className="text-sm text-slate-300 space-y-1.5">
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">← / →</kbd> — Walk Left / Right</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">↑ / ↓</kbd> — Jump / Crouch</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">J</kbd> — Light Punch</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">K</kbd> — Heavy Kick</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">↑ + J</kbd> — Anti-Air Uppercut</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">L</kbd> — Block</li>
              <li><kbd className="px-2 py-0.5 rounded bg-slate-800 text-white">U</kbd> — Political Throw</li>
              <li><kbd className="px-2 py-0.5 rounded bg-sky-600 text-white font-bold">I</kbd> — Signature Special Attack (100% Meter)</li>
            </ul>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
              <Swords className="w-4 h-4" /> Chain Combos
            </div>
            <p className="text-xs text-slate-400">
              Land a Punch (<code className="text-slate-200">F</code>), then immediately chain into Kick (<code className="text-slate-200">G</code>) and Uppercut (<code className="text-slate-200">F/G</code>) or cancel into your Special (<code className="text-slate-200">T</code>)!
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-1">
              <Shield className="w-4 h-4" /> Block vs Throw
            </div>
            <p className="text-xs text-slate-400">
              Blocking absorbs 90% of normal damage. Counter defensive opponents with close-range Throw (<code className="text-slate-200">R</code>), which is unblockable!
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
              <Flame className="w-4 h-4" /> Special Meter
            </div>
            <p className="text-xs text-slate-400">
              Dealing hits, blocking, and taking damage fills your Special Meter. At 100%, unleash your character&apos;s voiced Signature Special!
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">F9</kbd> during a match to toggle live Hitbox & Hurtbox debug view. Touch arcade controls automatically work on mobile!
        </p>
      </div>
    </div>
  );
};
