// server.ts
import http from "node:http";
import path2 from "node:path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

// server/store.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// src/game/worldData.ts
var LOCATIONS = [
  {
    id: "abandoned_mansion",
    order: 1,
    name: "Blackwood Manor",
    subtitle: "Abandoned Mansion",
    atmosphere: "Velvet shadows, gilded dust & stopped pendulums",
    description: "Once the seat of the Blackwood Syndicate, its grand marble atrium stands frozen at 11:47. A concealed vault lies beneath the obsidian chandelier.",
    challengeTimeLimitSec: 180,
    fogColor: "#0B0814",
    skyColor: "#07050E",
    accentHex: "#C4A1FF",
    groundColor: "#151120",
    spawnPoint: [0, 0, 12],
    spawnYaw: 0,
    exitPoint: [0, 0, -14],
    missionTitle: "Chapter I: The Frozen Atrium",
    missionSummary: "Inspect the Manor clues, speak to Archibald, and unlock the Clockwork Vault.",
    rewardBadgeId: "badge_manor",
    npc: {
      id: "npc_archibald",
      name: "Archibald Vane",
      role: "Spectral Butler",
      dialogue: [
        "Welcome back to Blackwood Manor. Every pendulum ceased the night the Syndicate vanished.",
        "Search the velvet parlor and fallen candelabra\u2014the Hour, Minute, and Chime dials never lie."
      ],
      position: [-6.5, 0, 4],
      rotationY: 0.7,
      outfitColor: "#1E1A2E",
      accentColor: "#C4A1FF"
    },
    clues: [
      {
        id: "clue_manor_ledger",
        locationId: "abandoned_mansion",
        title: "Charred Estate Ledger",
        subtitle: "Grand Staircase Foot",
        description: "An ink-stained ledger lists the final dinner hour before lockdown: 9 o\u2019clock.",
        hintValue: "Hour Dial = 9",
        position: [6, 0, 6]
      },
      {
        id: "clue_manor_locket",
        locationId: "abandoned_mansion",
        title: "Stopped Pocket Watch",
        subtitle: "Obsidian Pedestal",
        description: "Its silver minute hand snapped precisely on 4, pointing toward the northern arch.",
        hintValue: "Minute Dial = 4",
        position: [-7, 0, -5]
      },
      {
        id: "secret_manor_signet",
        locationId: "abandoned_mansion",
        title: "Blackwood Lilac Signet",
        subtitle: "Hidden Alcove",
        description: "A royal lilac amethyst seal engraved with the chime number 7.",
        hintValue: "Chime Dial = 7 (Vault Secret)",
        position: [11, 0, -10],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_manor_clockwork",
      type: "clockwork_cipher",
      title: "Grandfather Clockwork Cipher",
      prompt: "Set the three brass chronometer rings (Hour \xB7 Minute \xB7 Chime) to unseal the Manor Exit.",
      position: [0, 0, -8],
      solution: [9, 4, 7]
    }
  },
  {
    id: "mysterious_school",
    order: 2,
    name: "St. Vesper Academy",
    subtitle: "Mysterious School",
    atmosphere: "Moonlit lockers, chalk runes & silent belltowers",
    description: "An elite boarding academy abandoned mid-semester. Lilac chalk equations cover the slate boards, guarding the Dean\u2019s encrypted archive.",
    challengeTimeLimitSec: 195,
    fogColor: "#0A0916",
    skyColor: "#060510",
    accentHex: "#B794F4",
    groundColor: "#141322",
    spawnPoint: [0, 0, 12],
    spawnYaw: 0,
    exitPoint: [0, 0, -14],
    missionTitle: "Chapter II: Midnight Roll Call",
    missionSummary: "Uncover the missing student cipher across the corridor lockers and unlock the Belltower Door.",
    rewardBadgeId: "badge_school",
    npc: {
      id: "npc_clara",
      name: "Clara Sterling",
      role: "Head Prefect Echo",
      dialogue: [
        "Curfew rang thirty years ago, yet the lockers still hum with encrypted notes.",
        "Order the four Roman numerals by the sequence etched on the chalkboard and trophy plinth."
      ],
      position: [6, 0, 3],
      rotationY: -0.6,
      outfitColor: "#251F3A",
      accentColor: "#E9D8FD"
    },
    clues: [
      {
        id: "clue_school_chalkboard",
        locationId: "mysterious_school",
        title: "Chalkboard Cipher Note",
        subtitle: "Lecture Alcove",
        description: 'A crisp chalk equation reads: "First comes III, last stands II. Never place I before IV."',
        hintValue: "Sequence starts 3, ends 2",
        position: [-7, 0, 5]
      },
      {
        id: "clue_school_trophy",
        locationId: "mysterious_school",
        title: "Honor Roll Plaque",
        subtitle: "Hallway Vitrine",
        description: "Four brass locker keys hang in order: IV precedes I in the Midnight Honors.",
        hintValue: "Middle pair: 4 then 1",
        position: [7.5, 0, -5]
      },
      {
        id: "secret_school_diary",
        locationId: "mysterious_school",
        title: "Vesper Ribbon Diary",
        subtitle: "Hidden Study Desk",
        description: "Reveals that St. Vesper funded the tunnels beneath Hollowveil Woods.",
        hintValue: "Archive Secret \xB7 Code 3-4-1-2",
        position: [-11, 0, -9],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_school_lockers",
      type: "locker_sequence",
      title: "Dean\u2019s Locker Combination",
      prompt: "Enter the 4-digit locker tumbler sequence discovered in the academy clues.",
      position: [0, 0, -8],
      solution: [3, 4, 1, 2]
    }
  },
  {
    id: "dark_forest",
    order: 3,
    name: "Hollowveil Woods",
    subtitle: "Dark Forest",
    atmosphere: "Bioluminescent mist, towering obsidian pines & ancient stones",
    description: "A nocturnal woodland bathed in pale lilac spores. Stone monoliths form a forgotten compass around a sealed subterranean hatch.",
    challengeTimeLimitSec: 210,
    fogColor: "#090713",
    skyColor: "#05040B",
    accentHex: "#A78BFA",
    groundColor: "#0F111A",
    spawnPoint: [0, 0, 14],
    spawnYaw: 0,
    exitPoint: [0, 0, -15],
    missionTitle: "Chapter III: Whispers in the Mist",
    missionSummary: "Follow the glowing lilac flora, consult Theron, and align the Ancient Forest Monolith.",
    rewardBadgeId: "badge_forest",
    npc: {
      id: "npc_theron",
      name: "Theron Moss",
      role: "Night Ranger",
      dialogue: [
        "Don\u2019t stray far from the lilac lanterns. The trees shift when no one watches.",
        "The stone ring demands three celestial phases: Crescent, Eclipse, and Crown."
      ],
      position: [-6, 0, 5],
      rotationY: 0.8,
      outfitColor: "#1B2228",
      accentColor: "#A78BFA"
    },
    clues: [
      {
        id: "clue_forest_stone",
        locationId: "dark_forest",
        title: "Carved Waystone",
        subtitle: "Mossy Clearing",
        description: "Three runes glow faintly: Moon Crescent (1), Total Eclipse (3), Lilac Crown (2).",
        hintValue: "Outer = 1, Inner = 3, Core = 2",
        position: [7, 0, 4]
      },
      {
        id: "clue_forest_lantern",
        locationId: "dark_forest",
        title: "Ranger\u2019s Compass Map",
        subtitle: "Fallen Trunk",
        description: "Marks the subterranean hatch directly north of the central standing altar.",
        hintValue: "Align Outer\u2192Core: 1 \xB7 3 \xB7 2",
        position: [-7.5, 0, -4]
      },
      {
        id: "secret_forest_relic",
        locationId: "dark_forest",
        title: "Spore-Bound Amulet",
        subtitle: "Deep Thicket Shrine",
        description: "An organic crystal pulsing in sync with the Underground Tunnels below.",
        hintValue: "Forest Heart Secret",
        position: [12, 0, -9],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_forest_sigil",
      type: "sigil_alignment",
      title: "Ancient Sigil Altar",
      prompt: "Rotate the three concentric stone rings until they match the Waystone rune alignment.",
      position: [0, 0, -8],
      solution: [1, 3, 2]
    }
  },
  {
    id: "underground_tunnels",
    order: 4,
    name: "Obsidian Catacombs",
    subtitle: "Underground Tunnels",
    atmosphere: "Subterranean aqueducts, iron rails & violet lantern steam",
    description: "Beneath the forest lies a labyrinth of flooded stone vaults and rusted pressure conduits linking the Syndicate\u2019s hidden facilities.",
    challengeTimeLimitSec: 210,
    fogColor: "#080611",
    skyColor: "#040309",
    accentHex: "#9F7AEA",
    groundColor: "#12101A",
    spawnPoint: [0, 0, 12],
    spawnYaw: 0,
    exitPoint: [0, 0, -14],
    missionTitle: "Chapter IV: Deep Conduit",
    missionSummary: "Locate the pressure schematics, balance the three steam valves, and breach the bulkhead.",
    rewardBadgeId: "badge_tunnels",
    npc: {
      id: "npc_maren",
      name: "Maren Holt",
      role: "Subterranean Cartographer",
      dialogue: [
        "These tunnels predate the city above. One wrong valve floods the lower aqueduct.",
        "Check the brass gauge plate by the rail cart before turning the manifold wheels."
      ],
      position: [5.5, 0, 5],
      rotationY: -0.7,
      outfitColor: "#211D2D",
      accentColor: "#C4A1FF"
    },
    clues: [
      {
        id: "clue_tunnels_plate",
        locationId: "underground_tunnels",
        title: "Manifold Gauge Plate",
        subtitle: "Derailed Minecart",
        description: 'Stamped steel reads: "Safe Bulkhead Equilibrium: Valve A = 4 bar, Valve B = 2 bar, Valve C = 6 bar."',
        hintValue: "Pressures: 4 \xB7 2 \xB7 6",
        position: [-6.5, 0, 3]
      },
      {
        id: "clue_tunnels_blueprint",
        locationId: "underground_tunnels",
        title: "Waterproofed Tube Map",
        subtitle: "Floodgate Pillar",
        description: "Shows a direct shaft rising from the Catacombs straight into Ward Nine Asylum.",
        hintValue: "Target: [4, 2, 6]",
        position: [7, 0, -5]
      },
      {
        id: "secret_tunnels_key",
        locationId: "underground_tunnels",
        title: "Master Skeleton Valve",
        subtitle: "Sunken Cistern",
        description: 'A heavy obsidian-plated key engraved with "WARD IX \u2014 AUTHORIZED".',
        hintValue: "Cistern Secret",
        position: [-11, 0, -10],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_tunnels_valves",
      type: "valve_pressure",
      title: "Bulkhead Pressure Manifold",
      prompt: "Calibrate the three steam pressure valves (bar) to open the hydraulic exit gate.",
      position: [0, 0, -8],
      solution: [4, 2, 6]
    }
  },
  {
    id: "abandoned_hospital",
    order: 5,
    name: "Ward Nine Asylum",
    subtitle: "Abandoned Hospital",
    atmosphere: "Sterile obsidian tiles, flickering lilac lamps & acoustic echoes",
    description: "A forgotten research sanatorium where patients reported hearing harmonic frequencies humming through the steel walls.",
    challengeTimeLimitSec: 225,
    fogColor: "#0A0814",
    skyColor: "#05040B",
    accentHex: "#D6BCFA",
    groundColor: "#161420",
    spawnPoint: [0, 0, 12],
    spawnYaw: 0,
    exitPoint: [0, 0, -14],
    missionTitle: "Chapter V: Silent Ward",
    missionSummary: "Gather the telemetry tapes and tune the Acoustic Isolation Console to unlock the elevator.",
    rewardBadgeId: "badge_hospital",
    npc: {
      id: "npc_evelyn",
      name: "Evelyn Cross",
      role: "Night Ward Echo",
      dialogue: [
        "Listen closely to the corridor hum. Every lock in Ward Nine responds to resonance.",
        "Find the patient chart and oscilloscope tape\u2014they carry the exact frequency."
      ],
      position: [-6, 0, 4],
      rotationY: 0.75,
      outfitColor: "#232030",
      accentColor: "#E9D8FD"
    },
    clues: [
      {
        id: "clue_hospital_chart",
        locationId: "abandoned_hospital",
        title: "Patient 09 Telemetry Chart",
        subtitle: "Nurses Station",
        description: 'Highlighted waveform notes: "Carrier Frequency 440 Hz \xB7 Harmonic Phase 7 \xB7 Amplitude 5".',
        hintValue: "Wave: 4 \xB7 7 \xB7 5",
        position: [6.5, 0, 5]
      },
      {
        id: "clue_hospital_tape",
        locationId: "abandoned_hospital",
        title: "Reel-to-Reel Recording",
        subtitle: "Operating Theater",
        description: 'A calm voice repeats: "4-7-5 unlocks the basement elevator to the Aether Lab."',
        hintValue: "Frequency Dial = 4 \xB7 7 \xB7 5",
        position: [-7, 0, -5]
      },
      {
        id: "secret_hospital_badge",
        locationId: "abandoned_hospital",
        title: "Chief Surgeon\u2019s Keycard",
        subtitle: "Locked Quarantine Bay",
        description: "Clearance level Obsidian-V, signed by Dr. Julian Mercer.",
        hintValue: "Quarantine Secret",
        position: [11, 0, -9],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_hospital_freq",
      type: "frequency_tuner",
      title: "Acoustic Resonance Console",
      prompt: "Tune the three harmonic sliders (Carrier \xB7 Phase \xB7 Amplitude) to neutralize the magnetic seal.",
      position: [0, 0, -8],
      solution: [4, 7, 5]
    }
  },
  {
    id: "hidden_laboratory",
    order: 6,
    name: "Aether Vault Lab",
    subtitle: "Hidden Laboratory",
    atmosphere: "Cryo-glass chambers, lilac plasma arcs & precision instruments",
    description: "Deep beneath Ward Nine lies the Syndicate\u2019s true heart: a luxury obsidian laboratory synthesizing luminescent Aether crystals.",
    challengeTimeLimitSec: 240,
    fogColor: "#090616",
    skyColor: "#05030D",
    accentHex: "#C4A1FF",
    groundColor: "#120E20",
    spawnPoint: [0, 0, 12],
    spawnYaw: 0,
    exitPoint: [0, 0, -14],
    missionTitle: "Chapter VI: Project Lilac",
    missionSummary: "Uncover Dr. Julian\u2019s formula and synthesize the stable Aether catalyst.",
    rewardBadgeId: "badge_lab",
    npc: {
      id: "npc_julian",
      name: "Dr. Julian Mercer",
      role: "Rogue Alchemist",
      dialogue: [
        "You made it past the wards. Few investigators reach the Aether Vault.",
        "Stabilize the three containment reagents without overloading the chamber\u2014check my cryo-notes first."
      ],
      position: [6, 0, 4],
      rotationY: -0.7,
      outfitColor: "#1E1B2B",
      accentColor: "#C4A1FF"
    },
    clues: [
      {
        id: "clue_lab_formula",
        locationId: "hidden_laboratory",
        title: "Aether Synthesis Formula",
        subtitle: "Cryo Terminal",
        description: 'Formula C-9: "2 parts Obsidian Sol \xB7 5 parts Lilac Ether \xB7 3 parts Silver Catalyst."',
        hintValue: "Mix: 2 \xB7 5 \xB7 3",
        position: [-6.5, 0, 4]
      },
      {
        id: "clue_lab_log",
        locationId: "hidden_laboratory",
        title: "Researcher\u2019s Glass Tablet",
        subtitle: "Centrifuge Bench",
        description: "Confirms the final extraction shaft leads upward into the heart of Nocturne Citadel.",
        hintValue: "Ratios: [2, 5, 3]",
        position: [7, 0, -5]
      },
      {
        id: "secret_lab_core",
        locationId: "hidden_laboratory",
        title: "Pure Lilac Prism Core",
        subtitle: "Hidden Containment Pod",
        description: "A flawless crystalline prism humming with infinite resonance.",
        hintValue: "Vault Core Secret",
        position: [-11, 0, -9],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_lab_reagents",
      type: "reagent_synthesis",
      title: "Aether Catalyst Synthesizer",
      prompt: "Calibrate the exact reagent units (Obsidian \xB7 Lilac \xB7 Silver) to unlock the surface lift.",
      position: [0, 0, -8],
      solution: [2, 5, 3]
    }
  },
  {
    id: "mysterious_city",
    order: 7,
    name: "Nocturne Citadel",
    subtitle: "Mysterious City",
    atmosphere: "Obsidian skyscrapers, lilac skylight beams & rain-slick plazas",
    description: "An eerie, deserted metropolis locked under eternal twilight. Align the three skyline prisms to break the citywide quarantine.",
    challengeTimeLimitSec: 250,
    fogColor: "#080612",
    skyColor: "#05040B",
    accentHex: "#E9D8FD",
    groundColor: "#100E1B",
    spawnPoint: [0, 0, 14],
    spawnYaw: 0,
    exitPoint: [0, 0, -15],
    missionTitle: "Finale: There Is No Escape",
    missionSummary: "Decrypt the Citadel Beacons and confront the final truth of NO ESCAPE.",
    rewardBadgeId: "badge_city",
    npc: {
      id: "npc_soren",
      name: "Soren Kael",
      role: "The Watcher",
      dialogue: [
        "Look at the skyline\u2014the entire city is an enclosure built around the Syndicate\u2019s memory.",
        "Align the North, East, and Zenith prisms to open the Citadel Gate\u2026 if escape truly exists."
      ],
      position: [-6, 0, 5],
      rotationY: 0.7,
      outfitColor: "#191626",
      accentColor: "#E9D8FD"
    },
    clues: [
      {
        id: "clue_city_beacon",
        locationId: "mysterious_city",
        title: "Skyline Telemetry Slate",
        subtitle: "Central Fountain",
        description: "Beacon Azimuths calibrated at 6 \xB7 8 \xB7 4 degrees of lilac refraction.",
        hintValue: "Beacons: 6 \xB7 8 \xB7 4",
        position: [7, 0, 5]
      },
      {
        id: "clue_city_monolith",
        locationId: "mysterious_city",
        title: "Syndicate Manifesto",
        subtitle: "Obsidian Plaza",
        description: 'Reads: "When all seven seals fall in 6-8-4 alignment, the Citadel Gate reveals what lies beyond."',
        hintValue: "Alignment = [6, 8, 4]",
        position: [-7.5, 0, -5]
      },
      {
        id: "secret_city_crown",
        locationId: "mysterious_city",
        title: "Crown of the Seventh Seal",
        subtitle: "Hidden Rooftop Shrine",
        description: "Proof that you uncovered the deepest conspiracy behind Nocturne Citadel.",
        hintValue: "Ultimate Secret",
        position: [12, 0, -10],
        isSecret: true
      }
    ],
    puzzle: {
      id: "puzzle_city_beacons",
      type: "skyline_beacons",
      title: "Citadel Prism Array",
      prompt: "Align the three skyline prism beacons (North \xB7 East \xB7 Zenith) to shatter the quarantine lock.",
      position: [0, 0, -8],
      solution: [6, 8, 4]
    }
  }
];

// src/game/rules.ts
var DEFAULT_FEMALE_CHARACTER = {
  customizeEnabled: false,
  name: "Agent Lyra",
  gender: "female",
  hairStyle: "long",
  hairColor: "#14121D",
  outfit: "noir_trench",
  shoes: "combat_boots",
  accessory: "lilac_scarf",
  skinTone: "#E3B9A4",
  facialFeature: "mystic",
  eyeGlow: "lilac",
  animation: "idle"
};
var DEFAULT_MALE_CHARACTER = {
  customizeEnabled: false,
  name: "Agent Kael",
  gender: "male",
  hairStyle: "swept",
  hairColor: "#14121D",
  outfit: "obsidian_suit",
  shoes: "oxford_shoes",
  accessory: "none",
  skinTone: "#C79272",
  facialFeature: "stoic",
  eyeGlow: "silver",
  animation: "idle"
};
var DEFAULT_SETTINGS = {
  soundVolume: 75,
  musicVolume: 55,
  muted: false,
  graphicsQuality: "high",
  language: "en",
  cameraSensitivity: 1,
  invertY: false,
  touchControls: "auto"
};
var DEFAULT_PROGRESS = {
  unlockedLocations: ["abandoned_mansion"],
  completedLocations: [],
  discoveredClues: [],
  discoveredSecrets: [],
  solvedPuzzles: [],
  unlockedAchievements: [],
  bestChallengeTimes: {},
  totalEscapes: 0,
  storyChapter: 1
};
function resolveActiveCharacter(config) {
  if (!config.customizeEnabled) {
    return config.gender === "male" ? { ...DEFAULT_MALE_CHARACTER, customizeEnabled: false } : { ...DEFAULT_FEMALE_CHARACTER, customizeEnabled: false };
  }
  const cleanName = config.name.trim().slice(0, 24) || "Investigator";
  return {
    ...config,
    name: cleanName
  };
}
function verifyPuzzleSolution(locationId, attempt) {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return false;
  const sol = loc.puzzle.solution;
  if (!Array.isArray(sol)) return false;
  if (attempt.length !== sol.length) return false;
  return sol.every((val, idx) => Number(attempt[idx]) === val);
}

// server/store.ts
var DATA_DIR = path.resolve(process.cwd(), ".data");
var DB_PATH = path.join(DATA_DIR, "no-escape-db.json");
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function createSeedUser(id, username, displayName, password, character, friends, progress = DEFAULT_PROGRESS) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id,
    username: username.toLowerCase(),
    displayName,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    character,
    progress,
    settings: { ...DEFAULT_SETTINGS },
    friends
  };
}
function loadOrInitDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.users && parsed.secret) {
        return parsed;
      }
    } catch {
    }
  }
  const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  const seeded = {
    secret,
    users: {
      usr_detective: createSeedUser(
        "usr_detective",
        "detective",
        "Detective Noir",
        "shadow2026",
        { ...DEFAULT_FEMALE_CHARACTER, customizeEnabled: true, name: "Vespera" },
        ["usr_lyra", "usr_soren"],
        {
          ...DEFAULT_PROGRESS,
          unlockedLocations: ["abandoned_mansion", "mysterious_school", "dark_forest"],
          completedLocations: ["abandoned_mansion"],
          discoveredClues: ["clue_manor_ledger"],
          unlockedAchievements: ["badge_manor", "badge_customizer"],
          totalEscapes: 1,
          storyChapter: 2
        }
      ),
      usr_lyra: createSeedUser(
        "usr_lyra",
        "lyra_vance",
        "Lyra Vance",
        "shadow2026",
        { ...DEFAULT_FEMALE_CHARACTER, name: "Lyra Vance", accessory: "silver_monocle" },
        ["usr_detective"]
      ),
      usr_soren: createSeedUser(
        "usr_soren",
        "soren_k",
        "Soren Kael",
        "shadow2026",
        { ...DEFAULT_MALE_CHARACTER, name: "Soren Kael", outfit: "noir_trench" },
        ["usr_detective"]
      )
    }
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2), "utf8");
  return seeded;
}
var db = loadOrInitDb();
var onlineUsers = /* @__PURE__ */ new Map();
function persistDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error("Failed to persist store:", err);
  }
}
function sanitizeProfile(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    character: user.character,
    progress: user.progress,
    settings: user.settings
  };
}
function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", db.secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", db.secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.uid && db.users[decoded.uid]) return decoded.uid;
  } catch {
    return null;
  }
  return null;
}
function findUserByUsername(username) {
  const clean = username.trim().toLowerCase();
  return Object.values(db.users).find((u) => u.username === clean);
}
function registerUser(username, password, displayName) {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    throw new Error("Username must be 3\u201320 characters (letters, numbers, or underscores).");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  if (findUserByUsername(clean)) {
    throw new Error("That username is already taken.");
  }
  const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
  const salt = crypto.randomBytes(16).toString("hex");
  const cleanDisplay = (displayName || username).trim().slice(0, 24) || clean;
  const newUser = {
    id,
    username: clean,
    displayName: cleanDisplay,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    character: { ...DEFAULT_FEMALE_CHARACTER, name: cleanDisplay },
    progress: { ...DEFAULT_PROGRESS },
    settings: { ...DEFAULT_SETTINGS },
    friends: ["usr_lyra"]
  };
  db.users[id] = newUser;
  persistDb();
  return { user: sanitizeProfile(newUser), token: signToken(id) };
}
function loginUser(username, password) {
  const user = findUserByUsername(username);
  if (!user) {
    throw new Error("Invalid username or password.");
  }
  const attempt = hashPassword(password, user.passwordSalt);
  const a = Buffer.from(attempt, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid username or password.");
  }
  return { user: sanitizeProfile(user), token: signToken(user.id) };
}
function getUserProfile(userId) {
  const user = db.users[userId];
  return user ? sanitizeProfile(user) : null;
}
function updateUserCharacter(userId, character) {
  const user = db.users[userId];
  if (!user) throw new Error("User not found.");
  const resolved = character.customizeEnabled ? resolveActiveCharacter(character) : { ...character };
  user.character = resolved;
  if (character.customizeEnabled && !user.progress.unlockedAchievements.includes("badge_customizer")) {
    user.progress.unlockedAchievements = [...user.progress.unlockedAchievements, "badge_customizer"];
  }
  persistDb();
  return sanitizeProfile(user);
}
function updateUserProgress(userId, progress) {
  const user = db.users[userId];
  if (!user) throw new Error("User not found.");
  user.progress = progress;
  persistDb();
  return sanitizeProfile(user);
}
function updateUserSettings(userId, settings) {
  const user = db.users[userId];
  if (!user) throw new Error("User not found.");
  user.settings = settings;
  persistDb();
  return sanitizeProfile(user);
}
function setOnlinePresence(userId, locationId, roomId) {
  onlineUsers.set(userId, { locationId, roomId });
}
function clearOnlinePresence(userId) {
  onlineUsers.delete(userId);
}
function getFriendsList(userId) {
  const user = db.users[userId];
  if (!user) return [];
  return user.friends.map((fid) => db.users[fid]).filter((f) => Boolean(f)).map((f) => {
    const presence = onlineUsers.get(f.id);
    return {
      id: f.id,
      username: f.username,
      displayName: f.displayName,
      online: Boolean(presence) || f.id === "usr_lyra",
      currentLocation: presence?.locationId ?? (f.id === "usr_lyra" ? "abandoned_mansion" : null),
      currentRoomId: presence?.roomId ?? null
    };
  });
}
function addFriendByUsername(userId, friendUsername) {
  const user = db.users[userId];
  if (!user) throw new Error("User not found.");
  const target = findUserByUsername(friendUsername);
  if (!target) throw new Error("No investigator found with that username.");
  if (target.id === userId) throw new Error("You cannot add yourself as a friend.");
  if (!user.friends.includes(target.id)) {
    user.friends.push(target.id);
    if (!target.friends.includes(userId)) {
      target.friends.push(userId);
    }
    persistDb();
  }
  return getFriendsList(userId);
}

