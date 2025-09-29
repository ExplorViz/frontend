import { useFrame, useThree } from '@react-three/fiber';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimationMixer } from 'three';

// Global ping utilities
let globalMixer: AnimationMixer | null = null;
let globalScene: THREE.Scene | null = null;
let globalTimeouts: ReturnType<typeof setTimeout>[] = [];

// Track active restartable ping
let restartableContainer: THREE.Group | null = null;
let restartableMesh: PingMesh | null = null;

// Track active non-restartable pings
const nonRestartableContainers = new Map<string, THREE.Group>();
const nonRestartableMeshes = new Map<string, PingMesh>();

const posKey = (v: THREE.Vector3) =>
  `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;

const disposeMesh = (mesh: PingMesh | null) => {
  if (!mesh) return;
  try {
    mesh.stopPinging?.();
    mesh.geometry?.dispose?.();
    (mesh.material as THREE.Material)?.dispose?.();
    mesh.parent?.remove(mesh);
  } catch {
    console.warn('Failed to dispose ping mesh');
  }
};

export function triggerRestartablePing(
  position: THREE.Vector3,
  color: THREE.ColorRepresentation = useHighlightingStore
    .getState()
    .highlightingColor(),
  durationMs: number = 3000,
  options: {
    pingedObject?: THREE.Object3D;
    replay?: boolean;
  } = {}
) {
  if (!globalMixer || !globalScene) {
    console.warn(
      'Ping system not initialized. Make sure AnimatedPing component is mounted.'
    );
    return;
  }

  const { replay = false, pingedObject = globalScene } = options;

  if (!(pingedObject instanceof THREE.Object3D)) {
    console.warn('Pinged object is not a valid Object3D');
    return;
  }

  // Clean up existing restartable ping
  disposeMesh(restartableMesh);
  if (restartableContainer) {
    globalScene.remove(restartableContainer);
  }

  const pingContainer = new THREE.Group();
  pingContainer.position.copy(position);

  const pingColorObj = new THREE.Color(color);
  const mesh = new PingMesh({
    animationMixer: globalMixer,
    color: pingColorObj,
  });
  mesh.layers.enable(SceneLayers.Ping);
  pingContainer.add(mesh);

  pingContainer.scale.setScalar(
    useUserSettingsStore.getState().visualizationSettings.landscapeScalar.value
  );
  globalScene.add(pingContainer);

  restartableContainer = pingContainer;
  restartableMesh = mesh;

  mesh.startPinging(replay);

  const timeout = setTimeout(() => {
    disposeMesh(mesh);
    if (restartableMesh === mesh) {
      restartableMesh = null;
    }
    if (restartableContainer === pingContainer) {
      restartableContainer = null;
    }
  }, durationMs);
  globalTimeouts.push(timeout);
}

export function triggerNonRestartablePing(
  position: THREE.Vector3,
  color: THREE.Color = useHighlightingStore.getState().highlightingColor(),
  durationMs: number = 3000,
  options: {
    pingedObject?: THREE.Object3D;
  } = {}
) {
  if (!globalMixer || !globalScene) {
    console.warn(
      'Ping system not initialized. Make sure AnimatedPing component is mounted.'
    );
    return;
  }

  const { pingedObject = globalScene } = options;

  if (!(pingedObject instanceof THREE.Object3D)) {
    console.warn('Pinged object is not a valid Object3D');
    return;
  }

  // Skip if one at same position is already active
  const key = posKey(position);
  if (nonRestartableMeshes.has(key)) {
    return;
  }

  const container = new THREE.Group();
  container.position.copy(position);

  const pingColorObj = new THREE.Color(color);
  const mesh = new PingMesh({
    animationMixer: globalMixer,
    color: pingColorObj,
  });
  mesh.layers.enable(SceneLayers.Ping);
  container.add(mesh);

  container.scale.setScalar(
    useUserSettingsStore.getState().visualizationSettings.landscapeScalar.value
  );
  globalScene.add(container);

  nonRestartableMeshes.set(key, mesh);
  nonRestartableContainers.set(key, container);
  mesh.startPinging();

  const timeout = setTimeout(() => {
    disposeMesh(mesh);
    nonRestartableMeshes.delete(key);
    if (nonRestartableContainers.has(key)) {
      globalScene?.remove(nonRestartableContainers.get(key)!);
    }
    nonRestartableContainers.delete(key);
  }, durationMs);
  globalTimeouts.push(timeout);
}

// Cleanup function
export function cleanupPings() {
  globalTimeouts.forEach(clearTimeout);
  globalTimeouts = [];
  disposeMesh(restartableMesh);
  restartableMesh = null;
  restartableContainer = null;
  for (const [, mesh] of nonRestartableMeshes) disposeMesh(mesh);
  nonRestartableMeshes.clear();
  nonRestartableContainers.clear();
}

export function AnimatedPing() {
  const mixerRef = useRef<AnimationMixer | null>(null);
  const { scene } = useThree();

  // Single restartable mesh
  const restartableRef = useRef<PingMesh | null>(null);

  // Non-restartable meshes keyed by position string
  const nonRestartableMapRef = useRef<Map<string, PingMesh>>(new Map());

  // Track timeouts so we can clean up on unmount
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Init mixer and set global references
  useEffect(() => {
    mixerRef.current = new AnimationMixer(
      undefined as unknown as THREE.Object3D
    );
    globalMixer = mixerRef.current;
    globalScene = scene;
    return () => {
      globalMixer = null;
      globalScene = null;
      mixerRef.current = null;
    };
  }, [scene]);

  // Advance animations each frame
  useFrame((_, dt) => {
    if (mixerRef.current) mixerRef.current.update(dt);
  });

  // Helpers
  const disposeMesh = useCallback((mesh: PingMesh | null) => {
    if (!mesh) return;
    try {
      mesh.stopPinging?.();
      mesh.geometry?.dispose?.();
      (mesh.material as THREE.Material)?.dispose?.();
      mesh.parent?.remove(mesh);
    } catch {
      // ignore
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      disposeMesh(restartableRef.current);
      restartableRef.current = null;
      for (const [, mesh] of nonRestartableMapRef.current) disposeMesh(mesh);
      nonRestartableMapRef.current.clear();
      // Also cleanup global state
      cleanupPings();
    };
  }, [disposeMesh]);

  return null;
}
