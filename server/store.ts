import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  CharacterConfig,
  FriendInfo,
  LocationId,
  PlayerProgress,
  SettingsConfig,
  UserProfile,
} from '../src/game/types';
import {
  DEFAULT_FEMALE_CHARACTER,
  DEFAULT_MALE_CHARACTER,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  resolveActiveCharacter,
} from '../src/game/rules';

interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  character: CharacterConfig;
  progress: PlayerProgress;
  settings: SettingsConfig;
  friends: string[]; // friend user IDs
}

interface DbSchema {
  secret: string;
  users: Record<string, StoredUser>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'no-escape-db.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createSeedUser(
  id: string,
  username: string,
  displayName: string,
  password: string,
  character: CharacterConfig,
  friends: string[],
  progress: PlayerProgress = DEFAULT_PROGRESS,
): StoredUser {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id,
    username: username.toLowerCase(),
    displayName,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
    character,
    progress,
    settings: { ...DEFAULT_SETTINGS },
    friends,
  };
}

function loadOrInitDb(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as DbSchema;
      if (parsed && parsed.users && parsed.secret) {
        return parsed;
      }
    } catch {
      // Fallback to fresh DB if corrupt
    }
  }

  const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const seeded: DbSchema = {
    secret,
    users: {
      usr_detective: createSeedUser(
        'usr_detective',
        'detective',
        'Detective Noir',
        'shadow2026',
        { ...DEFAULT_FEMALE_CHARACTER, customizeEnabled: true, name: 'Vespera' },
        ['usr_lyra', 'usr_soren'],
        {
          ...DEFAULT_PROGRESS,
          unlockedLocations: ['abandoned_mansion', 'mysterious_school', 'dark_forest'],
          completedLocations: ['abandoned_mansion'],
          discoveredClues: ['clue_manor_ledger'],
          unlockedAchievements: ['badge_manor', 'badge_customizer'],
          totalEscapes: 1,
          storyChapter: 2,
        },
      ),
      usr_lyra: createSeedUser(
        'usr_lyra',
        'lyra_vance',
        'Lyra Vance',
        'shadow2026',
        { ...DEFAULT_FEMALE_CHARACTER, name: 'Lyra Vance', accessory: 'silver_monocle' },
        ['usr_detective'],
      ),
      usr_soren: createSeedUser(
        'usr_soren',
        'soren_k',
        'Soren Kael',
        'shadow2026',
        { ...DEFAULT_MALE_CHARACTER, name: 'Soren Kael', outfit: 'noir_trench' },
        ['usr_detective'],
      ),
    },
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2), 'utf8');
  return seeded;
}

const db: DbSchema = loadOrInitDb();
const onlineUsers = new Map<string, { locationId: LocationId | null; roomId: string | null }>();

function persistDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

export function sanitizeProfile(user: StoredUser): UserProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    character: user.character,
    progress: user.progress,
    settings: user.settings,
  };
}

export function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', db.secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token?: string | null): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', db.secret).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string };
    if (decoded.uid && db.users[decoded.uid]) return decoded.uid;
  } catch {
    return null;
  }
  return null;
}

export function findUserByUsername(username: string): StoredUser | undefined {
  const clean = username.trim().toLowerCase();
  return Object.values(db.users).find((u) => u.username === clean);
}

export function registerUser(username: string, password: string, displayName?: string): { user: UserProfile; token: string } {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    throw new Error('Username must be 3–20 characters (letters, numbers, or underscores).');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (findUserByUsername(clean)) {
    throw new Error('That username is already taken.');
  }

  const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const cleanDisplay = (displayName || username).trim().slice(0, 24) || clean;

  const newUser: StoredUser = {
    id,
    username: clean,
    displayName: cleanDisplay,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
    character: { ...DEFAULT_FEMALE_CHARACTER, name: cleanDisplay },
    progress: { ...DEFAULT_PROGRESS },
    settings: { ...DEFAULT_SETTINGS },
    friends: ['usr_lyra'],
  };

  db.users[id] = newUser;
  persistDb();
  return { user: sanitizeProfile(newUser), token: signToken(id) };
}

export function loginUser(username: string, password: string): { user: UserProfile; token: string } {
  const user = findUserByUsername(username);
  if (!user) {
    throw new Error('Invalid username or password.');
  }
  const attempt = hashPassword(password, user.passwordSalt);
  const a = Buffer.from(attempt, 'hex');
  const b = Buffer.from(user.passwordHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid username or password.');
  }
  return { user: sanitizeProfile(user), token: signToken(user.id) };
}

export function getUserProfile(userId: string): UserProfile | null {
  const user = db.users[userId];
  return user ? sanitizeProfile(user) : null;
}

export function updateUserCharacter(userId: string, character: CharacterConfig): UserProfile {
  const user = db.users[userId];
  if (!user) throw new Error('User not found.');
  const resolved = character.customizeEnabled
    ? resolveActiveCharacter(character)
    : { ...character };
  user.character = resolved;
  if (character.customizeEnabled && !user.progress.unlockedAchievements.includes('badge_customizer')) {
    user.progress.unlockedAchievements = [...user.progress.unlockedAchievements, 'badge_customizer'];
  }
  persistDb();
  return sanitizeProfile(user);
}

export function updateUserProgress(userId: string, progress: PlayerProgress): UserProfile {
  const user = db.users[userId];
  if (!user) throw new Error('User not found.');
  user.progress = progress;
  persistDb();
  return sanitizeProfile(user);
}

export function updateUserSettings(userId: string, settings: SettingsConfig): UserProfile {
  const user = db.users[userId];
  if (!user) throw new Error('User not found.');
  user.settings = settings;
  persistDb();
  return sanitizeProfile(user);
}

export function setOnlinePresence(userId: string, locationId: LocationId | null, roomId: string | null) {
  onlineUsers.set(userId, { locationId, roomId });
}

export function clearOnlinePresence(userId: string) {
  onlineUsers.delete(userId);
}

export function getFriendsList(userId: string): FriendInfo[] {
  const user = db.users[userId];
  if (!user) return [];
  return user.friends
    .map((fid) => db.users[fid])
    .filter((f): f is StoredUser => Boolean(f))
    .map((f) => {
      const presence = onlineUsers.get(f.id);
      return {
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        online: Boolean(presence) || f.id === 'usr_lyra',
        currentLocation: presence?.locationId ?? (f.id === 'usr_lyra' ? 'abandoned_mansion' : null),
        currentRoomId: presence?.roomId ?? null,
      };
    });
}

export function addFriendByUsername(userId: string, friendUsername: string): FriendInfo[] {
  const user = db.users[userId];
  if (!user) throw new Error('User not found.');
  const target = findUserByUsername(friendUsername);
  if (!target) throw new Error('No investigator found with that username.');
  if (target.id === userId) throw new Error('You cannot add yourself as a friend.');
  if (!user.friends.includes(target.id)) {
    user.friends.push(target.id);
    if (!target.friends.includes(userId)) {
      target.friends.push(userId);
    }
    persistDb();
  }
  return getFriendsList(userId);
}
