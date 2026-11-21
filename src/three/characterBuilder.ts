import * as THREE from 'three';
import type { CharacterAnimation, CharacterConfig, EyeGlow, OutfitStyle } from '../game/types';
import { createContactShadowTexture } from './proceduralTextures';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  cloakMesh?: THREE.Mesh;
}

const EYE_GLOW_HEX: Record<EyeGlow, number> = {
  lilac: 0xc4a1ff,
  silver: 0xe2e8f0,
  amber: 0xf6ad55,
  ice: 0x7dd3fc,
};

const OUTFIT_PALETTES: Record<
  OutfitStyle,
  { main: number; trim: number; pants: number; roughness: number; metalness: number }
> = {
  noir_trench: { main: 0x181524, trim: 0xb794f4, pants: 0x0e0c14, roughness: 0.72, metalness: 0.12 },
  academy_blazer: { main: 0x221b38, trim: 0xe9d8fd, pants: 0x161420, roughness: 0.6, metalness: 0.1 },
  forest_cloak: { main: 0x142026, trim: 0x9f7aea, pants: 0x0f1318, roughness: 0.85, metalness: 0.05 },
  lab_coat: { main: 0xd8d4e8, trim: 0x805ad5, pants: 0x1b1926, roughness: 0.52, metalness: 0.08 },
  obsidian_suit: { main: 0x111018, trim: 0xc4a1ff, pants: 0x09080d, roughness: 0.38, metalness: 0.45 },
};

