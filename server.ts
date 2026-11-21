import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  addFriendByUsername,
  clearOnlinePresence,
  getFriendsList,
  getUserProfile,
  loginUser,
  registerUser,
  setOnlinePresence,
  updateUserCharacter,
  updateUserProgress,
  updateUserSettings,
  verifyToken,
} from './server/store';
import type {
  CharacterConfig,
  ChatMessage,
  LocationId,
  MultiplayerPlayerState,
  RoomSummary,
} from './src/game/types';
import { DEFAULT_FEMALE_CHARACTER, verifyPuzzleSolution } from './src/game/rules';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

interface RoomInstance {
  id: string;
  name: string;
  locationId: LocationId;
  hostName: string;
  maxPlayers: number;
  isPrivate: boolean;
  players: Map<string, { ws: WebSocket; userId: string | null; state: MultiplayerPlayerState }>;
  discoveredClues: Set<string>;
  puzzleSolved: boolean;
  chat: ChatMessage[];
}

const rooms = new Map<string, RoomInstance>();

// Seed one persistent public mystery lobby so multiplayer browser always has an active room
rooms.set('ROOM-OBSIDIAN', {
  id: 'ROOM-OBSIDIAN',
  name: 'Blackwood Investigation Hall',
  locationId: 'abandoned_mansion',
  hostName: 'Lyra Vance',
  maxPlayers: 6,
  isPrivate: false,
  players: new Map(),
  discoveredClues: new Set(),
  puzzleSolved: false,
  chat: [
    {
      id: 'msg_seed_1',
      sender: 'Lyra Vance',
      text: 'The atrium clock is frozen. Inspect the ledger and pocket watch together.',
      timestamp: new Date().toISOString(),
    },
  ],
});

