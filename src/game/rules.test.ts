import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FEMALE_CHARACTER,
  DEFAULT_MALE_CHARACTER,
  DEFAULT_PROGRESS,
  clampPlayerToArena,
  evaluateProgressAfterEscape,
  registerClueDiscovery,
  resolveActiveCharacter,
  verifyPuzzleSolution,
} from './rules';
import { LOCATIONS } from './worldData';

test('worldData defines all 7 required locations', () => {
  assert.equal(LOCATIONS.length, 7);
  const ids = LOCATIONS.map((l) => l.id);
  assert.deepEqual(ids, [
    'abandoned_mansion',
    'mysterious_school',
    'dark_forest',
    'underground_tunnels',
    'abandoned_hospital',
    'hidden_laboratory',
    'mysterious_city',
  ]);
});

test('resolveActiveCharacter returns default characters when customizeEnabled is OFF', () => {
  const femaleResolved = resolveActiveCharacter({
    ...DEFAULT_FEMALE_CHARACTER,
    customizeEnabled: false,
    name: 'Custom Name Ignored',
    outfit: 'lab_coat',
  });
  assert.equal(femaleResolved.name, DEFAULT_FEMALE_CHARACTER.name);
  assert.equal(femaleResolved.outfit, DEFAULT_FEMALE_CHARACTER.outfit);

  const maleResolved = resolveActiveCharacter({
    ...DEFAULT_FEMALE_CHARACTER,
    customizeEnabled: false,
    gender: 'male',
    outfit: 'forest_cloak',
  });
  assert.equal(maleResolved.name, DEFAULT_MALE_CHARACTER.name);
  assert.equal(maleResolved.outfit, DEFAULT_MALE_CHARACTER.outfit);
});

test('resolveActiveCharacter preserves custom options when customizeEnabled is ON', () => {
  const custom = resolveActiveCharacter({
    ...DEFAULT_FEMALE_CHARACTER,
    customizeEnabled: true,
    name: '  Vespera  ',
    hairStyle: 'mohawk',
    outfit: 'forest_cloak',
    accessory: 'phantom_mask',
  });
  assert.equal(custom.name, 'Vespera');
  assert.equal(custom.hairStyle, 'mohawk');
  assert.equal(custom.outfit, 'forest_cloak');
  assert.equal(custom.accessory, 'phantom_mask');
});

test('verifyPuzzleSolution validates all 7 location puzzles accurately', () => {
  for (const loc of LOCATIONS) {
    const sol = loc.puzzle.solution as number[];
    assert.equal(verifyPuzzleSolution(loc.id, sol), true);
    const wrong = sol.map((n) => n + 1);
    assert.equal(verifyPuzzleSolution(loc.id, wrong), false);
  }
});

test('evaluateProgressAfterEscape unlocks next location and awards badge', () => {
  const updated = evaluateProgressAfterEscape(DEFAULT_PROGRESS, 'abandoned_mansion', 95.4);
  assert.equal(updated.completedLocations.includes('abandoned_mansion'), true);
  assert.equal(updated.unlockedLocations.includes('mysterious_school'), true);
  assert.equal(updated.unlockedAchievements.includes('badge_manor'), true);
  assert.equal(updated.bestChallengeTimes.abandoned_mansion, 95);
  assert.equal(updated.totalEscapes, 1);
  assert.equal(updated.storyChapter, 2);
});

test('registerClueDiscovery tracks clues, secrets, and collector badges', () => {
  let p = DEFAULT_PROGRESS;
  for (let i = 1; i <= 6; i++) {
    p = registerClueDiscovery(p, `clue_${i}`, i <= 3);
  }
  assert.equal(p.discoveredClues.length, 6);
  assert.equal(p.discoveredSecrets.length, 3);
  assert.equal(p.unlockedAchievements.includes('badge_collector'), true);
  assert.equal(p.unlockedAchievements.includes('badge_secrets'), true);
});

test('clampPlayerToArena keeps player inside bounds and outside solid obstacles', () => {
  const clampedBounds = clampPlayerToArena(30, -30, 17.5, []);
  assert.equal(clampedBounds.x, 17.5);
  assert.equal(clampedBounds.z, -17.5);

  const clampedObs = clampPlayerToArena(0.2, 0.2, 17.5, [{ x: 0, z: 0, rx: 1, rz: 1 }], 0.5);
  assert.ok(Math.abs(clampedObs.x) >= 1.49 || Math.abs(clampedObs.z) >= 1.49);
});
