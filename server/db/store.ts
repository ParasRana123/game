import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { CharacterId, MatchRecord, PlayerProfile } from '../../shared/types.js';

interface JsonDbShape {
  players: PlayerProfile[];
  matches: MatchRecord[];
}

const DATA_FILE = path.resolve(process.cwd(), 'server', 'data', 'db.json');

export class GameStore {
  private pool: pg.Pool | null = null;
  private usingPostgres = false;
  private memDb: JsonDbShape = { players: [], matches: [] };

  async init(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pool = new pg.Pool({ connectionString: dbUrl, max: 10 });
        const schemaPath = path.resolve(process.cwd(), 'server', 'db', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(sql);
        this.usingPostgres = true;
        console.log('[DB] Connected to PostgreSQL');
        return;
      } catch (err) {
        console.warn('[DB] PostgreSQL unavailable, using persistent local JSON store:', (err as Error).message);
        this.pool = null;
      }
    } else {
      console.log('[DB] No DATABASE_URL set; using persistent local JSON store at server/data/db.json');
    }

    this.loadJson();
  }

  private loadJson(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.memDb = JSON.parse(raw) as JsonDbShape;
      } else {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        this.saveJson();
      }
    } catch {
      this.memDb = { players: [], matches: [] };
    }
  }

  private saveJson(): void {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.memDb, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save JSON store:', err);
    }
  }

  async upsertProfile(username: string, favoriteCharacter: CharacterId = 'vikas_guru'): Promise<PlayerProfile> {
    const clean = username.trim().slice(0, 20) || 'Netaji';
    if (this.usingPostgres && this.pool) {
      const existing = await this.pool.query('SELECT * FROM players WHERE LOWER(username) = LOWER($1)', [clean]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        return {
          id: row.id,
          username: row.username,
          wins: row.wins,
          losses: row.losses,
          streak: row.streak,
          favoriteCharacter: row.favorite_character,
          campaignCleared: row.campaign_cleared,
          createdAt: row.created_at.toISOString(),
        };
      }
      const id = crypto.randomUUID();
      const inserted = await this.pool.query(
        'INSERT INTO players (id, username, favorite_character) VALUES ($1, $2, $3) RETURNING *',
        [id, clean, favoriteCharacter]
      );
      const row = inserted.rows[0];
      return {
        id: row.id,
        username: row.username,
        wins: row.wins,
        losses: row.losses,
        streak: row.streak,
        favoriteCharacter: row.favorite_character,
        campaignCleared: row.campaign_cleared,
        createdAt: row.created_at.toISOString(),
      };
    }

    const found = this.memDb.players.find((p) => p.username.toLowerCase() === clean.toLowerCase());
    if (found) return found;
    const created: PlayerProfile = {
      id: crypto.randomUUID(),
      username: clean,
      wins: 0,
      losses: 0,
      streak: 0,
      favoriteCharacter,
      campaignCleared: false,
      createdAt: new Date().toISOString(),
    };
    this.memDb.players.push(created);
    this.saveJson();
    return created;
  }

  async updatePlayerStats(
    username: string,
    won: boolean,
    charId: CharacterId,
    campaignCleared = false
  ): Promise<void> {
    const profile = await this.upsertProfile(username, charId);
    if (this.usingPostgres && this.pool) {
      await this.pool.query(
        `UPDATE players SET
           wins = wins + $2,
           losses = losses + $3,
           streak = CASE WHEN $2 > 0 THEN streak + 1 ELSE 0 END,
           favorite_character = $4,
           campaign_cleared = campaign_cleared OR $5
         WHERE id = $1`,
        [profile.id, won ? 1 : 0, won ? 0 : 1, charId, campaignCleared]
      );
      return;
    }

    if (won) {
      profile.wins += 1;
      profile.streak += 1;
    } else {
      profile.losses += 1;
      profile.streak = 0;
    }
    profile.favoriteCharacter = charId;
    if (campaignCleared) profile.campaignCleared = true;
    this.saveJson();
  }

  async recordMatch(record: Omit<MatchRecord, 'id' | 'playedAt'>): Promise<MatchRecord> {
    const full: MatchRecord = {
      ...record,
      id: crypto.randomUUID(),
      playedAt: new Date().toISOString(),
    };

    if (this.usingPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO matches (id, mode, arena_id, p1_name, p2_name, p1_char, p2_char, winner_slot, p1_rounds, p2_rounds, duration_sec)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          full.id,
          full.mode,
          full.arenaId,
          full.p1Name,
          full.p2Name,
          full.p1Char,
          full.p2Char,
          String(full.winnerSlot),
          full.p1Rounds,
          full.p2Rounds,
          full.durationSec,
        ]
      );
      return full;
    }

    this.memDb.matches.unshift(full);
    this.memDb.matches = this.memDb.matches.slice(0, 100);
    this.saveJson();
    return full;
  }

  async getLeaderboard(limit = 15): Promise<PlayerProfile[]> {
    if (this.usingPostgres && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM players ORDER BY wins DESC, streak DESC, losses ASC LIMIT $1',
        [limit]
      );
      return res.rows.map((r) => ({
        id: r.id,
        username: r.username,
        wins: r.wins,
        losses: r.losses,
        streak: r.streak,
        favoriteCharacter: r.favorite_character,
        campaignCleared: r.campaign_cleared,
        createdAt: r.created_at.toISOString(),
      }));
    }

    return [...this.memDb.players]
      .sort((a, b) => b.wins - a.wins || b.streak - a.streak || a.losses - b.losses)
      .slice(0, limit);
  }

  async getRecentMatches(limit = 20): Promise<MatchRecord[]> {
    if (this.usingPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM matches ORDER BY played_at DESC LIMIT $1', [limit]);
      return res.rows.map((r) => ({
        id: r.id,
        mode: r.mode,
        arenaId: r.arena_id,
        p1Name: r.p1_name,
        p2Name: r.p2_name,
        p1Char: r.p1_char,
        p2Char: r.p2_char,
        winnerSlot: r.winner_slot === '0' ? 0 : r.winner_slot === '1' ? 1 : 'draw',
        p1Rounds: r.p1_rounds,
        p2Rounds: r.p2_rounds,
        durationSec: r.duration_sec,
        playedAt: r.played_at.toISOString(),
      }));
    }

    return this.memDb.matches.slice(0, limit);
  }
}
