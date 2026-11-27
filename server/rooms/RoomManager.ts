import { Server, Socket } from 'socket.io';
import {
  ArenaId,
  CharacterId,
  CombatEvent,
  InputState,
  MatchState,
  PlayerRoomInfo,
  RoomState,
} from '../../shared/types.js';
import { TICK_RATE } from '../../shared/combat/constants.js';
import { createMatchState, emptyInput, stepMatchState } from '../../shared/combat/engine.js';
import { GameStore } from '../db/store.js';

interface ActiveRoom {
  state: RoomState;
  match: MatchState | null;
  inputs: [InputState, InputState];
  lastInputSeq: [number, number];
  tickTimer: NodeJS.Timeout | null;
  reconnectTimers: [NodeJS.Timeout | null, NodeJS.Timeout | null];
  startedAtMs: number;
}

const RECONNECT_GRACE_MS = 25_000;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export class RoomManager {
  private rooms = new Map<string, ActiveRoom>();
  private socketToRoom = new Map<string, { code: string; slot: 0 | 1 }>();

  constructor(private io: Server, private store: GameStore) {}

  registerSocket(socket: Socket): void {
    socket.on(
      'room:create',
      (
        payload: { playerId: string; displayName: string; characterId?: CharacterId; arenaId?: ArenaId },
        cb?: (res: { ok: boolean; room?: RoomState; slot?: 0 | 1; error?: string }) => void
      ) => {
        this.leaveCurrentRoom(socket);

        let code = generateRoomCode();
        while (this.rooms.has(code)) {
          code = generateRoomCode();
        }

        const p1: PlayerRoomInfo = {
          slot: 0,
          socketId: socket.id,
          playerId: payload.playerId,
          displayName: (payload.displayName || 'Player 1').slice(0, 20),
          characterId: payload.characterId || 'vikas_guru',
          ready: false,
          connected: true,
        };

        const roomState: RoomState = {
          code,
          hostPlayerId: payload.playerId,
          arenaId: payload.arenaId || 'parliament',
          status: 'lobby',
          players: [p1, null],
          rematchVotes: [false, false],
        };

        const active: ActiveRoom = {
          state: roomState,
          match: null,
          inputs: [emptyInput(), emptyInput()],
          lastInputSeq: [0, 0],
          tickTimer: null,
          reconnectTimers: [null, null],
          startedAtMs: 0,
        };

        this.rooms.set(code, active);
        this.socketToRoom.set(socket.id, { code, slot: 0 });
        socket.join(code);
        cb?.({ ok: true, room: roomState, slot: 0 });
        this.io.to(code).emit('room:updated', roomState);
      }
    );

    socket.on(
      'room:join',
      (
        payload: { code: string; playerId: string; displayName: string; characterId?: CharacterId },
        cb?: (res: {
          ok: boolean;
          room?: RoomState;
          slot?: 0 | 1;
          matchState?: MatchState | null;
          error?: string;
        }) => void
      ) => {
        const cleanCode = (payload.code || '').trim().toUpperCase();
        const active = this.rooms.get(cleanCode);
        if (!active) {
          cb?.({ ok: false, error: 'Room not found. Check the 6-character code.' });
          return;
        }

        // Check reconnection by playerId
        const reconnectSlot = active.state.players.findIndex(
          (p) => p && p.playerId === payload.playerId
        ) as -1 | 0 | 1;

        if (reconnectSlot !== -1) {
          const existing = active.state.players[reconnectSlot]!;
          existing.socketId = socket.id;
          existing.connected = true;
          if (active.reconnectTimers[reconnectSlot]) {
            clearTimeout(active.reconnectTimers[reconnectSlot]!);
            active.reconnectTimers[reconnectSlot] = null;
          }
          this.socketToRoom.set(socket.id, { code: cleanCode, slot: reconnectSlot });
          socket.join(cleanCode);
          cb?.({
            ok: true,
            room: active.state,
            slot: reconnectSlot,
            matchState: active.match,
          });
          this.io.to(cleanCode).emit('room:player_reconnected', {
            slot: reconnectSlot,
            displayName: existing.displayName,
          });
          this.io.to(cleanCode).emit('room:updated', active.state);
          return;
        }

        if (active.state.players[0] && active.state.players[1]) {
          cb?.({ ok: false, error: 'Room is already full.' });
          return;
        }

        this.leaveCurrentRoom(socket);
        const slot: 0 | 1 = active.state.players[0] ? 1 : 0;
        active.state.players[slot] = {
          slot,
          socketId: socket.id,
          playerId: payload.playerId,
          displayName: (payload.displayName || `Player ${slot + 1}`).slice(0, 20),
          characterId: payload.characterId || 'yuva_prince',
          ready: false,
          connected: true,
        };

        this.socketToRoom.set(socket.id, { code: cleanCode, slot });
        socket.join(cleanCode);
        cb?.({ ok: true, room: active.state, slot, matchState: active.match });
        this.io.to(cleanCode).emit('room:updated', active.state);
      }
    );

    socket.on('room:select_character', (payload: { characterId: CharacterId }) => {
      const ref = this.socketToRoom.get(socket.id);
      if (!ref) return;
      const active = this.rooms.get(ref.code);
      if (!active || active.state.status !== 'lobby') return;
      const player = active.state.players[ref.slot];
      if (!player) return;
      player.characterId = payload.characterId;
      player.ready = false;
      this.io.to(ref.code).emit('room:updated', active.state);
    });

    socket.on('room:select_arena', (payload: { arenaId: ArenaId }) => {
      const ref = this.socketToRoom.get(socket.id);
      if (!ref) return;
      const active = this.rooms.get(ref.code);
      if (!active || active.state.status !== 'lobby') return;
      if (ref.slot !== 0) return; // Host picks arena
      active.state.arenaId = payload.arenaId;
      this.io.to(ref.code).emit('room:updated', active.state);
    });

    socket.on('room:ready', (payload: { ready: boolean }) => {
      const ref = this.socketToRoom.get(socket.id);
      if (!ref) return;
      const active = this.rooms.get(ref.code);
      if (!active || active.state.status !== 'lobby') return;
      const player = active.state.players[ref.slot];
      if (!player) return;
      player.ready = payload.ready;
      this.io.to(ref.code).emit('room:updated', active.state);

      if (
        active.state.players[0]?.ready &&
        active.state.players[1]?.ready &&
        active.state.players[0].connected &&
        active.state.players[1].connected
      ) {
        this.startRoomMatch(active);
      }
    });

    socket.on('match:input', (input: InputState) => {
      const ref = this.socketToRoom.get(socket.id);
      if (!ref) return;
      const active = this.rooms.get(ref.code);
      if (!active || active.state.status !== 'playing') return;
      active.inputs[ref.slot] = {
        left: Boolean(input.left),
        right: Boolean(input.right),
        up: Boolean(input.up),
        down: Boolean(input.down),
        sprint: Boolean(input.sprint),
        punch: Boolean(input.punch),
        kick: Boolean(input.kick),
        block: Boolean(input.block),
        grab: Boolean(input.grab),
        special: Boolean(input.special),
        seq: input.seq,
      };
      if (typeof input.seq === 'number') {
        active.lastInputSeq[ref.slot] = input.seq;
      }
    });

    socket.on('room:rematch', () => {
      const ref = this.socketToRoom.get(socket.id);
      if (!ref) return;
      const active = this.rooms.get(ref.code);
      if (!active || active.state.status !== 'finished') return;
      active.state.rematchVotes[ref.slot] = true;
      this.io.to(ref.code).emit('room:updated', active.state);

      if (active.state.rematchVotes[0] && active.state.rematchVotes[1]) {
        active.state.rematchVotes = [false, false];
        this.startRoomMatch(active);
      }
    });

    socket.on('room:leave', () => {
      this.leaveCurrentRoom(socket);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private startRoomMatch(active: ActiveRoom): void {
    const p1 = active.state.players[0];
    const p2 = active.state.players[1];
    if (!p1 || !p2) return;

    if (active.tickTimer) clearInterval(active.tickTimer);

    active.state.status = 'playing';
    active.state.rematchVotes = [false, false];
    active.inputs = [emptyInput(), emptyInput()];
    active.match = createMatchState(p1.characterId, p2.characterId, active.state.arenaId, false);
    active.startedAtMs = Date.now();

    this.io.to(active.state.code).emit('room:updated', active.state);
    this.io.to(active.state.code).emit('match:started', {
      room: active.state,
      matchState: active.match,
    });

    const intervalMs = Math.round(1000 / TICK_RATE);
    let pendingEvents: CombatEvent[] = [];

    active.tickTimer = setInterval(() => {
      if (!active.match || active.state.status !== 'playing') return;

      // Pause simulation briefly if one player is reconnecting
      const bothConnected =
        Boolean(active.state.players[0]?.connected) &&
        Boolean(active.state.players[1]?.connected);
      if (!bothConnected) return;

      stepMatchState(active.match, active.inputs[0], active.inputs[1]);
      if (active.match.events.length > 0) {
        pendingEvents.push(...active.match.events);
      }

      // Broadcast snapshot at 30Hz or immediately on important events / match end
      const shouldBroadcast =
        active.match.tick % 2 === 0 ||
        pendingEvents.length > 0 ||
        active.match.phase === 'match_over';

      if (shouldBroadcast) {
        const snapshot = {
          ...active.match,
          events: pendingEvents,
          ackSeq: active.lastInputSeq,
        };
        this.io.to(active.state.code).emit('match:state', snapshot);
        pendingEvents = [];
      }

      if (active.match.phase === 'match_over') {
        this.finishRoomMatch(active);
      }
    }, intervalMs);
  }

  private async finishRoomMatch(active: ActiveRoom): Promise<void> {
    if (active.tickTimer) {
      clearInterval(active.tickTimer);
      active.tickTimer = null;
    }
    if (!active.match) return;

    active.state.status = 'finished';
    const p1 = active.state.players[0];
    const p2 = active.state.players[1];
    const winner = active.match.winnerIndex ?? 'draw';

    if (p1 && p2) {
      const durationSec = Math.max(1, Math.round((Date.now() - active.startedAtMs) / 1000));
      await this.store.recordMatch({
        mode: 'online',
        arenaId: active.state.arenaId,
        p1Name: p1.displayName,
        p2Name: p2.displayName,
        p1Char: p1.characterId,
        p2Char: p2.characterId,
        winnerSlot: winner,
        p1Rounds: active.match.fighters[0].roundsWon,
        p2Rounds: active.match.fighters[1].roundsWon,
        durationSec,
      });

      if (winner === 0) {
        await this.store.updatePlayerStats(p1.displayName, true, p1.characterId);
        await this.store.updatePlayerStats(p2.displayName, false, p2.characterId);
      } else if (winner === 1) {
        await this.store.updatePlayerStats(p2.displayName, true, p2.characterId);
        await this.store.updatePlayerStats(p1.displayName, false, p1.characterId);
      }
    }

    this.io.to(active.state.code).emit('match:ended', {
      winnerIndex: winner,
      matchState: active.match,
      room: active.state,
    });
    this.io.to(active.state.code).emit('room:updated', active.state);
  }

  private handleDisconnect(socket: Socket): void {
    const ref = this.socketToRoom.get(socket.id);
    if (!ref) return;
    this.socketToRoom.delete(socket.id);

    const active = this.rooms.get(ref.code);
    if (!active) return;

    const player = active.state.players[ref.slot];
    if (!player) return;

    if (active.state.status === 'lobby') {
      active.state.players[ref.slot] = null;
      const other = active.state.players[ref.slot === 0 ? 1 : 0];
      if (!other) {
        this.destroyRoom(ref.code);
      } else {
        other.ready = false;
        this.io.to(ref.code).emit('room:updated', active.state);
      }
      return;
    }

    // In active match or finished screen: allow grace period for reconnection!
    player.connected = false;
    this.io.to(ref.code).emit('room:player_disconnected', {
      slot: ref.slot,
      displayName: player.displayName,
      graceSeconds: RECONNECT_GRACE_MS / 1000,
    });
    this.io.to(ref.code).emit('room:updated', active.state);

    active.reconnectTimers[ref.slot] = setTimeout(() => {
      if (!active.state.players[ref.slot] || active.state.players[ref.slot]?.connected) return;
      // Forfeit match if still playing
      if (active.state.status === 'playing' && active.match) {
        const winnerSlot: 0 | 1 = ref.slot === 0 ? 1 : 0;
        active.match.phase = 'match_over';
        active.match.winnerIndex = winnerSlot;
        active.match.fighters[winnerSlot].roundsWon = 2;
        this.finishRoomMatch(active);
      } else {
        this.destroyRoom(ref.code);
      }
    }, RECONNECT_GRACE_MS);
  }

  private leaveCurrentRoom(socket: Socket): void {
    const ref = this.socketToRoom.get(socket.id);
    if (!ref) return;
    this.socketToRoom.delete(socket.id);
    socket.leave(ref.code);

    const active = this.rooms.get(ref.code);
    if (!active) return;

    if (active.reconnectTimers[ref.slot]) {
      clearTimeout(active.reconnectTimers[ref.slot]!);
      active.reconnectTimers[ref.slot] = null;
    }

    if (active.state.status === 'playing' && active.match) {
      const winnerSlot: 0 | 1 = ref.slot === 0 ? 1 : 0;
      active.match.phase = 'match_over';
      active.match.winnerIndex = winnerSlot;
      active.match.fighters[winnerSlot].roundsWon = 2;
      this.finishRoomMatch(active);
    }

    active.state.players[ref.slot] = null;
    if (!active.state.players[0] && !active.state.players[1]) {
      this.destroyRoom(ref.code);
    } else {
      active.state.status = 'lobby';
      active.state.rematchVotes = [false, false];
      this.io.to(ref.code).emit('room:updated', active.state);
    }
  }

  private destroyRoom(code: string): void {
    const active = this.rooms.get(code);
    if (!active) return;
    if (active.tickTimer) clearInterval(active.tickTimer);
    if (active.reconnectTimers[0]) clearTimeout(active.reconnectTimers[0]);
    if (active.reconnectTimers[1]) clearTimeout(active.reconnectTimers[1]);
    this.rooms.delete(code);
  }

  dispose(): void {
    for (const code of [...this.rooms.keys()]) {
      this.destroyRoom(code);
    }
    this.socketToRoom.clear();
  }
}