export function buildCharacterRig(config: CharacterConfig): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isMale = config.gender === 'male';
  const shoulderW = isMale ? 0.56 : 0.46;
  const chestD = isMale ? 0.28 : 0.25;
  const hipW = isMale ? 0.4 : 0.44;
  const palette = OUTFIT_PALETTES[config.outfit];

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.skinTone),
    roughness: 0.62,
    metalness: 0.02,
  });
  const mainMat = new THREE.MeshStandardMaterial({
    color: palette.main,
    roughness: palette.roughness,
    metalness: palette.metalness,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.28,
    metalness: 0.65,
    emissive: new THREE.Color(palette.trim),
    emissiveIntensity: 0.18,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: palette.pants,
    roughness: 0.78,
    metalness: 0.08,
  });

  // Shoe material & geometry variation
  const shoeColor =
    config.shoes === 'oxford_shoes'
      ? 0x1a1520
      : config.shoes === 'plated_greaves'
        ? 0x4c3f6b
        : config.shoes === 'sleek_sneakers'
          ? 0x2d283e
          : 0x111015;
  const shoeMat = new THREE.MeshStandardMaterial({
    color: shoeColor,
    roughness: config.shoes === 'plated_greaves' ? 0.22 : 0.48,
    metalness: config.shoes === 'plated_greaves' ? 0.85 : 0.2,
  });

  // Contact shadow grounding disc
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(0.65, 24), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  root.add(shadowPlane);

  // Legs (pivoted at hip y = 0.92)
  const makeLeg = (xOffset: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOffset, 0.92, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 12), pantsMat);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    leg.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.38, 12), pantsMat);
    shin.position.y = -0.58;
    shin.castShadow = true;
    leg.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.28), shoeMat);
    boot.position.set(0, -0.84, 0.04);
    boot.castShadow = true;
    leg.add(boot);

    if (config.shoes === 'plated_greaves') {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), trimMat);
      plate.position.set(0, -0.62, 0.02);
      leg.add(plate);
    } else if (config.shoes === 'sleek_sneakers') {
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.29), trimMat);
      sole.position.set(0, -0.89, 0.04);
      leg.add(sole);
    }
    return leg;
  };

  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  bodyGroup.add(leftLeg, rightLeg);

  // Pelvis & Torso
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(hipW, 0.2, chestD * 0.9), pantsMat);
  pelvis.position.y = 0.96;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(shoulderW * 0.52, hipW * 0.44, 0.6, 14),
    mainMat,
  );
  torso.scale.set(1, 1, chestD / (shoulderW * 0.65));
  torso.position.y = 1.32;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Belt & Lilac Buckle (Secondary Silhouette Read)
  const belt = new THREE.Mesh(new THREE.BoxGeometry(hipW + 0.04, 0.07, chestD + 0.02), pantsMat);
  belt.position.y = 1.03;
  bodyGroup.add(belt);
  const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), trimMat);
  buckle.position.set(0, 1.03, chestD * 0.5 + 0.02);
  bodyGroup.add(buckle);

  // Outfit-specific coat tails / cloak / lapel accents
  let cloakMesh: THREE.Mesh | undefined;
  if (config.outfit === 'noir_trench' || config.outfit === 'lab_coat') {
    const coatTail = new THREE.Mesh(
      new THREE.CylinderGeometry(hipW * 0.5, hipW * 0.68, 0.55, 14, 1, true, Math.PI * 0.25, Math.PI * 1.5),
      mainMat,
    );
    coatTail.position.y = 0.78;
    coatTail.rotation.y = Math.PI;
    coatTail.material = mainMat.clone();
    coatTail.material.side = THREE.DoubleSide;
    bodyGroup.add(coatTail);
  }
  if (config.outfit === 'forest_cloak') {
    const capeGeo = new THREE.ConeGeometry(0.45, 1.05, 12, 1, true, 0, Math.PI * 1.15);
    const capeMat = mainMat.clone();
    capeMat.side = THREE.DoubleSide;
    cloakMesh = new THREE.Mesh(capeGeo, capeMat);
    cloakMesh.position.set(0, 1.1, -0.1);
    cloakMesh.rotation.y = Math.PI * 0.42;
    cloakMesh.rotation.x = 0.14;
    bodyGroup.add(cloakMesh);
  }

  // Collar / Lapel trim
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 8, 18), trimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.61;
  bodyGroup.add(collar);

  // Arms
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * (shoulderW * 0.5 + 0.08), 1.55, 0);

    const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), mainMat);
    arm.add(shoulderPad);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.3, 10), mainMat);
    upper.position.y = -0.17;
    upper.castShadow = true;
    arm.add(upper);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 10), mainMat);
    forearm.position.y = -0.42;
    forearm.castShadow = true;
    arm.add(forearm);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.04, 10), trimMat);
    cuff.position.y = -0.53;
    arm.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), skinMat);
    hand.position.y = -0.6;
    arm.add(hand);

    return arm;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyGroup.add(leftArm, rightArm);

  // Neck & Head Group
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 10), skinMat);
  neck.position.y = 1.68;
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.84;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 16), skinMat);
  head.scale.set(0.92, 1.08, 0.96);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes & Facial Features
  const eyeColor = EYE_GLOW_HEX[config.eyeGlow];
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 1.15,
    roughness: 0.15,
  });

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
  leftEye.position.set(-0.065, 0.02, 0.165);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
  rightEye.position.set(0.065, 0.02, 0.165);
  headGroup.add(leftEye, rightEye);

  // Brows tuned to facialFeature
  const browMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.hairColor),
    roughness: 0.7,
  });
  const browTilt =
    config.facialFeature === 'determined'
      ? 0.25
      : config.facialFeature === 'sharp'
        ? 0.14
        : config.facialFeature === 'mystic'
          ? -0.12
          : 0.02;

  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.014, 0.02), browMat);
  leftBrow.position.set(-0.068, 0.065, 0.172);
  leftBrow.rotation.z = -browTilt;
  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.014, 0.02), browMat);
  rightBrow.position.set(0.068, 0.065, 0.172);
  rightBrow.rotation.z = browTilt;
  headGroup.add(leftBrow, rightBrow);

  // Hairstyles
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.hairColor),
    roughness: 0.55,
    metalness: 0.12,
  });

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
  );
  hairCap.scale.set(0.95, 1.05, 0.99);
  hairCap.position.y = 0.025;
  headGroup.add(hairCap);

  if (config.hairStyle === 'swept') {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.24), hairMat);
    crest.position.set(0.02, 0.16, 0.03);
    crest.rotation.z = -0.22;
    headGroup.add(crest);
  } else if (config.hairStyle === 'long') {
    const backFall = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.44, 12, 1, false, Math.PI * 0.65, Math.PI * 0.7), hairMat);
    backFall.position.set(0, -0.16, -0.04);
    headGroup.add(backFall);
  } else if (config.hairStyle === 'bob') {
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.18), hairMat);
    sideL.position.set(-0.17, -0.05, 0);
    const sideR = sideL.clone();
    sideR.position.x = 0.17;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), hairMat);
    back.position.set(0, -0.05, -0.16);
    headGroup.add(sideL, sideR, back);
  } else if (config.hairStyle === 'mohawk') {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.34), hairMat);
    ridge.position.set(0, 0.18, -0.02);
    headGroup.add(ridge);
  }

  // Accessories
  if (config.accessory === 'lilac_scarf') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.055, 10, 20), trimMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.63;
    bodyGroup.add(scarf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.04), trimMat);
    tail.position.set(0.11, 1.44, 0.16);
    tail.rotation.z = -0.15;
    bodyGroup.add(tail);
  } else if (config.accessory === 'phantom_mask') {
    const maskMat = new THREE.MeshStandardMaterial({
      color: 0xf4f0ff,
      roughness: 0.22,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });
    const mask = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.185, 0.085, 18, 1, true, -Math.PI * 0.34, Math.PI * 0.68),
      maskMat,
    );
    mask.position.set(0, 0.015, 0.038);
    headGroup.add(mask);
  } else if (config.accessory === 'silver_monocle') {
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 8, 16), ringMat);
    monocle.position.set(0.068, 0.02, 0.185);
    headGroup.add(monocle);
  } else if (config.accessory === 'detective_fedora') {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x171422, roughness: 0.75 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.33, 0.025, 20), hatMat);
    brim.position.y = 0.15;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.16, 16), hatMat);
    crown.position.y = 0.23;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.192, 0.194, 0.035, 16), trimMat);
    band.position.y = 0.17;
    headGroup.add(brim, crown, band);
  }

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cloakMesh,
  };
}

