import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  CharacterConfig,
  LocationDef,
  MultiplayerPlayerState,
  SettingsConfig,
} from '../game/types';
import { clampPlayerToArena, resolveActiveCharacter } from '../game/rules';
import { animateCharacterRig, buildCharacterRig, type CharacterRig } from './characterBuilder';
import { buildLocationEnvironment, type InteractableNode } from './locationBuilders';
import { soundEngine } from '../audio/soundEngine';

export interface VirtualJoystickInput {
  moveX: number; // -1..1
  moveY: number; // -1..1
}

interface WorldExploreCanvasProps {
  location: LocationDef;
  character: CharacterConfig;
  settings: SettingsConfig;
  isPlaying: boolean;
  isTitleMode?: boolean;
  puzzleSolved: boolean;
  discoveredClues: string[];
  remotePlayers: MultiplayerPlayerState[];
  joystickRef: React.MutableRefObject<VirtualJoystickInput>;
  playerPoseRef?: React.MutableRefObject<{ x: number; y: number; z: number; yaw: number }>;
  flashlightOn: boolean;
  onNearInteractable: (node: { id: string; kind: string; label: string } | null) => void;
  onInteract: (node: { id: string; kind: string; label: string; clueId?: string; isSecret?: boolean }) => void;
  onPlayerMove?: (x: number, y: number, z: number, yaw: number, moving: boolean) => void;
}

