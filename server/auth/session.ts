import crypto from 'node:crypto';
import { GameStore } from '../db/store.js';
import { CharacterId, PlayerProfile } from '../../shared/types.js';

export interface SessionRecord {
  token: string;
  playerId: string;
  username: string;
}

export class SessionManager {
  private sessions = new Map<string, SessionRecord>();

  constructor(private store: GameStore) {}

  async authenticate(username: string, favoriteCharacter: CharacterId = 'vikas_guru'): Promise<{
    token: string;
    profile: PlayerProfile;
  }> {
    const profile = await this.store.upsertProfile(username, favoriteCharacter);
    const token = crypto.randomBytes(24).toString('hex');
    this.sessions.set(token, {
      token,
      playerId: profile.id,
      username: profile.username,
    });
    return { token, profile };
  }

  verify(token: string | undefined): SessionRecord | null {
    if (!token) return null;
    return this.sessions.get(token) ?? null;
  }
}
