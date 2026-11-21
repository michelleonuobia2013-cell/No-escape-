export type CharacterGender = 'male' | 'female';
export type HairStyle = 'cropped' | 'swept' | 'long' | 'bob' | 'mohawk';
export type OutfitStyle = 'noir_trench' | 'academy_blazer' | 'forest_cloak' | 'lab_coat' | 'obsidian_suit';
export type ShoeStyle = 'combat_boots' | 'oxford_shoes' | 'plated_greaves' | 'sleek_sneakers';
export type AccessoryStyle = 'none' | 'phantom_mask' | 'silver_monocle' | 'lilac_scarf' | 'detective_fedora';
export type FacialFeature = 'stoic' | 'sharp' | 'mystic' | 'determined';
export type EyeGlow = 'lilac' | 'silver' | 'amber' | 'ice';
export type CharacterAnimation = 'idle' | 'ready' | 'inspect' | 'salute';

export interface CharacterConfig {
  customizeEnabled: boolean;
  name: string;
  gender: CharacterGender;
  hairStyle: HairStyle;
  hairColor: string;
  outfit: OutfitStyle;
  shoes: ShoeStyle;
  accessory: AccessoryStyle;
  skinTone: string;
  facialFeature: FacialFeature;
  eyeGlow: EyeGlow;
  animation: CharacterAnimation;
}

export type LocationId =
  | 'abandoned_mansion'
  | 'mysterious_school'
  | 'dark_forest'
  | 'underground_tunnels'
  | 'abandoned_hospital'
  | 'hidden_laboratory'
  | 'mysterious_city';

export type GameMode = 'solo' | 'multiplayer' | 'story' | 'challenge';

export type PuzzleType =
  | 'clockwork_cipher'
  | 'locker_sequence'
  | 'sigil_alignment'
  | 'valve_pressure'
  | 'frequency_tuner'
  | 'reagent_synthesis'
  | 'skyline_beacons';

export interface ClueDef {
  id: string;
  locationId: LocationId;
  title: string;
  subtitle: string;
  description: string;
  hintValue: string;
  position: [number, number, number];
  isSecret?: boolean;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  dialogue: string[];
  position: [number, number, number];
  rotationY: number;
  outfitColor: string;
  accentColor: string;
}

export interface PuzzleDef {
  id: string;
  type: PuzzleType;
  title: string;
  prompt: string;
  position: [number, number, number];
  solution: number[] | string;
}

export interface LocationDef {
  id: LocationId;
  order: number;
  name: string;
  subtitle: string;
  atmosphere: string;
  description: string;
  challengeTimeLimitSec: number;
  fogColor: string;
  skyColor: string;
  accentHex: string;
  groundColor: string;
  spawnPoint: [number, number, number];
  spawnYaw: number;
  exitPoint: [number, number, number];
  clues: ClueDef[];
  npc: NpcDef;
  puzzle: PuzzleDef;
  missionTitle: string;
  missionSummary: string;
  rewardBadgeId: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'exploration' | 'puzzle' | 'mastery' | 'social';
}

export interface SettingsConfig {
  soundVolume: number;
  musicVolume: number;
  muted: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
  language: 'en' | 'es' | 'fr';
  cameraSensitivity: number;
  invertY: boolean;
  touchControls: 'auto' | 'always' | 'off';
}

export interface PlayerProgress {
  unlockedLocations: LocationId[];
  completedLocations: LocationId[];
  discoveredClues: string[];
  discoveredSecrets: string[];
  solvedPuzzles: string[];
  unlockedAchievements: string[];
  bestChallengeTimes: Partial<Record<LocationId, number>>;
  totalEscapes: number;
  storyChapter: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  character: CharacterConfig;
  progress: PlayerProgress;
  settings: SettingsConfig;
}

export interface FriendInfo {
  id: string;
  username: string;
  displayName: string;
  online: boolean;
  currentLocation?: LocationId | null;
  currentRoomId?: string | null;
}

export interface MultiplayerPlayerState {
  id: string;
  username: string;
  character: CharacterConfig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  moving: boolean;
  voiceActive?: boolean;
  voiceMuted?: boolean;
}

export interface ProximityPeerInfo {
  id: string;
  username: string;
  distance: number;
  gain: number;
  pan: number;
  clarityLabel: string;
  speaking: boolean;
  connected: boolean;
  voiceActive: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  locationId: LocationId;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export type DashboardTab =
  | 'home'
  | 'play'
  | 'character'
  | 'inventory'
  | 'missions'
  | 'friends'
  | 'settings'
  | 'profile';