function detectSoftwareGl(): boolean {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _playerPos = new THREE.Vector3();

export function WorldExploreCanvas({
  location,
  character,
  settings,
  isPlaying,
  isTitleMode = false,
  puzzleSolved,
  discoveredClues,
  remotePlayers,
  joystickRef,
  playerPoseRef,
  flashlightOn,
  onNearInteractable,
  onInteract,
  onPlayerMove,
}: WorldExploreCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Refs to keep Three.js mounted once without tearing down on HUD/React updates
  const propsRef = useRef({
    location,
    character: resolveActiveCharacter(character),
    settings,
    isPlaying,
    isTitleMode,
    puzzleSolved,
    discoveredClues,
    remotePlayers,
    playerPoseRef,
    flashlightOn,
    onNearInteractable,
    onInteract,
    onPlayerMove,
  });

  useEffect(() => {
    propsRef.current = {
      location,
      character: resolveActiveCharacter(character),
      settings,
      isPlaying,
      isTitleMode,
      puzzleSolved,
      discoveredClues,
      remotePlayers,
      playerPoseRef,
      flashlightOn,
      onNearInteractable,
      onInteract,
      onPlayerMove,
    };
  }, [
    location,
    character,
    settings,
    isPlaying,
    isTitleMode,
    puzzleSolved,
    discoveredClues,
    remotePlayers,
    playerPoseRef,
    flashlightOn,
    onNearInteractable,
    onInteract,
    onPlayerMove,
  ]);

  // Trigger scene rebuild when locationId or character changes
  const locationKey = `${location.id}:${JSON.stringify(resolveActiveCharacter(character))}:${settings.graphicsQuality}`;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && propsRef.current.settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const pixelRatio = isSoftwareGl
      ? 1
      : propsRef.current.settings.graphicsQuality === 'low'
        ? 1
        : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl && propsRef.current.settings.graphicsQuality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const loc = propsRef.current.location;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(loc.skyColor);
    scene.fog = new THREE.FogExp2(loc.fogColor, 0.036);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 140);

    // Warm/Cool 3-point atmospheric rig
    const hemi = new THREE.HemisphereLight(new THREE.Color(loc.accentHex), new THREE.Color('#090710'), 0.72);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe8d6, 1.45);
    keyLight.position.set(12, 22, 10);
    keyLight.castShadow = renderer.shadowMap.enabled;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -22;
    keyLight.shadow.camera.right = 22;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(new THREE.Color(loc.accentHex), 0.95);
    rimLight.position.set(-14, 10, -16);
    scene.add(rimLight);

    // Interior warm/lilac accent point lights for atmospheric depth (capped <= 3)
    const centerGlow = new THREE.PointLight(new THREE.Color(loc.accentHex), 18, 28, 1.6);
    centerGlow.position.set(0, 5.2, 0);
    scene.add(centerGlow);

    const exitLight = new THREE.PointLight(0xe9d8fd, 14, 20, 1.6);
    exitLight.position.set(loc.exitPoint[0], 3.5, loc.exitPoint[2] + 3);
    scene.add(exitLight);

    const env = buildLocationEnvironment(
      loc,
      renderer.capabilities.getMaxAnisotropy(),
      propsRef.current.settings.graphicsQuality,
    );
    scene.add(env.group);

    // Local Player Rig (facing -Z toward the realm interior)
    const playerRig = buildCharacterRig(propsRef.current.character);
    playerRig.root.position.set(loc.spawnPoint[0], loc.spawnPoint[1], loc.spawnPoint[2]);
    let playerYaw = loc.spawnYaw;
    playerRig.root.rotation.y = playerYaw + Math.PI;
    scene.add(playerRig.root);

    // Initialize camera immediately behind player facing -Z (prevents frame-1 lerp through player)
    camera.position.set(
      loc.spawnPoint[0],
      loc.spawnPoint[1] + 3.4,
      loc.spawnPoint[2] + 5.8,
    );
    camera.lookAt(loc.spawnPoint[0], loc.spawnPoint[1] + 1.35, loc.spawnPoint[2] - 4);

    // Player Flashlight
    const flashlight = new THREE.SpotLight(0xf3e8ff, 3.8, 22, Math.PI / 5.5, 0.5, 1.4);
    flashlight.position.set(0, 1.5, 0.2);
    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0, 1.1, -6);
    playerRig.root.add(flashlight, flashTarget);
    flashlight.target = flashTarget;

    // Remote Multiplayer Rigs Pool
    const remoteRigs = new Map<
      string,
      {
        rig: CharacterRig;
        voiceRing: THREE.Mesh;
        targetPos: THREE.Vector3;
        targetYaw: number;
        moving: boolean;
      }
    >();

    // Input State
    const keys = new Set<string>();
    let cameraOrbitYaw = 0;
    let cameraPitch = 0.32;
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastNearestId: string | null = null;
    let lastNetEmit = 0;
    let footstepTimer = 0;

    const triggerNearestInteract = () => {
      if (!propsRef.current.isPlaying) return;
      const px = playerRig.root.position.x;
      const pz = playerRig.root.position.z;
      let best: InteractableNode | null = null;
      let bestDist = 3.2;
      for (const node of env.interactables) {
        const dx = node.position.x - px;
        const dz = node.position.z - pz;
        const d = Math.hypot(dx, dz);
        if (d < bestDist) {
          bestDist = d;
          best = node;
        }
      }
      if (best) {
        propsRef.current.onInteract({
          id: best.id,
          kind: best.kind,
          label: best.label,
          clueId: best.clueId,
          isSecret: best.isSecret,
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keys.add(e.code);
      if ((e.code === 'KeyE' || e.code === 'Space') && propsRef.current.isPlaying) {
        triggerNearestInteract();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    const clearKeys = () => {
      keys.clear();
      isDragging = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!propsRef.current.isPlaying) return;
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !propsRef.current.isPlaying) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const sens = 0.0055 * propsRef.current.settings.cameraSensitivity;
      cameraOrbitYaw -= dx * sens;
      const ySign = propsRef.current.settings.invertY ? -1 : 1;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * sens * ySign, 0.08, 0.95);
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();
      const current = propsRef.current;

      // Update flashlight
      flashlight.visible = current.isPlaying && current.flashlightOn;

      // Animate props & NPC
      for (const prop of env.animatedProps) {
        prop.rotation.y += dt * 0.9;
      }
      animateCharacterRig(env.npcRig, elapsed, 'idle', false);

      // Update Exit Gate glow based on puzzle state
      const exitMat = env.exitDoorMesh.material as THREE.MeshStandardMaterial;
      const ringMat = env.exitGlowRing.material as THREE.MeshStandardMaterial;
      if (current.puzzleSolved) {
        exitMat.emissive.setHex(0x9f7aea);
        exitMat.emissiveIntensity = 1.1 + Math.sin(elapsed * 3) * 0.25;
        ringMat.emissiveIntensity = 1.6;
        env.exitGlowRing.rotation.z += dt * 1.2;
      } else {
        exitMat.emissive.setHex(0x2d1a4a);
        exitMat.emissiveIntensity = 0.25;
        ringMat.emissiveIntensity = 0.45;
      }

      // Update floating lilac dust
      env.floatingParticles.rotation.y = elapsed * 0.04;

      let moving = false;

      if (current.isTitleMode && !current.isPlaying) {
        // Live World Camera Tour / Hero Showcase framing on Title Screen
        animateCharacterRig(playerRig, elapsed, current.character.animation, false);
        const orbitAngle = Math.sin(elapsed * 0.22) * 0.55;
        _desiredCamPos.set(
          Math.sin(orbitAngle) * 7.5,
          3.4 + Math.sin(elapsed * 0.35) * 0.4,
          loc.spawnPoint[2] + 5.8,
        );
        camera.position.lerp(_desiredCamPos, 1 - Math.exp(-3 * dt));
        _camTarget.set(0, 1.5, loc.spawnPoint[2] - 5);
        camera.lookAt(_camTarget);
      } else {
        // Gameplay Movement
        let moveForward = 0;
        let moveRight = 0;
        if (keys.has('KeyW') || keys.has('ArrowUp')) moveForward += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) moveForward -= 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) moveRight -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) moveRight += 1;

        const joy = joystickRef.current;
        if (Math.abs(joy.moveX) > 0.08 || Math.abs(joy.moveY) > 0.08) {
          moveRight += joy.moveX;
          moveForward -= joy.moveY;
        }

        const mag = Math.hypot(moveForward, moveRight);
        if (current.isPlaying && mag > 0.05) {
          moving = true;
          const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.48 : 1.0;
          const speed = 5.4 * sprint;
          const normF = moveForward / Math.max(1, mag);
          const normR = moveRight / Math.max(1, mag);

          // Move relative to camera orbit yaw (camera looks toward -Z when yaw=0)
          const sinY = Math.sin(cameraOrbitYaw);
          const cosY = Math.cos(cameraOrbitYaw);
          const worldDx = (-sinY * normF + cosY * normR) * speed * dt;
          const worldDz = (-cosY * normF - sinY * normR) * speed * dt;

          const clamped = clampPlayerToArena(
            playerRig.root.position.x + worldDx,
            playerRig.root.position.z + worldDz,
            17.2,
            env.obstacles,
          );
          playerRig.root.position.x = clamped.x;
          playerRig.root.position.z = clamped.z;

          const targetYaw = Math.atan2(-worldDx, -worldDz);
          // Shortest angular delta
          let diff = targetYaw - playerYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerYaw += diff * Math.min(1, dt * 12);
          playerRig.root.rotation.y = playerYaw + Math.PI; // rig faces +Z locally

          footstepTimer += dt * sprint;
          if (footstepTimer > 0.42) {
            footstepTimer = 0;
            soundEngine.playFootstep();
          }
        } else {
          playerRig.root.rotation.y = playerYaw + Math.PI;
        }

        animateCharacterRig(playerRig, elapsed, current.character.animation, moving);

        // Smooth Third-Person Chase Camera
        const camDist = 6.2;
        const camX = playerRig.root.position.x + Math.sin(cameraOrbitYaw) * Math.cos(cameraPitch) * camDist;
        const camY = playerRig.root.position.y + 1.55 + Math.sin(cameraPitch) * camDist;
        const camZ = playerRig.root.position.z + Math.cos(cameraOrbitYaw) * Math.cos(cameraPitch) * camDist;
        _desiredCamPos.set(
          THREE.MathUtils.clamp(camX, -17.4, 17.4),
          THREE.MathUtils.clamp(camY, 1.1, 10),
          THREE.MathUtils.clamp(camZ, -17.4, 17.4),
        );
        camera.position.lerp(_desiredCamPos, 1 - Math.exp(-9 * dt));
        _camTarget.set(playerRig.root.position.x, playerRig.root.position.y + 1.35, playerRig.root.position.z);
        camera.lookAt(_camTarget);

        // Sync listener pose ref for WebRTC 3D spatial audio
        if (current.playerPoseRef) {
          current.playerPoseRef.current = {
            x: playerRig.root.position.x,
            y: playerRig.root.position.y,
            z: playerRig.root.position.z,
            yaw: playerYaw,
          };
        }

        // Proximity detection for interactables
        if (current.isPlaying) {
          let nearest: InteractableNode | null = null;
          let bestDist = 3.2;
          _playerPos.copy(playerRig.root.position);
          for (const node of env.interactables) {
            const d = Math.hypot(node.position.x - _playerPos.x, node.position.z - _playerPos.z);
            if (d < bestDist) {
              bestDist = d;
              nearest = node;
            }
          }
          const nextId = nearest ? nearest.id : null;
          if (nextId !== lastNearestId) {
            lastNearestId = nextId;
            current.onNearInteractable(
              nearest ? { id: nearest.id, kind: nearest.kind, label: nearest.label } : null,
            );
          }

          // Emit multiplayer position throttled (~12 Hz)
          if (current.onPlayerMove && elapsed - lastNetEmit > 0.085) {
            lastNetEmit = elapsed;
            current.onPlayerMove(
              playerRig.root.position.x,
              playerRig.root.position.y,
              playerRig.root.position.z,
              playerYaw,
              moving,
            );
          }
        }
      }

      // Sync remote multiplayer avatars
      const activeIds = new Set(current.remotePlayers.map((p) => p.id));
      for (const [rid, entry] of remoteRigs.entries()) {
        if (!activeIds.has(rid)) {
          scene.remove(entry.rig.root);
          entry.voiceRing.geometry.dispose();
          (entry.voiceRing.material as THREE.Material).dispose();
          remoteRigs.delete(rid);
        }
      }
      for (const rp of current.remotePlayers) {
        let entry = remoteRigs.get(rp.id);
        if (!entry) {
          const rig = buildCharacterRig(rp.character);
          const voiceRing = new THREE.Mesh(
            new THREE.RingGeometry(0.46, 0.58, 28),
            new THREE.MeshStandardMaterial({
              color: 0xc4a1ff,
              emissive: 0xc4a1ff,
              emissiveIntensity: 1.5,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.85,
            }),
          );
          voiceRing.rotation.x = -Math.PI / 2;
          voiceRing.position.y = 0.04;
          voiceRing.visible = Boolean(rp.voiceActive && !rp.voiceMuted);
          rig.root.add(voiceRing);
          rig.root.position.set(rp.x, rp.y, rp.z);
          scene.add(rig.root);
          entry = {
            rig,
            voiceRing,
            targetPos: new THREE.Vector3(rp.x, rp.y, rp.z),
            targetYaw: rp.yaw,
            moving: rp.moving,
          };
          remoteRigs.set(rp.id, entry);
        } else {
          entry.targetPos.set(rp.x, rp.y, rp.z);
          entry.targetYaw = rp.yaw;
          entry.moving = rp.moving;
        }
        const voiceOn = Boolean(rp.voiceActive && !rp.voiceMuted);
        entry.voiceRing.visible = voiceOn;
        if (voiceOn) {
          const pulse = 1 + Math.sin(elapsed * 5.2) * 0.08;
          entry.voiceRing.scale.set(pulse, pulse, 1);
        }
        entry.rig.root.position.lerp(entry.targetPos, 1 - Math.exp(-10 * dt));
        entry.rig.root.rotation.y = entry.targetYaw + Math.PI;
        animateCharacterRig(entry.rig, elapsed, rp.character.animation, entry.moving);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          renderer.render(scene, camera);
        }
      }
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, [locationKey, joystickRef]);

  return (
    <div
      ref={mountRef}
      data-testid="world-explore-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
    />
  );
}
