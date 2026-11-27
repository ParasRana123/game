import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Wifi,
  Users,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ARENA_LIST } from '@shared/arenas';
import { CHARACTERS, PLAYABLE_CHARACTERS } from '@shared/characters';
import { ArenaId, CharacterId, MatchState, RoomState } from '@shared/types';
import { AudioManager } from '@/audio/AudioManager';
import { SocketClient } from '@/network/SocketClient';
import { FighterPortrait } from './FighterPortrait';

interface MultiplayerLobbyProps {
  playerName: string;
  onBack: () => void;
  onMatchStarted: (payload: {
    room: RoomState;
    slot: 0 | 1;
    matchState: MatchState;
  }) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  playerName,
  onBack,
  onMatchStarted,
}) => {
  const [name, setName] = useState(playerName);
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [slot, setSlot] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  useEffect(() => {
    const socket = SocketClient.connect();

    const onUpdated = (next: RoomState) => {
      setRoom(next);
    };
    const onStarted = (payload: { room: RoomState; matchState: MatchState }) => {
      const mySlot = payload.room.players[0]?.playerId === SocketClient.playerId ? 0 : 1;
      onMatchStarted({ room: payload.room, slot: mySlot, matchState: payload.matchState });
    };
    const onDisc = (p: { displayName: string; graceSeconds: number }) => {
      setStatusBanner(`${p.displayName} disconnected. Waiting ${p.graceSeconds}s for reconnection...`);
    };
    const onReconn = (p: { displayName: string }) => {
      setStatusBanner(`${p.displayName} reconnected!`);
    };

    socket.on('room:updated', onUpdated);
    socket.on('match:started', onStarted);
    socket.on('room:player_disconnected', onDisc);
    socket.on('room:player_reconnected', onReconn);

    return () => {
      socket.off('room:updated', onUpdated);
      socket.off('match:started', onStarted);
      socket.off('room:player_disconnected', onDisc);
      socket.off('room:player_reconnected', onReconn);
    };
  }, [onMatchStarted]);

  const handleCreate = async () => {
    AudioManager.unlock();
    setBusy(true);
    setError('');
    const res = await SocketClient.createRoom(name || 'Netaji', 'vikas_guru', 'parliament');
    setBusy(false);
    if (!res.ok || !res.room) {
      setError(res.error || 'Could not create room');
      return;
    }
    setRoom(res.room);
    setSlot(res.slot ?? 0);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    AudioManager.unlock();
    if (!joinCode.trim()) return;
    setBusy(true);
    setError('');
    const res = await SocketClient.joinRoom(joinCode.trim(), name || 'Challenger', 'yuva_prince');
    setBusy(false);
    if (!res.ok || !res.room) {
      setError(res.error || 'Could not join room');
      return;
    }
    setRoom(res.room);
    setSlot(res.slot ?? 1);
    if (res.matchState && res.room.status === 'playing') {
      onMatchStarted({
        room: res.room,
        slot: res.slot ?? 1,
        matchState: res.matchState,
      });
    }
  };

  const copyCode = () => {
    if (!room) return;
    void navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-[#09090f] text-slate-100 p-4 sm:p-6 flex flex-col">
        <div className="max-w-3xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-arcade text-2xl sm:text-3xl font-bold text-sky-400 flex items-center gap-2">
              <Wifi className="w-6 h-6" /> ONLINE MULTIPLAYER
            </h1>
            <div className="w-20" />
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="block text-xs font-arcade uppercase text-slate-400">
              Your Fighter Callsign
            </label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              placeholder="Enter callsign..."
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-slate-900/85 border border-amber-500/35 space-y-4">
              <h2 className="font-arcade text-xl font-bold text-amber-400">CREATE ROOM</h2>
              <p className="text-sm text-slate-400">
                Host an authoritative Socket.IO arena and share the 6-character code with a friend on any device.
              </p>
              <button
                onClick={handleCreate}
                disabled={busy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-arcade font-extrabold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'CREATING...' : 'CREATE NEW ROOM'}
              </button>
            </div>

            <form
              onSubmit={handleJoin}
              className="p-6 rounded-2xl bg-slate-900/85 border border-sky-500/35 space-y-4"
            >
              <h2 className="font-arcade text-xl font-bold text-sky-400">JOIN ROOM</h2>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="6-CHAR CODE (e.g. NK482A)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 font-arcade tracking-widest text-center text-lg text-white uppercase focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={busy || joinCode.trim().length < 4}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-arcade font-extrabold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'JOINING...' : 'JOIN BY CODE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const me = room.players[slot];
  const opp = room.players[slot === 0 ? 1 : 0];

  return (
    <div className="min-h-screen bg-[#09090f] text-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              SocketClient.leaveRoom();
              setRoom(null);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-400 text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Leave Room
          </button>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/40">
            <span className="text-xs text-slate-400">ROOM CODE:</span>
            <span className="font-arcade text-xl font-extrabold tracking-widest text-amber-400">
              {room.code}
            </span>
            <button
              onClick={copyCode}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Copy room code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <Wifi className="w-4 h-4" /> Server Authoritative Sync
          </div>
        </div>

        {statusBanner && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold">
            {statusBanner}
          </div>
        )}

        {/* Both Player Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1].map((idx) => {
            const p = room.players[idx as 0 | 1];
            const isMe = idx === slot;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border ${
                  isMe ? 'border-amber-400/60 bg-slate-900/90' : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {p ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FighterPortrait characterId={p.characterId} size={64} flip={idx === 1} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-arcade text-lg font-bold text-white">
                            {p.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-300">
                          {CHARACTERS[p.characterId].name}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        p.ready
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.ready ? <CheckCircle2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      {p.ready ? 'READY' : 'SELECTING'}
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    Waiting for opponent to join with code <strong className="text-amber-300">{room.code}</strong>...
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Character Grid for Local Player */}
        <div className="space-y-2">
          <div className="font-arcade text-xs uppercase tracking-wider text-slate-400">
            Choose Your Fighter
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {PLAYABLE_CHARACTERS.map((c) => {
              const selected = me?.characterId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    AudioManager.unlock();
                    void AudioManager.playVoice(c.id, 'select', 'online_pick');
                    SocketClient.selectCharacter(c.id as CharacterId);
                  }}
                  className={`p-2 rounded-xl border text-center cursor-pointer transition ${
                    selected
                      ? 'border-amber-400 bg-amber-500/20'
                      : 'border-slate-800 bg-slate-900/75 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-center">
                    <FighterPortrait characterId={c.id} size={52} />
                  </div>
                  <div className="font-arcade text-[11px] font-bold text-white truncate mt-1">
                    {c.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Arena Picker (Host) & Ready Button */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-[260px]">
            <div className="font-arcade text-xs uppercase tracking-wider text-slate-400">
              Arena {slot !== 0 && '(Host Selects)'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ARENA_LIST.map((a) => (
                <button
                  key={a.id}
                  disabled={slot !== 0}
                  onClick={() => SocketClient.selectArena(a.id as ArenaId)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition ${
                    room.arenaId === a.id
                      ? 'border-amber-400 bg-amber-500/15 text-white'
                      : 'border-slate-800 bg-slate-900/70 text-slate-400'
                  } ${slot === 0 ? 'cursor-pointer' : 'opacity-75'}`}
                >
                  <div className="font-arcade font-bold truncate">{a.name}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!opp}
            onClick={() => {
              AudioManager.unlock();
              void AudioManager.playSfx('ui_click');
              SocketClient.setReady(!me?.ready);
            }}
            className={`px-8 py-3.5 rounded-xl font-arcade text-lg font-extrabold cursor-pointer transition disabled:opacity-50 ${
              me?.ready
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 hover:scale-105'
            }`}
          >
            {me?.ready ? 'READY! (CANCEL)' : 'READY UP!'}
          </button>
        </div>
      </div>
    </div>
  );
};
