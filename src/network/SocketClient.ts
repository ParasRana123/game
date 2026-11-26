import { io, Socket } from 'socket.io-client';
import { ArenaId, CharacterId, InputState, MatchState, RoomState } from '@shared/types';

function getOrCreatePlayerId(): string {
  try {
    const existing = localStorage.getItem('nk_player_id');
    if (existing) return existing;
    const generated = `nk_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem('nk_player_id', generated);
    return generated;
  } catch {
    return `nk_${Math.random().toString(36).slice(2, 10)}`;
  }
}

class SocketClientImpl {
  private socket: Socket | null = null;
  readonly playerId: string = getOrCreatePlayerId();

  connect(): Socket {
    if (this.socket && this.socket.connected) return this.socket;
    if (!this.socket) {
      const url = import.meta.env.VITE_SERVER_URL || window.location.origin;
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 800,
      });
    } else {
      this.socket.connect();
    }
    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  createRoom(
    displayName: string,
    characterId: CharacterId,
    arenaId: ArenaId
  ): Promise<{ ok: boolean; room?: RoomState; slot?: 0 | 1; error?: string }> {
    const s = this.connect();
    return new Promise((resolve) => {
      s.emit(
        'room:create',
        { playerId: this.playerId, displayName, characterId, arenaId },
        (res: { ok: boolean; room?: RoomState; slot?: 0 | 1; error?: string }) => resolve(res)
      );
    });
  }

  joinRoom(
    code: string,
    displayName: string,
    characterId: CharacterId
  ): Promise<{
    ok: boolean;
    room?: RoomState;
    slot?: 0 | 1;
    matchState?: MatchState | null;
    error?: string;
  }> {
    const s = this.connect();
    return new Promise((resolve) => {
      s.emit(
        'room:join',
        { code, playerId: this.playerId, displayName, characterId },
        (res: {
          ok: boolean;
          room?: RoomState;
          slot?: 0 | 1;
          matchState?: MatchState | null;
          error?: string;
        }) => resolve(res)
      );
    });
  }

  selectCharacter(characterId: CharacterId): void {
    this.socket?.emit('room:select_character', { characterId });
  }

  selectArena(arenaId: ArenaId): void {
    this.socket?.emit('room:select_arena', { arenaId });
  }

  setReady(ready: boolean): void {
    this.socket?.emit('room:ready', { ready });
  }

  sendInput(input: InputState): void {
    this.socket?.emit('match:input', input);
  }

  voteRematch(): void {
    this.socket?.emit('room:rematch');
  }

  leaveRoom(): void {
    this.socket?.emit('room:leave');
  }
}

export const SocketClient = new SocketClientImpl();
