import * as THREE from 'three';
import type { LocationDef } from '../game/types';
import { createBumpNoiseTexture, createMarbleFloorTexture } from './proceduralTextures';
import { buildCharacterRig, type CharacterRig } from './characterBuilder';
import { DEFAULT_FEMALE_CHARACTER } from '../game/rules';

export interface ObstacleBox {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export interface InteractableNode {
  id: string;
  kind: 'clue' | 'puzzle' | 'npc' | 'exit';
  label: string;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  clueId?: string;
  isSecret?: boolean;
}

export interface BuiltLocationScene {
  group: THREE.Group;
  obstacles: ObstacleBox[];
  interactables: InteractableNode[];
  npcRig: CharacterRig;
  exitDoorMesh: THREE.Mesh;
  exitGlowRing: THREE.Mesh;
  floatingParticles: THREE.Points;
  animatedProps: THREE.Object3D[];
}

function buildCompositeLanternPillar(accentHex: string, height = 4.2): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1628, roughness: 0.78, metalness: 0.15 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3b2f58, roughness: 0.3, metalness: 0.8 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.1), stoneMat);
  plinth.position.y = 0.225;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, height - 0.9, 10), stoneMat);
  shaft.position.y = 0.45 + (height - 0.9) / 2;
  shaft.castShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 16), trimMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height - 0.55;

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glowMat);
  crystal.position.y = height - 0.25;

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.95), stoneMat);
  cap.position.y = height;

  g.add(plinth, shaft, ring, crystal, cap);
  return g;
}

function buildCluePedestal(accentHex: string, isSecret: boolean): THREE.Group {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x181424, roughness: 0.55, metalness: 0.35 });
  const color = isSecret ? 0xf6ad55 : new THREE.Color(accentHex).getHex();
  const orbMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.4,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.72, 12), baseMat);
  base.position.y = 0.36;
  base.castShadow = true;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 20), orbMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.74;

  const artifact = new THREE.Mesh(
    isSecret ? new THREE.DodecahedronGeometry(0.2, 0) : new THREE.OctahedronGeometry(0.2, 0),
    orbMat,
  );
  artifact.position.y = 1.15;
  artifact.name = 'floatingArtifact';

  g.add(base, rim, artifact);
  return g;
}

function buildPuzzleConsole(accentHex: string): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1728, roughness: 0.35, metalness: 0.78 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.05, 0.9), metalMat);
  plinth.position.y = 0.525;
  plinth.castShadow = true;

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.78), metalMat);
  desk.position.set(0, 1.12, 0.06);
  desk.rotation.x = 0.28;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 10, 24), glowMat);
  ring.position.set(0, 1.55, -0.1);
  ring.name = 'puzzleRing';

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), glowMat);
  core.position.set(0, 1.55, -0.1);
  core.name = 'puzzleCore';

  g.add(plinth, desk, ring, core);
  return g;
}

