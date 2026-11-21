import {
  CharacterConfig,
  LocationId,
  PlayerProgress,
  SettingsConfig,
} from './types';
import { LOCATIONS } from './worldData';

export const DEFAULT_FEMALE_CHARACTER: CharacterConfig = {
  customizeEnabled: false,
  name: 'Agent Lyra',
  gender: 'female',
  hairStyle: 'long',
  hairColor: '#14121D',
  outfit: 'noir_trench',
  shoes: 'combat_boots',
  accessory: 'lilac_scarf',
  skinTone: '#E3B9A4',
  facialFeature: 'mystic',
  eyeGlow: 'lilac',
  animation: 'idle',
};

export const DEFAULT_MALE_CHARACTER: CharacterConfig = {
  customizeEnabled: false,
  name: 'Agent Kael',
  gender: 'male',
  hairStyle: 'swept',
  hairColor: '#14121D',
  outfit: 'obsidian_suit',
  shoes: 'oxford_shoes',
  accessory: 'none',
  skinTone: '#C79272',
  facialFeature: 'stoic',
  eyeGlow: 'silver',
  animation: 'idle',
};

export const DEFAULT_SETTINGS: SettingsConfig = {
  soundVolume: 75,
  musicVolume: 55,
  muted: false,
  graphicsQuality: 'high',
  language: 'en',
  cameraSensitivity: 1.0,
  invertY: false,
  touchControls: 'auto',
};

export const DEFAULT_PROGRESS: PlayerProgress = {
  unlockedLocations: ['abandoned_mansion'],
  completedLocations: [],
  discoveredClues: [],
  discoveredSecrets: [],
  solvedPuzzles: [],
  unlockedAchievements: [],
  bestChallengeTimes: {},
  totalEscapes: 0,
  storyChapter: 1,
};

/**
 * Resolves the active character appearance: when customizeEnabled is false,
 * always enforces the default game character for the selected gender.
 */
export function resolveActiveCharacter(config: CharacterConfig): CharacterConfig {
  if (!config.customizeEnabled) {
    return config.gender === 'male'
      ? { ...DEFAULT_MALE_CHARACTER, customizeEnabled: false }
      : { ...DEFAULT_FEMALE_CHARACTER, customizeEnabled: false };
  }
  const cleanName = config.name.trim().slice(0, 24) || 'Investigator';
  return {
    ...config,
    name: cleanName,
  };
}

export function verifyPuzzleSolution(
  locationId: LocationId,
  attempt: number[],
): boolean {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return false;
  const sol = loc.puzzle.solution;
  if (!Array.isArray(sol)) return false;
  if (attempt.length !== sol.length) return false;
  return sol.every((val, idx) => Number(attempt[idx]) === val);
}

export function evaluateProgressAfterEscape(
  progress: PlayerProgress,
  locationId: LocationId,
  elapsedSec?: number,
): PlayerProgress {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return progress;

  const completed = Array.from(
    new Set([...progress.completedLocations, locationId]),
  );
  const solvedPuzzles = Array.from(
    new Set([...progress.solvedPuzzles, loc.puzzle.id]),
  );

  // Unlock next location in order
  const nextLoc = LOCATIONS.find((l) => l.order === loc.order + 1);
  const unlockedLocations = nextLoc
    ? Array.from(new Set([...progress.unlockedLocations, nextLoc.id]))
    : [...progress.unlockedLocations];

  const achievements = new Set(progress.unlockedAchievements);
  achievements.add(loc.rewardBadgeId);

  if (progress.discoveredClues.length >= 6) {
    achievements.add('badge_collector');
  }
  if (progress.discoveredSecrets.length >= 3) {
    achievements.add('badge_secrets');
  }

  const bestChallengeTimes = { ...progress.bestChallengeTimes };
  if (typeof elapsedSec === 'number' && elapsedSec > 0) {
    const prevBest = bestChallengeTimes[locationId];
    if (!prevBest || elapsedSec < prevBest) {
      bestChallengeTimes[locationId] = Math.round(elapsedSec);
    }
  }

  return {
    ...progress,
    unlockedLocations,
    completedLocations: completed,
    solvedPuzzles,
    unlockedAchievements: Array.from(achievements),
    bestChallengeTimes,
    totalEscapes: progress.totalEscapes + 1,
    storyChapter: Math.max(progress.storyChapter, Math.min(7, completed.length + 1)),
  };
}

