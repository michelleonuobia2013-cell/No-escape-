import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistance3D,
  calculateProximityGain,
  calculateStereoPan,
  formatProximityStatus,
} from './proximityMath';

test('calculateProximityGain returns 1.0 within refDistance and 0 beyond maxDistance', () => {
  const listener = { x: 0, y: 0, z: 0 };
  assert.equal(calculateProximityGain(listener, { x: 1, y: 0, z: 1 }), 1);
  assert.equal(calculateProximityGain(listener, { x: 3, y: 0, z: 0 }), 1);
  assert.equal(calculateProximityGain(listener, { x: 24, y: 0, z: 0 }), 0);
  assert.equal(calculateProximityGain(listener, { x: 30, y: 0, z: 10 }), 0);
});

test('calculateProximityGain decreases monotonically as distance increases', () => {
  const listener = { x: 0, y: 0, z: 0 };
  const gClose = calculateProximityGain(listener, { x: 5, y: 0, z: 0 });
  const gMid = calculateProximityGain(listener, { x: 12, y: 0, z: 0 });
  const gFar = calculateProximityGain(listener, { x: 20, y: 0, z: 0 });

  assert.ok(gClose > gMid && gMid > gFar);
  assert.ok(gClose < 1 && gFar > 0);
});

test('calculateStereoPan computes left/right pan relative to listener yaw', () => {
  const listener = { x: 0, y: 0, z: 0 };
  // Facing -Z (yaw = 0): +X is right (+1), -X is left (-1), -Z is center (0)
  assert.ok(Math.abs(calculateStereoPan(listener, 0, { x: 5, y: 0, z: 0 }) - 1) < 1e-6);
  assert.ok(Math.abs(calculateStereoPan(listener, 0, { x: -5, y: 0, z: 0 }) + 1) < 1e-6);
  assert.ok(Math.abs(calculateStereoPan(listener, 0, { x: 0, y: 0, z: -5 })) < 1e-6);

  // Turned 90 degrees left (yaw = Math.PI / 2, facing -X): -Z is now to the right (+1)
  assert.ok(Math.abs(calculateStereoPan(listener, Math.PI / 2, { x: 0, y: 0, z: -5 }) - 1) < 1e-6);
});

test('formatProximityStatus classifies distance tiers cleanly', () => {
  assert.equal(formatProximityStatus(2.5), 'Crystal Clear');
  assert.equal(formatProximityStatus(9.0), 'Nearby');
  assert.equal(formatProximityStatus(18.0), 'Faint Echo');
  assert.equal(formatProximityStatus(26.0), 'Out of Range');
  assert.equal(calculateDistance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5);
});
