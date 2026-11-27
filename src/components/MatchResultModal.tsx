import React from 'react';
import { Trophy, RotateCcw, Home, ArrowRight, Crown } from 'lucide-react';
import { CHARACTERS } from '@shared/characters';
import { GameMode, MatchState, RoomState } from '@shared/types';
import { FighterPortrait } from './FighterPortrait';

interface MatchResultModalProps {
  mode: GameMode;
  matchState: MatchState;
  durationSec: number;
  campaignStage?: number;
  isCampaignComplete?: boolean;
  onlineRoom?: RoomState | null;
  localSlot?: 0 | 1;
  onRematch: () => void;
  onNextCampaignStage?: () => void;
  onVoteOnlineRematch?: () => void;
  onExit: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  mode,
  matchState,
  durationSec,
  campaignStage,
  isCampaignComplete,
  onlineRoom,
  localSlot = 0,
  onRematch,
  onNextCampaignStage,
  onVoteOnlineRematch,
  onExit,
}) => {
  const [f1, f2] = matchState.fighters;
  const winnerIdx = matchState.winnerIndex;
  const winnerFighter = winnerIdx === 1 ? f2 : f1;
  const winnerDef = CHARACTERS[winnerFighter.characterId];
  const playerWon = mode === 'online' ? winnerIdx === localSlot : winnerIdx === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-950 border-2 border-amber-500/50 shadow-2xl p-6 sm:p-8 text-center space-y-5">
        {isCampaignComplete ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 to-rose-500/30 border border-amber-400 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Crown className="w-4 h-4" /> FINAL SHOWDOWN CHAMPION!
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase">
            <Trophy className="w-4 h-4" /> MATCH COMPLETE • {durationSec}s
          </div>
        )}

        <div className="flex justify-center">
          <FighterPortrait characterId={winnerFighter.characterId} size={112} />
        </div>

        <div className="space-y-1">
          <h2 className="font-arcade text-3xl sm:text-4xl font-extrabold text-white">
            {winnerIdx === 'draw'
              ? 'DOUBLE K.O. DRAW!'
              : `${winnerDef.name.toUpperCase()} WINS!`}
          </h2>
          <p className="text-sm text-amber-300 italic">
            &ldquo;{winnerDef.voiceLines.win}&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-3 items-center p-3 rounded-xl bg-slate-900 border border-slate-800 font-arcade">
          <div>
            <div className="text-xs text-slate-400">{CHARACTERS[f1.characterId].name}</div>
            <div className="text-2xl font-bold text-amber-400">{f1.roundsWon}</div>
          </div>
          <div className="text-sm text-slate-500">ROUNDS</div>
          <div>
            <div className="text-xs text-slate-400">{CHARACTERS[f2.characterId].name}</div>
            <div className="text-2xl font-bold text-sky-400">{f2.roundsWon}</div>
          </div>
        </div>

        {isCampaignComplete && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm">
            Congratulations! You defeated Samrat Ordinance and conquered the Sansad Vault! Your Boss Slayer title is recorded on the leaderboard.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {mode === 'online' ? (
            <button
              onClick={onVoteOnlineRematch}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade font-bold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {onlineRoom?.rematchVotes[localSlot]
                ? 'WAITING FOR OPPONENT...'
                : 'REMATCH'}
            </button>
          ) : mode === 'campaign' && playerWon && !isCampaignComplete && onNextCampaignStage ? (
            <button
              onClick={onNextCampaignStage}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-arcade font-extrabold cursor-pointer"
            >
              NEXT STAGE ({(campaignStage || 1) + 1}/5) <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRematch}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade font-bold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> REMATCH
            </button>
          )}

          <button
            onClick={onExit}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-arcade font-bold cursor-pointer"
          >
            <Home className="w-4 h-4" /> {mode === 'campaign' ? 'CAMPAIGN MAP' : 'MAIN MENU'}
          </button>
        </div>
      </div>
    </div>
  );
};