// server.ts
var PORT = Number(process.env.PORT || 3e3);
var IS_PROD = process.env.NODE_ENV === "production";
var rooms = /* @__PURE__ */ new Map();
rooms.set("ROOM-OBSIDIAN", {
  id: "ROOM-OBSIDIAN",
  name: "Blackwood Investigation Hall",
  locationId: "abandoned_mansion",
  hostName: "Lyra Vance",
  maxPlayers: 6,
  isPrivate: false,
  players: /* @__PURE__ */ new Map(),
  discoveredClues: /* @__PURE__ */ new Set(),
  puzzleSolved: false,
  chat: [
    {
      id: "msg_seed_1",
      sender: "Lyra Vance",
      text: "The atrium clock is frozen. Inspect the ledger and pocket watch together.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  ]
});
function broadcastToRoom(room, payload, excludeId) {
  const raw = JSON.stringify(payload);
  for (const [pid, client] of room.players.entries()) {
    if (excludeId && pid === excludeId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}
function getRoomSummaries() {
  return Array.from(rooms.values()).filter((r) => !r.isPrivate).map((r) => ({
    id: r.id,
    name: r.name,
    locationId: r.locationId,
    hostName: r.hostName,
    playerCount: r.players.size,
    maxPlayers: r.maxPlayers,
    isPrivate: r.isPrivate
  }));
}
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  const extractUserId = (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      return verifyToken(auth.slice(7));
    }
    return null;
  };
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, game: "NO ESCAPE", rooms: rooms.size });
  });
  app.post("/api/auth/register", (req, res) => {
    try {
      const { username, password, displayName } = req.body ?? {};
      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }
      const result = registerUser(username, password, typeof displayName === "string" ? displayName : void 0);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Registration failed." });
    }
  });
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }
      const result = loginUser(username, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : "Login failed." });
    }
  });
  app.get("/api/auth/me", (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const profile = getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: "Account not found." });
      return;
    }
    res.json({ user: profile });
  });
  app.put("/api/player/character", (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Authentication required to save character to cloud profile." });
      return;
    }
    try {
      const user = updateUserCharacter(userId, req.body);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Could not update character." });
    }
  });
  app.put("/api/player/progress", (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      const user = updateUserProgress(userId, req.body);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Could not update progress." });
    }
  });
  app.put("/api/player/settings", (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      const user = updateUserSettings(userId, req.body);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Could not update settings." });
    }
  });
  app.get("/api/friends", (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to view and manage your friends list." });
      return;
    }
    res.json({ friends: getFriendsList(userId) });
  });
  app.post("/api/friends/add", (req, res) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to add friends." });
      return;
    }
    try {
      const { username } = req.body ?? {};
      if (typeof username !== "string" || !username.trim()) {
        res.status(400).json({ error: "Enter a valid investigator username." });
        return;
      }
      const friends = addFriendByUsername(userId, username);
      res.json({ friends });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Could not add friend." });
    }
  });
  app.get("/api/multiplayer/rooms", (_req, res) => {
    res.json({ rooms: getRoomSummaries() });
  });
  app.post("/api/multiplayer/rooms", (req, res) => {
    const { name, locationId, hostName, isPrivate } = req.body ?? {};
    const validLocations = [
      "abandoned_mansion",
      "mysterious_school",
      "dark_forest",
      "underground_tunnels",
      "abandoned_hospital",
      "hidden_laboratory",
      "mysterious_city"
    ];
    const loc = validLocations.includes(locationId) ? locationId : "abandoned_mansion";
    const roomCode = `ROOM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const room = {
      id: roomCode,
      name: typeof name === "string" && name.trim().slice(0, 36) || "Syndicate Investigation",
      locationId: loc,
      hostName: typeof hostName === "string" && hostName.trim().slice(0, 24) || "Investigator",
      maxPlayers: 6,
      isPrivate: Boolean(isPrivate),
      players: /* @__PURE__ */ new Map(),
      discoveredClues: /* @__PURE__ */ new Set(),
      puzzleSolved: false,
      chat: []
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
        isPrivate: room.isPrivate
      }
    });
  });
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    let activeRoom = null;
    let playerId = `plr_${Math.random().toString(36).slice(2, 9)}`;
    let authedUserId = null;
    const cleanupConnection = () => {
      if (authedUserId) clearOnlinePresence(authedUserId);
      if (activeRoom && activeRoom.players.has(playerId)) {
        activeRoom.players.delete(playerId);
        broadcastToRoom(activeRoom, { type: "player_left", playerId });
        if (activeRoom.players.size === 0 && activeRoom.id !== "ROOM-OBSIDIAN") {
          rooms.delete(activeRoom.id);
        }
        activeRoom = null;
      }
    };
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "join_room") {
          cleanupConnection();
          const roomId = (msg.roomId || "ROOM-OBSIDIAN").toUpperCase();
          let room = rooms.get(roomId);
          if (!room) {
            room = {
              id: roomId,
              name: `Investigation ${roomId}`,
              locationId: msg.locationId || "abandoned_mansion",
              hostName: msg.username || "Investigator",
              maxPlayers: 6,
              isPrivate: false,
              players: /* @__PURE__ */ new Map(),
              discoveredClues: /* @__PURE__ */ new Set(),
              puzzleSolved: false,
              chat: []
            };
            rooms.set(roomId, room);
          }
          if (room.players.size >= room.maxPlayers) {
            ws.send(JSON.stringify({ type: "error", message: "Room is full." }));
            return;
          }
          authedUserId = verifyToken(msg.token);
          if (authedUserId) {
            setOnlinePresence(authedUserId, room.locationId, room.id);
          }
          const state = {
            id: playerId,
            username: (msg.username || msg.character?.name || "Investigator").slice(0, 24),
            character: msg.character || DEFAULT_FEMALE_CHARACTER,
            x: msg.x ?? 0,
            y: msg.y ?? 0,
            z: msg.z ?? 12,
            yaw: msg.yaw ?? 0,
            moving: false,
            voiceActive: false,
            voiceMuted: false
          };
          activeRoom = room;
          room.players.set(playerId, { ws, userId: authedUserId, state });
          ws.send(
            JSON.stringify({
              type: "room_state",
              selfId: playerId,
              roomId: room.id,
              locationId: room.locationId,
              players: Array.from(room.players.values()).map((p) => p.state),
              discoveredClues: Array.from(room.discoveredClues),
              puzzleSolved: room.puzzleSolved,
              chat: room.chat.slice(-25)
            })
          );
          broadcastToRoom(
            room,
            { type: "player_joined", player: state },
            playerId
          );
          return;
        }
        if (!activeRoom) return;
        if (msg.type === "move") {
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
              type: "player_moved",
              playerId,
              x: entry.state.x,
              y: entry.state.y,
              z: entry.state.z,
              yaw: entry.state.yaw,
              moving: entry.state.moving
            },
            playerId
          );
          return;
        }
        if (msg.type === "rtc_signal" && typeof msg.targetId === "string" && msg.signalType && msg.payload) {
          const target = activeRoom.players.get(msg.targetId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: "rtc_signal",
                fromId: playerId,
                signalType: msg.signalType,
                payload: msg.payload
              })
            );
          }
          return;
        }
        if (msg.type === "voice_status") {
          const entry = activeRoom.players.get(playerId);
          if (!entry) return;
          entry.state.voiceActive = Boolean(msg.voiceActive);
          entry.state.voiceMuted = Boolean(msg.voiceMuted);
          broadcastToRoom(
            activeRoom,
            {
              type: "voice_status",
              playerId,
              voiceActive: entry.state.voiceActive,
              voiceMuted: entry.state.voiceMuted
            },
            playerId
          );
          return;
        }
        if (msg.type === "clue_found" && typeof msg.clueId === "string") {
          if (!activeRoom.discoveredClues.has(msg.clueId)) {
            activeRoom.discoveredClues.add(msg.clueId);
            broadcastToRoom(activeRoom, {
              type: "clue_found",
              clueId: msg.clueId,
              finder: activeRoom.players.get(playerId)?.state.username || "Teammate"
            });
          }
          return;
        }
        if (msg.type === "puzzle_attempt" && Array.isArray(msg.attempt)) {
          if (verifyPuzzleSolution(activeRoom.locationId, msg.attempt)) {
            activeRoom.puzzleSolved = true;
            broadcastToRoom(activeRoom, {
              type: "puzzle_solved",
              solver: activeRoom.players.get(playerId)?.state.username || "Teammate"
            });
          }
          return;
        }
        if (msg.type === "chat" && typeof msg.text === "string" && msg.text.trim()) {
          const sender = activeRoom.players.get(playerId)?.state.username || "Investigator";
          const chatMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sender,
            text: msg.text.trim().slice(0, 180),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          activeRoom.chat.push(chatMsg);
          if (activeRoom.chat.length > 40) activeRoom.chat.shift();
          broadcastToRoom(activeRoom, { type: "chat_message", message: chatMsg });
        }
      } catch {
      }
    });
    ws.on("close", cleanupConnection);
    ws.on("error", cleanupConnection);
  });
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path2.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distDir, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`NO ESCAPE server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
