import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameStore } from './db/store.js';
import { SessionManager } from './auth/session.js';
import { createApiRouter } from './routes/api.js';
import { RoomManager } from './rooms/RoomManager.js';

const PORT = Number(process.env.PORT || 3001);

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const store = new GameStore();
  await store.init();
  const sessions = new SessionManager(store);

  app.use('/api', createApiRouter(store, sessions));

  // Serve built frontend in production
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager(io, store);
  io.on('connection', (socket) => {
    roomManager.registerSocket(socket);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Neta Kombat server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
