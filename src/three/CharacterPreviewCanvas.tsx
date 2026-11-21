import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { CharacterConfig } from '../game/types';
import { animateCharacterRig, buildCharacterRig, type CharacterRig } from './characterBuilder';
import { resolveActiveCharacter } from '../game/rules';

interface CharacterPreviewCanvasProps {
  character: CharacterConfig;
  className?: string;
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

export function CharacterPreviewCanvas({ character, className = '' }: CharacterPreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const charRef = useRef<CharacterConfig>(resolveActiveCharacter(character));
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const rebuildFlagRef = useRef<boolean>(false);

  useEffect(() => {
    charRef.current = resolveActiveCharacter(character);
    rebuildFlagRef.current = true;
  }, [character]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090712');
    scene.fog = new THREE.FogExp2('#090712', 0.045);
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0.3, 1.55, 4.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.15, 0);
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 6.0;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;

    // Studio 3-point lighting with warm/cool contrast & lilac rim
    const hemi = new THREE.HemisphereLight(0xc4a1ff, 0x161224, 0.65);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 1.8);
    keyLight.position.set(3.5, 5, 4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb794f4, 1.45);
    rimLight.position.set(-3, 3.5, -4);
    scene.add(rimLight);

    // Obsidian circular pedestal
    const pedGroup = new THREE.Group();
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x131020, roughness: 0.32, metalness: 0.72 });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xc4a1ff,
      emissive: 0x9f7aea,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.28, 0.16, 36), pedMat);
    disc.position.y = -0.08;
    disc.receiveShadow = true;
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.025, 8, 48), ringMat);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.01;
    pedGroup.add(disc, glowRing);
    scene.add(pedGroup);

    const rebuildCharacter = () => {
      if (rigRef.current) {
        scene.remove(rigRef.current.root);
      }
      const nextRig = buildCharacterRig(charRef.current);
      rigRef.current = nextRig;
      scene.add(nextRig.root);
      rebuildFlagRef.current = false;
    };

    rebuildCharacter();
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
      if (rebuildFlagRef.current) {
        rebuildCharacter();
      }
      const elapsed = clock.getElapsedTime();
      if (rigRef.current) {
        animateCharacterRig(rigRef.current, elapsed, charRef.current.animation, false);
      }
      controls.update();
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
        }
      }
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="character-preview-canvas"
      className={`w-full h-full relative select-none ${className}`}
    />
  );
}
