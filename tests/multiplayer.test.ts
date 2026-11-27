import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { RoomManager } from '../server/rooms/RoomManager.js';
import { GameStore } from '../server/db/store.js';
import { MatchState, RoomState } from '../shared/types.js';

test('Socket.IO RoomManager: create, join, ready, and receive authoritative ticks', async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const store = new GameStore();
  await store.init();
  const roomManager = new RoomManager(io, store);
  io.on('connection', (s) => roomManager.registerSocket(s));

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === 'object');
  const url = `http://127.0.0.1:${addr.port}`;

  const c1 = ioc(url, { transports: ['websocket'] });
  const c2 = ioc(url, { transports: ['websocket'] });

  try {
    await Promise.all([
      new Promise<void>((r) => c1.on('connect', () => r())),
      new Promise<void>((r) => c2.on('connect', () => r())),
    ]);

    const created = await new Promise<{ ok: boolean; room?: RoomState }>((resolve) => {
      c1.emit(
        'room:create',
        { playerId: 'p1_test', displayName: 'Tester1', characterId: 'vikas_guru', arenaId: 'parliament' },
        resolve
      );
    });
    assert.equal(created.ok, true);
    const code = created.room!.code;
    assert.equal(code.length, 6);

    const joined = await new Promise<{ ok: boolean; room?: RoomState }>((resolve) => {
      c2.emit(
        'room:join',
        { code, playerId: 'p2_test', displayName: 'Tester2', characterId: 'muffler_man' },
        resolve
      );
    });
    assert.equal(joined.ok, true);
    assert.equal(joined.room!.players[1]?.displayName, 'Tester2');

    const startedPromise = new Promise<{ matchState: MatchState }>((resolve) => {
      c1.once('match:started', resolve);
    });
    const stateTickPromise = new Promise<MatchState>((resolve) => {
      c1.once('match:state', resolve);
    });

    c1.emit('room:ready', { ready: true });
    c2.emit('room:ready', { ready: true });

    const started = await startedPromise;
    assert.equal(started.matchState.fighters[0].characterId, 'vikas_guru');
    assert.equal(started.matchState.fighters[1].characterId, 'muffler_man');

    const snapshot = await stateTickPromise;
    assert.ok(snapshot.tick >= 1, 'Authoritative server should advance ticks');
  } finally {
    c1.disconnect();
    c2.disconnect();
    roomManager.dispose();
    io.close();
    server.closeAllConnections?.();
    server.close();
  }
});