export function registerClueDiscovery(
  progress: PlayerProgress,
  clueId: string,
  isSecret = false,
): PlayerProgress {
  const discoveredClues = Array.from(new Set([...progress.discoveredClues, clueId]));
  const discoveredSecrets = isSecret
    ? Array.from(new Set([...progress.discoveredSecrets, clueId]))
    : [...progress.discoveredSecrets];

  const achievements = new Set(progress.unlockedAchievements);
  if (discoveredClues.length >= 6) achievements.add('badge_collector');
  if (discoveredSecrets.length >= 3) achievements.add('badge_secrets');

  return {
    ...progress,
    discoveredClues,
    discoveredSecrets,
    unlockedAchievements: Array.from(achievements),
  };
}

export function clampPlayerToArena(
  x: number,
  z: number,
  boundsRadius = 17.5,
  obstacles: Array<{ x: number; z: number; rx: number; rz: number }> = [],
  playerRadius = 0.65,
): { x: number; z: number } {
  let nx = Math.max(-boundsRadius, Math.min(boundsRadius, x));
  let nz = Math.max(-boundsRadius, Math.min(boundsRadius, z));

  for (const box of obstacles) {
    const halfW = box.rx + playerRadius;
    const halfD = box.rz + playerRadius;
    const dx = nx - box.x;
    const dz = nz - box.z;
    if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
      const penX = halfW - Math.abs(dx);
      const penZ = halfD - Math.abs(dz);
      if (penX < penZ) {
        nx += dx >= 0 ? penX : -penX;
      } else {
        nz += dz >= 0 ? penZ : -penZ;
      }
    }
  }

  return { x: nx, z: nz };
}

export const TRANSLATIONS = {
  en: {
    playNow: 'Play Now',
    customizeCharacter: 'Customize Character',
    settings: 'Settings',
    gameRules: 'Game Rules',
    aboutGame: 'About the Game',
    profile: 'Profile',
    saveCharacter: 'Save Character',
    home: 'Home',
    play: 'Play',
    character: 'Character',
    inventory: 'Inventory',
    missions: 'Missions',
    friends: 'Friends',
    soloMode: 'Solo Mode',
    multiplayerMode: 'Multiplayer Mode',
    storyMode: 'Story Mode',
    challengeMode: 'Challenge Mode',
  },
  es: {
    playNow: 'Jugar Ahora',
    customizeCharacter: 'Personalizar Personaje',
    settings: 'Ajustes',
    gameRules: 'Reglas del Juego',
    aboutGame: 'Sobre el Juego',
    profile: 'Perfil',
    saveCharacter: 'Guardar Personaje',
    home: 'Inicio',
    play: 'Jugar',
    character: 'Personaje',
    inventory: 'Inventario',
    missions: 'Misiones',
    friends: 'Amigos',
    soloMode: 'Modo Solitario',
    multiplayerMode: 'Modo Multijugador',
    storyMode: 'Modo Historia',
    challengeMode: 'Modo Desafío',
  },
  fr: {
    playNow: 'Jouer Maintenant',
    customizeCharacter: 'Personnaliser',
    settings: 'Paramètres',
    gameRules: 'Règles du Jeu',
    aboutGame: 'À Propos',
    profile: 'Profil',
    saveCharacter: 'Enregistrer',
    home: 'Accueil',
    play: 'Jouer',
    character: 'Personnage',
    inventory: 'Inventaire',
    missions: 'Missions',
    friends: 'Amis',
    soloMode: 'Mode Solo',
    multiplayerMode: 'Multijoueur',
    storyMode: 'Mode Histoire',
    challengeMode: 'Mode Défi',
  },
} as const;