export function animateCharacterRig(
  rig: CharacterRig,
  time: number,
  animation: CharacterAnimation,
  isMoving: boolean,
) {
  if (isMoving) {
    const stride = Math.sin(time * 9.5);
    rig.leftLeg.rotation.x = stride * 0.55;
    rig.rightLeg.rotation.x = -stride * 0.55;
    rig.leftArm.rotation.x = -stride * 0.45;
    rig.rightArm.rotation.x = stride * 0.45;
    rig.leftArm.rotation.z = 0.08;
    rig.rightArm.rotation.z = -0.08;
    rig.bodyGroup.position.y = Math.abs(Math.cos(time * 9.5)) * 0.04;
    rig.headGroup.rotation.y = Math.sin(time * 2) * 0.04;
    return;
  }

  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 0.15);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 0.15);
  rig.bodyGroup.position.y = Math.sin(time * 2.1) * 0.015;

  if (animation === 'ready') {
    rig.leftArm.rotation.x = -0.45;
    rig.rightArm.rotation.x = -0.65;
    rig.leftArm.rotation.z = 0.22;
    rig.rightArm.rotation.z = -0.22;
    rig.headGroup.rotation.y = Math.sin(time * 1.4) * 0.12;
  } else if (animation === 'inspect') {
    rig.rightArm.rotation.x = -1.25 + Math.sin(time * 2.5) * 0.08;
    rig.rightArm.rotation.z = -0.2;
    rig.leftArm.rotation.x = -0.2;
    rig.leftArm.rotation.z = 0.1;
    rig.headGroup.rotation.y = -0.25 + Math.sin(time * 1.6) * 0.1;
  } else if (animation === 'salute') {
    rig.rightArm.rotation.x = -2.2;
    rig.rightArm.rotation.z = 0.35;
    rig.leftArm.rotation.x = 0.05;
    rig.leftArm.rotation.z = 0.1;
    rig.headGroup.rotation.y = 0;
  } else {
    rig.leftArm.rotation.x = Math.sin(time * 1.6) * 0.04;
    rig.rightArm.rotation.x = -Math.sin(time * 1.6) * 0.04;
    rig.leftArm.rotation.z = 0.08;
    rig.rightArm.rotation.z = -0.08;
    rig.headGroup.rotation.y = Math.sin(time * 0.9) * 0.08;
  }

  if (rig.cloakMesh) {
    rig.cloakMesh.rotation.x = 0.14 + Math.sin(time * 2.2) * 0.03;
  }
}