function broadcastToRoom(room: RoomInstance, payload: unknown, excludeId?: string) {
  const raw = JSON.stringify(payload);
  for (const [pid, client] of room.players.entries()) {
    if (excludeId && pid === excludeId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

function getRoomSummaries(): RoomSummary[] {
  return Array.from(rooms.values())
    .filter((r) => !r.isPrivate)
    .map((r) => ({
      id: r.id,
      name: r.name,
      locationId: r.locationId,
      hostName: r.hostName,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      isPrivate: r.isPrivate,
    }));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const extractUserId = (req: express.Request): string | null => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return verifyToken(auth.slice(7));
    }
    return null;
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, game: 'NO ESCAPE', rooms: rooms.size });
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, password, displayName } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Username and password are required.' });
        return;
      }
      const result = registerUser(username, password, typeof displayName === 'string' ? displayName : undefined);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Username and password are required.' });
        return;
      }
      const result = loginUser(username, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Login failed.' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    const profile = getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    res.json({ user: profile });
  });

  app.put('/api/player/character', (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Authentication required to save character to cloud profile.' });
      return;
    }
    try {
      const user = updateUserCharacter(userId, req.body as CharacterConfig);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update character.' });
    }
  });

  app.put('/api/player/progress', (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    try {
      const user = updateUserProgress(userId, req.body);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update progress.' });
    }
  });

  app.put('/api/player/settings', (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    try {
      const user = updateUserSettings(userId, req.body);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update settings.' });
    }
  });

  app.get('/api/friends', (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Sign in to view and manage your friends list.' });
      return;
    }
    res.json({ friends: getFriendsList(userId) });
  });

  app.post('/api/friends/add', (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Sign in to add friends.' });
      return;
    }
    try {
      const { username } = req.body ?? {};
      if (typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ error: 'Enter a valid investigator username.' });
        return;
      }
      const friends = addFriendByUsername(userId, username);
      res.json({ friends });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not add friend.' });
    }
  });

  app.get('/api/multiplayer/rooms', (_req, res) => {
    res.json({ rooms: getRoomSummaries() });
  });

  app.post('/api/multiplayer/rooms', (req, res) => {
    const { name, locationId, hostName, isPrivate } = req.body ?? {};
    const validLocations: LocationId[] = [
      'abandoned_mansion',
      'mysterious_school',
      'dark_forest',
      'underground_tunnels',
      'abandoned_hospital',
      'hidden_laboratory',
      'mysterious_city',
    ];
    const loc: LocationId = validLocations.includes(locationId) ? locationId : 'abandoned_mansion';
    const roomCode = `ROOM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const room: RoomInstance = {
      id: roomCode,
      name: (typeof name === 'string' && name.trim().slice(0, 36)) || 'Syndicate Investigation',
      locationId: loc,
      hostName: (typeof hostName === 'string' && hostName.trim().slice(0, 24)) || 'Investigator',
      maxPlayers: 6,
      isPrivate: Boolean(isPrivate),
      players: new Map(),
      discoveredClues: new Set(),
      puzzleSolved: false,
      chat: [],
    };
    rooms.set(roomCode, room);
    res.status(201).json({
      room: {
        id: room.id,
        name: room.name,
        locationId: room.locationId,
        hostName: room.hostName,
        playerCount: 0,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
      },
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      // Do not destroy Vite HMR upgrade if any, or close unknown upgrade paths cleanly
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    let activeRoom: RoomInstance | null = null;
    let playerId = `plr_${Math.random().toString(36).slice(2, 9)}`;
    let authedUserId: string | null = null;

    const cleanupConnection = () => {
      if (authedUserId) clearOnlinePresence(authedUserId);
      if (activeRoom && activeRoom.players.has(playerId)) {
        activeRoom.players.delete(playerId);
        broadcastToRoom(activeRoom, { type: 'player_left', playerId });
        if (activeRoom.players.size === 0 && activeRoom.id !== 'ROOM-OBSIDIAN') {
          rooms.delete(activeRoom.id);
        }
        activeRoom = null;
      }
    };

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          roomId?: string;
          token?: string;
          locationId?: LocationId;
          username?: string;
          character?: CharacterConfig;
          x?: number;
          y?: number;
          z?: number;
          yaw?: number;
          moving?: boolean;
          clueId?: string;
          attempt?: number[];
          text?: string;
          targetId?: string;
          signalType?: 'offer' | 'answer' | 'ice';
          payload?: unknown;
          voiceActive?: boolean;
          voiceMuted?: boolean;
        };

        if (msg.type === 'join_room') {
          cleanupConnection();
          const roomId = (msg.roomId || 'ROOM-OBSIDIAN').toUpperCase();
          let room = rooms.get(roomId);
          if (!room) {
            room = {
              id: roomId,
              name: `Investigation ${roomId}`,
              locationId: msg.locationId || 'abandoned_mansion',
              hostName: msg.username || 'Investigator',
              maxPlayers: 6,
              isPrivate: false,
              players: new Map(),
              discoveredClues: new Set(),
              puzzleSolved: false,
              chat: [],
            };
            rooms.set(roomId, room);
          }

          if (room.players.size >= room.maxPlayers) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is full.' }));
            return;
          }

          authedUserId = verifyToken(msg.token);
          if (authedUserId) {
            setOnlinePresence(authedUserId, room.locationId, room.id);
          }

          const state: MultiplayerPlayerState = {
            id: playerId,
            username: (msg.username || msg.character?.name || 'Investigator').slice(0, 24),
            character: msg.character || DEFAULT_FEMALE_CHARACTER,
            x: msg.x ?? 0,
            y: msg.y ?? 0,
            z: msg.z ?? 12,
            yaw: msg.yaw ?? 0,
            moving: false,
            voiceActive: false,
            voiceMuted: false,
          };

          activeRoom = room;
          room.players.set(playerId, { ws, userId: authedUserId, state });

          ws.send(
            JSON.stringify({
              type: 'room_state',
              selfId: playerId,
              roomId: room.id,
              locationId: room.locationId,
              players: Array.from(room.players.values()).map((p) => p.state),
              discoveredClues: Array.from(room.discoveredClues),
              puzzleSolved: room.puzzleSolved,
              chat: room.chat.slice(-25),
            }),
          );

          broadcastToRoom(
            room,
            { type: 'player_joined', player: state },
            playerId,
          );
          return;
        }

        if (!activeRoom) return;

        if (msg.type === 'move') {
          const entry = activeRoom.players.get(playerId);
          if (!entry) return;
          entry.state.x = Number(msg.x ?? entry.state.x);
          entry.state.y = Number(msg.y ?? entry.state.y);
          entry.state.z = Number(msg.z ?? entry.state.z);
          entry.state.yaw = Number(msg.yaw ?? entry.state.yaw);
          entry.state.moving = Boolean(msg.moving);
          broadcastToRoom(
            activeRoom,
            {
              type: 'player_moved',
              playerId,
              x: entry.state.x,
              y: entry.state.y,
              z: entry.state.z,
              yaw: entry.state.yaw,
              moving: entry.state.moving,
            },
            playerId,
          );
          return;
        }

        if (
          msg.type === 'rtc_signal' &&
          typeof msg.targetId === 'string' &&
          msg.signalType &&
          msg.payload
        ) {
          const target = activeRoom.players.get(msg.targetId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: 'rtc_signal',
                fromId: playerId,
                signalType: msg.signalType,
                payload: msg.payload,
              }),
            );
          }
          return;
        }

        if (msg.type === 'voice_status') {
          const entry = activeRoom.players.get(playerId);
          if (!entry) return;
          entry.state.voiceActive = Boolean(msg.voiceActive);
          entry.state.voiceMuted = Boolean(msg.voiceMuted);
          broadcastToRoom(
            activeRoom,
            {
              type: 'voice_status',
              playerId,
              voiceActive: entry.state.voiceActive,
              voiceMuted: entry.state.voiceMuted,
            },
            playerId,
          );
          return;
        }

        if (msg.type === 'clue_found' && typeof msg.clueId === 'string') {
          if (!activeRoom.discoveredClues.has(msg.clueId)) {
            activeRoom.discoveredClues.add(msg.clueId);
            broadcastToRoom(activeRoom, {
              type: 'clue_found',
              clueId: msg.clueId,
              finder: activeRoom.players.get(playerId)?.state.username || 'Teammate',
            });
          }
          return;
        }

        if (msg.type === 'puzzle_attempt' && Array.isArray(msg.attempt)) {
          if (verifyPuzzleSolution(activeRoom.locationId, msg.attempt)) {
            activeRoom.puzzleSolved = true;
            broadcastToRoom(activeRoom, {
              type: 'puzzle_solved',
              solver: activeRoom.players.get(playerId)?.state.username || 'Teammate',
            });
          }
          return;
        }

        if (msg.type === 'chat' && typeof msg.text === 'string' && msg.text.trim()) {
          const sender = activeRoom.players.get(playerId)?.state.username || 'Investigator';
          const chatMsg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sender,
            text: msg.text.trim().slice(0, 180),
            timestamp: new Date().toISOString(),
          };
          activeRoom.chat.push(chatMsg);
          if (activeRoom.chat.length > 40) activeRoom.chat.shift();
          broadcastToRoom(activeRoom, { type: 'chat_message', message: chatMsg });
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', cleanupConnection);
    ws.on('error', cleanupConnection);
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`NO ESCAPE server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