export function buildLocationEnvironment(
  loc: LocationDef,
  maxAnisotropy: number,
  graphicsQuality: 'low' | 'medium' | 'high',
): BuiltLocationScene {
  const group = new THREE.Group();
  const obstacles: ObstacleBox[] = [];
  const interactables: InteractableNode[] = [];
  const animatedProps: THREE.Object3D[] = [];

  // Ground surface with procedural texture
  const floorTex = createMarbleFloorTexture(loc.groundColor, loc.accentHex, 10, maxAnisotropy);
  const bumpTex = createBumpNoiseTexture(10);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTex,
    bumpMap: bumpTex,
    bumpScale: 0.03,
    roughness: loc.id === 'dark_forest' ? 0.88 : 0.42,
    metalness: loc.id === 'hidden_laboratory' || loc.id === 'mysterious_city' ? 0.35 : 0.12,
  });

  const groundSize = loc.id === 'dark_forest' || loc.id === 'mysterious_city' ? 120 : 40;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Subtle inlaid lilac runway path from spawn toward puzzle & exit
  const runnerMat = new THREE.MeshStandardMaterial({
    color: 0x201836,
    roughness: 0.55,
    metalness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 28), runnerMat);
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.02, -1);
  runner.receiveShadow = true;
  group.add(runner);

  // Perimeter Architecture: Indoor walls for interior locations, natural trees/skyscrapers for outdoor!
  const isOutdoor = loc.id === 'dark_forest' || loc.id === 'mysterious_city';
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x13101d,
    roughness: 0.78,
    metalness: 0.15,
  });

  if (!isOutdoor) {
    // 4 architectural perimeter walls with stone wainscoting
    const wallSpecs: Array<[number, number, number, number, number]> = [
      [0, -18.5, 38, 6.5, 1],
      [0, 18.5, 38, 6.5, 1],
      [-18.5, 0, 1, 6.5, 38],
      [18.5, 0, 1, 6.5, 38],
    ];
    for (const [wx, wz, ww, wh, wd] of wallSpecs) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), wallMat);
      w.position.set(wx, wh / 2, wz);
      w.receiveShadow = true;
      group.add(w);
    }

    // 6 symmetric architectural columns
    const pillarPositions: Array<[number, number]> = [
      [-9, 8],
      [9, 8],
      [-9, 0],
      [9, 0],
      [-9, -8],
      [9, -8],
    ];
    for (const [px, pz] of pillarPositions) {
      const p = buildCompositeLanternPillar(loc.accentHex, 4.4);
      p.position.set(px, 0, pz);
      group.add(p);
      obstacles.push({ x: px, z: pz, rx: 0.65, rz: 0.65 });
    }
  }

  // Location-Specific Hero Landmarks & Atmosphere Props
  const accentColor = new THREE.Color(loc.accentHex);
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.7,
  });

  if (loc.id === 'abandoned_mansion') {
    // Grand suspended chandelier centerpiece over the atrium
    const chandelier = new THREE.Group();
    chandelier.position.set(0, 4.6, 0);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.08, 10, 28), trimMat);
    hoop.rotation.x = Math.PI / 2;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), wallMat);
    chain.position.y = 1.1;
    chandelier.add(hoop, chain);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), trimMat);
      bulb.position.set(Math.cos(a) * 2.1, 0.14, Math.sin(a) * 2.1);
      chandelier.add(bulb);
    }
    group.add(chandelier);
    animatedProps.push(chandelier);
  } else if (loc.id === 'mysterious_school') {
    // Locker banks along the sides using InstancedMesh
    const lockerGeo = new THREE.BoxGeometry(1.1, 2.6, 0.8);
    const lockerMat = new THREE.MeshStandardMaterial({ color: 0x26213b, roughness: 0.45, metalness: 0.55 });
    const count = 12;
    const inst = new THREE.InstancedMesh(lockerGeo, lockerMat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const side = i < 6 ? -14.5 : 14.5;
      const idx = i % 6;
      dummy.position.set(side, 1.3, -10 + idx * 4);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.computeBoundingSphere();
    group.add(inst);
  } else if (loc.id === 'dark_forest') {
    // Instanced dark pine grove surrounding the clearing (natural perimeter!)
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 4.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1a1522, roughness: 0.9 });
    const crownGeo = new THREE.ConeGeometry(1.85, 5.2, 9);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x121923, roughness: 0.82 });
    const treeCount = 48;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
      const ring = i < 24 ? 19 : 27;
      const angle = (i / 24) * Math.PI * 2 + (i % 3) * 0.15;
      const radius = ring + (i % 5) * 2.2;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const scale = 0.85 + (i % 4) * 0.14;
      dummy.position.set(tx, 2.1 * scale, tz);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(tx, 5.2 * scale, tz);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    }
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    group.add(trunks, crowns);

    // 4 guiding lilac lanterns inside the clearing
    for (const [lx, lz] of [
      [-6, 9],
      [6, 9],
      [-8, -2],
      [8, -2],
    ] as Array<[number, number]>) {
      const p = buildCompositeLanternPillar(loc.accentHex, 2.6);
      p.position.set(lx, 0, lz);
      group.add(p);
      obstacles.push({ x: lx, z: lz, rx: 0.55, rz: 0.55 });
    }
  } else if (loc.id === 'underground_tunnels') {
    // Vaulted archway ribs + central rail tracks
    const archGeo = new THREE.TorusGeometry(11, 0.35, 8, 24, Math.PI);
    for (let z = -12; z <= 12; z += 6) {
      const arch = new THREE.Mesh(archGeo, wallMat);
      arch.position.set(0, 0, z);
      group.add(arch);
    }
    const railMat = new THREE.MeshStandardMaterial({ color: 0x5c5373, metalness: 0.85, roughness: 0.3 });
    for (const rx of [-0.7, 0.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 28), railMat);
      rail.position.set(rx, 0.04, 0);
      group.add(rail);
    }
  } else if (loc.id === 'abandoned_hospital') {
    // Frosted medical privacy screens & cryo beds
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x433b5c, metalness: 0.7, roughness: 0.3 });
    for (const [bx, bz] of [
      [-12, 4],
      [12, 4],
      [-12, -4],
      [12, -4],
    ] as Array<[number, number]>) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 1.1), frameMat);
      bed.position.set(bx, 0.325, bz);
      group.add(bed);
      obstacles.push({ x: bx, z: bz, rx: 1.15, rz: 0.6 });
    }
  } else if (loc.id === 'hidden_laboratory') {
    // Glowing lilac plasma containment cylinders flanking the room
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xc4a1ff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.1,
      metalness: 0.2,
      depthWrite: false,
    });
    for (const [cx, cz] of [
      [-12.5, 3],
      [12.5, 3],
      [-12.5, -5],
      [12.5, -5],
    ] as Array<[number, number]>) {
      const pod = new THREE.Group();
      pod.position.set(cx, 0, cz);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16), wallMat);
      cap.position.y = 0.15;
      const top = cap.clone();
      top.position.y = 3.2;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 2.8, 16), glassMat);
      tube.position.y = 1.7;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), trimMat);
      core.position.y = 1.7;
      pod.add(cap, top, tube, core);
      group.add(pod);
      animatedProps.push(core);
      obstacles.push({ x: cx, z: cz, rx: 0.95, rz: 0.95 });
    }
  } else if (loc.id === 'mysterious_city') {
    // Ring of obsidian skyscrapers towering into the twilight fog!
    const bldgGeo = new THREE.BoxGeometry(5, 1, 5);
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x0d0b16, roughness: 0.4, metalness: 0.6 });
    const count = 20;
    const towers = new THREE.InstancedMesh(bldgGeo, bldgMat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 25 + (i % 3) * 6;
      const h = 14 + (i % 5) * 6;
      dummy.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      towers.setMatrixAt(i, dummy.matrix);
    }
    towers.computeBoundingSphere();
    group.add(towers);

    for (const [lx, lz] of [
      [-6.5, 8],
      [6.5, 8],
      [-6.5, -2],
      [6.5, -2],
    ] as Array<[number, number]>) {
      const lamp = buildCompositeLanternPillar(loc.accentHex, 4.6);
      lamp.position.set(lx, 0, lz);
      group.add(lamp);
      obstacles.push({ x: lx, z: lz, rx: 0.65, rz: 0.65 });
    }
  }

  // Clues & Hidden Secrets
  for (const clue of loc.clues) {
    const ped = buildCluePedestal(loc.accentHex, Boolean(clue.isSecret));
    ped.position.set(clue.position[0], 0, clue.position[2]);
    group.add(ped);
    obstacles.push({ x: clue.position[0], z: clue.position[2], rx: 0.5, rz: 0.5 });

    const artifact = ped.getObjectByName('floatingArtifact');
    if (artifact) animatedProps.push(artifact);

    interactables.push({
      id: clue.id,
      kind: 'clue',
      label: clue.isSecret ? `Secret: ${clue.title}` : `Inspect: ${clue.title}`,
      position: new THREE.Vector3(clue.position[0], 1, clue.position[2]),
      mesh: ped,
      clueId: clue.id,
      isSecret: clue.isSecret,
    });
  }

  // Puzzle Console
  const puzzlePed = buildPuzzleConsole(loc.accentHex);
  puzzlePed.position.set(loc.puzzle.position[0], 0, loc.puzzle.position[2]);
  group.add(puzzlePed);
  obstacles.push({ x: loc.puzzle.position[0], z: loc.puzzle.position[2], rx: 0.8, rz: 0.55 });
  const ringObj = puzzlePed.getObjectByName('puzzleRing');
  const coreObj = puzzlePed.getObjectByName('puzzleCore');
  if (ringObj) animatedProps.push(ringObj);
  if (coreObj) animatedProps.push(coreObj);

  interactables.push({
    id: loc.puzzle.id,
    kind: 'puzzle',
    label: `Solve: ${loc.puzzle.title}`,
    position: new THREE.Vector3(loc.puzzle.position[0], 1.2, loc.puzzle.position[2]),
    mesh: puzzlePed,
  });

  // NPC Figure (using the same detailed composite rig!)
  const npcRig = buildCharacterRig({
    ...DEFAULT_FEMALE_CHARACTER,
    customizeEnabled: true,
    name: loc.npc.name,
    gender: loc.order % 2 === 1 ? 'male' : 'female',
    outfit: loc.id === 'hidden_laboratory' ? 'lab_coat' : loc.id === 'dark_forest' ? 'forest_cloak' : 'noir_trench',
    accessory: loc.id === 'abandoned_mansion' ? 'silver_monocle' : 'lilac_scarf',
  });
  npcRig.root.position.set(loc.npc.position[0], 0, loc.npc.position[2]);
  npcRig.root.rotation.y = loc.npc.rotationY;
  group.add(npcRig.root);
  obstacles.push({ x: loc.npc.position[0], z: loc.npc.position[2], rx: 0.45, rz: 0.45 });

  interactables.push({
    id: loc.npc.id,
    kind: 'npc',
    label: `Speak to ${loc.npc.name}`,
    position: new THREE.Vector3(loc.npc.position[0], 1.2, loc.npc.position[2]),
    mesh: npcRig.root,
  });

  // Exit Portal / Grand Vault Archway
  const exitGroup = new THREE.Group();
  exitGroup.position.set(loc.exitPoint[0], 0, loc.exitPoint[2]);

  const jambGeo = new THREE.BoxGeometry(0.75, 4.4, 0.9);
  const jambL = new THREE.Mesh(jambGeo, wallMat);
  jambL.position.set(-1.9, 2.2, 0);
  const jambR = new THREE.Mesh(jambGeo, wallMat);
  jambR.position.set(1.9, 2.2, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.8, 1.0), wallMat);
  lintel.position.set(0, 4.4, 0);

  const exitDoorMat = new THREE.MeshStandardMaterial({
    color: 0x1e1633,
    emissive: 0x3b1f6e,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.75,
  });
  const exitDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.9, 0.3), exitDoorMat);
  exitDoorMesh.position.set(0, 1.95, 0);

  const exitRingMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });
  const exitGlowRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 10, 32), exitRingMat);
  exitGlowRing.position.set(0, 2.1, 0.2);

  exitGroup.add(jambL, jambR, lintel, exitDoorMesh, exitGlowRing);
  group.add(exitGroup);

  interactables.push({
    id: 'exit_portal',
    kind: 'exit',
    label: 'Escape Through Vault Gate',
    position: new THREE.Vector3(loc.exitPoint[0], 1.5, loc.exitPoint[2] + 0.8),
    mesh: exitGroup,
  });

  // Floating Lilac Dust Motes (pooled points)
  const particleCount = graphicsQuality === 'low' ? 60 : graphicsQuality === 'medium' ? 120 : 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = 0.4 + Math.random() * 5.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 34;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    color: accentColor,
    size: 0.11,
    transparent: true,
    opacity: 0.65,
  });
  const floatingParticles = new THREE.Points(pGeo, pMat);
  group.add(floatingParticles);

  return {
    group,
    obstacles,
    interactables,
    npcRig,
    exitDoorMesh,
    exitGlowRing,
    floatingParticles,
    animatedProps,
  };
}
