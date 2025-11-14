import { useFrame, useThree } from '@react-three/fiber';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
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

export function pingByModelId(
  modelId: string,
  sendMessage: boolean = true,
  options: {
    color?: THREE.ColorRepresentation;
    durationMs?: number;
    replay?: boolean;
  } = {
    color: useHighlightingStore.getState().highlightingColor(),
    durationMs: 3000,
    replay: false,
  }
) {
  const { color, durationMs, replay } = options;
  const modelWorldPosition = getWorldPositionOfModel(modelId);
  if (!modelWorldPosition) {
    console.warn('Model position not found.');
    return;
  }
  pingPosition(modelWorldPosition, color, sendMessage, durationMs, {
    replay,
  });
}

export function pingPosition(
  position: THREE.Vector3,
  color: THREE.ColorRepresentation = useHighlightingStore
    .getState()
    .highlightingColor(),
  sendMessage = true,
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

  if (sendMessage) {
    useMessageSenderStore.getState().sendPingUpdate({
      positions: [position],
    });
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

// Cleanup function
export function cleanupPings() {
  globalTimeouts.forEach(clearTimeout);
  globalTimeouts = [];
  disposeMesh(restartableMesh);
  restartableMesh = null;
  restartableContainer = null;
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
