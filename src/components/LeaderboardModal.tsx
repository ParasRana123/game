import React, { useEffect, useState } from 'react';
import { Trophy, X, UserCheck, History, Crown } from 'lucide-react';
import { MatchRecord, PlayerProfile } from '@shared/types';
import { CHARACTERS } from '@shared/characters';
import { FighterPortrait } from './FighterPortrait';

interface LeaderboardModalProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  playerName,
  onUpdatePlayerName,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(playerName);
  const [leaders, setLeaders] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lbRes, mRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/matches'),
      ]);
      if (lbRes.ok) {
        const d = (await lbRes.json()) as { leaderboard: PlayerProfile[] };
        setLeaders(d.leaderboard || []);
      }
      if (mRes.ok) {
        const d = (await mRes.json()) as { matches: MatchRecord[] };
        setMatches(d.matches || []);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;
    onUpdatePlayerName(clean);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: clean }),
      });
      setSavedMsg('Profile synced!');
      await loadData();
    } catch {
      setSavedMsg('Saved locally');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-950 border border-amber-500/40 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="font-arcade text-2xl font-bold text-white">SANSAD RANKINGS & HISTORY</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={nameInput}
            maxLength={20}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your Netaji Callsign..."
            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Save Callsign
          </button>
          {savedMsg && <span className="text-xs text-emerald-400">{savedMsg}</span>}
        </form>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-arcade text-sm font-bold text-amber-400 flex items-center gap-2">
              <Crown className="w-4 h-4" /> TOP CHAMPIONS
            </h3>
            {loading ? (
              <p className="text-sm text-slate-400">Loading rankings...</p>
            ) : leaders.length === 0 ? (
              <p className="text-sm text-slate-500">No ranked matches recorded yet. Fight a match to claim #1!</p>
            ) : (
              <div className="space-y-2">
                {leaders.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-arcade text-sm font-bold text-amber-400 w-6">#{idx + 1}</span>
                      <FighterPortrait characterId={p.favoriteCharacter} size={36} />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {p.username}
                          {p.campaignCleared && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              BOSS SLAYER
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          Main: {CHARACTERS[p.favoriteCharacter]?.name || p.favoriteCharacter}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-emerald-400">{p.wins}W - {p.losses}L</div>
                      <div className="text-slate-400">Streak: {p.streak}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-arcade text-sm font-bold text-sky-400 flex items-center gap-2">
              <History className="w-4 h-4" /> RECENT MATCHES
            </h3>
            {loading ? (
              <p className="text-sm text-slate-400">Loading match log...</p>
            ) : matches.length === 0 ? (
              <p className="text-sm text-slate-500">No matches played yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-200">
                        <span className={m.winnerSlot === 0 ? 'text-amber-400' : ''}>{m.p1Name}</span>{' '}
                        <span className="text-slate-500">vs</span>{' '}
                        <span className={m.winnerSlot === 1 ? 'text-amber-400' : ''}>{m.p2Name}</span>
                      </div>
                      <div className="text-slate-400">
                        {CHARACTERS[m.p1Char]?.name} vs {CHARACTERS[m.p2Char]?.name} • {m.mode.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right font-arcade font-bold text-slate-200">
                      {m.p1Rounds} - {m.p2Rounds}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
