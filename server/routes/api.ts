import { Router } from 'express';
import { GameStore } from '../db/store.js';
import { SessionManager } from '../auth/session.js';
import { ArenaId, CharacterId, GameMode } from '../../shared/types.js';

export function createApiRouter(store: GameStore, sessions: SessionManager): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'neta-kombat-server', timestamp: new Date().toISOString() });
  });

  router.post('/profile', async (req, res) => {
    try {
      const { username, favoriteCharacter } = req.body as {
        username?: string;
        favoriteCharacter?: CharacterId;
      };
      if (!username || !username.trim()) {
        res.status(400).json({ error: 'Username is required' });
        return;
      }
      const auth = await sessions.authenticate(username, favoriteCharacter || 'vikas_guru');
      res.json(auth);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/leaderboard', async (_req, res) => {
    try {
      const leaderboard = await store.getLeaderboard(20);
      res.json({ leaderboard });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/matches', async (_req, res) => {
    try {
      const matches = await store.getRecentMatches(25);
      res.json({ matches });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/matches', async (req, res) => {
    try {
      const body = req.body as {
        mode: GameMode;
        arenaId: ArenaId;
        p1Name: string;
        p2Name: string;
        p1Char: CharacterId;
        p2Char: CharacterId;
        winnerSlot: 0 | 1 | 'draw';
        p1Rounds: number;
        p2Rounds: number;
        durationSec: number;
        campaignCleared?: boolean;
      };

      const record = await store.recordMatch({
        mode: body.mode || 'single_ai',
        arenaId: body.arenaId || 'parliament',
        p1Name: body.p1Name || 'Player 1',
        p2Name: body.p2Name || 'CPU',
        p1Char: body.p1Char,
        p2Char: body.p2Char,
        winnerSlot: body.winnerSlot ?? 'draw',
        p1Rounds: body.p1Rounds ?? 0,
        p2Rounds: body.p2Rounds ?? 0,
        durationSec: body.durationSec ?? 0,
      });

      if (body.p1Name && body.winnerSlot !== 'draw') {
        await store.updatePlayerStats(
          body.p1Name,
          body.winnerSlot === 0,
          body.p1Char,
          Boolean(body.campaignCleared)
        );
      }

      res.json({ ok: true, match: record });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
