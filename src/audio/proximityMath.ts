export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes smooth spatial gain [0..1] based on 3D Euclidean distance between
 * listener and speaker. Full clarity within refDistance (3m), smooth cosine-inverse
 * attenuation down to 0 at maxDistance (24m).
 */
export function calculateProximityGain(
  listener: Vec3Like,
  speaker: Vec3Like,
  refDistance = 3.0,
  maxDistance = 24.0,
): number {
  const dx = speaker.x - listener.x;
  const dy = speaker.y - listener.y;
  const dz = speaker.z - listener.z;
  const dist = Math.hypot(dx, dy, dz);

  if (dist <= refDistance) return 1;
  if (dist >= maxDistance) return 0;

  const t = (dist - refDistance) / (maxDistance - refDistance);
  // Smooth ease-out curve for natural falloff
  const smooth = 0.5 * (1 + Math.cos(Math.PI * t));
  return Math.max(0, Math.min(1, smooth));
}

/**
 * Computes stereo pan [-1..1] relative to the listener's yaw (where yaw = 0 faces -Z).
 */
export function calculateStereoPan(
  listener: Vec3Like,
  listenerYaw: number,
  speaker: Vec3Like,
): number {
  const dx = speaker.x - listener.x;
  const dz = speaker.z - listener.z;
  const planarDist = Math.hypot(dx, dz);
  if (planarDist < 0.15) return 0;

  // Listener right vector when facing (-sin(yaw), -cos(yaw)) is (cos(yaw), -sin(yaw))
  const rightX = Math.cos(listenerYaw);
  const rightZ = -Math.sin(listenerYaw);
  const dot = (dx * rightX + dz * rightZ) / planarDist;
  return Math.max(-1, Math.min(1, dot));
}

export function calculateDistance3D(a: Vec3Like, b: Vec3Like): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function formatProximityStatus(distance: number): string {
  if (distance <= 5) return 'Crystal Clear';
  if (distance <= 12) return 'Nearby';
  if (distance <= 24) return 'Faint Echo';
  return 'Out of Range';
}
