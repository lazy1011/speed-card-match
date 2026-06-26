import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './rooms/RoomManager';
import { setupGameEvents } from './events/gameEvents';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware — match Socket.io's CORS origin so preflight requests also pass.
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Room manager instance
const roomManager = new RoomManager();

// Setup Socket.io events
setupGameEvents(io, roomManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API endpoint to get room info (optional)
app.get('/api/rooms/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const roomInfo = roomManager.getRoomInfo(roomCode);

  if (!roomInfo) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(roomInfo);
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[WebSocket] CORS enabled for ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});
