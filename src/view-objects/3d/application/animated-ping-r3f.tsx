import { useFrame, useThree } from '@react-three/fiber';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimationMixer } from 'three';

// #region Types
interface PingOptions {
  pingedObject?: THREE.Object3D;
  replay?: boolean;
  removeOldPings?: boolean;
}

interface PingByModelIdOptions {
  color?: THREE.ColorRepresentation;
  durationMs?: number;
  replay?: boolean;
  removeOldPings?: boolean;
}

interface ActivePing {
  container: THREE.Group;
  mesh: PingMesh;
  timeout: ReturnType<typeof setTimeout>;
}

// #endregion Types

// #region Global State
let globalMixer: AnimationMixer | null = null;
let globalScene: THREE.Scene | null = null;
let activePings: ActivePing[] = [];
// #endregion Global State

// #region Helper Functions

/**
 * Safely disposes of a ping mesh and removes it from its parent
 */
function disposeMesh(mesh: PingMesh | null): void {
  if (!mesh) return;
  try {
    mesh.stopPinging?.();
    mesh.geometry?.dispose?.();
    (mesh.material as THREE.Material)?.dispose?.();
    mesh.parent?.remove(mesh);
  } catch (error) {
    console.warn('Failed to dispose ping mesh', error);
  }
}

/**
 * Removes a ping container from the scene
 */
function removePingContainer(
  container: THREE.Group | null,
  scene: THREE.Scene
): void {
  if (container && container.parent === scene) {
    scene.remove(container);
  }
}

/**
 * Cleans up a single active ping
 */
function cleanupActivePing(ping: ActivePing, scene: THREE.Scene): void {
  clearTimeout(ping.timeout);
  disposeMesh(ping.mesh);
  removePingContainer(ping.container, scene);
}

/**
 * Cleans up all active pings
 */
function cleanupAllActivePings(scene: THREE.Scene): void {
  activePings.forEach((ping) => cleanupActivePing(ping, scene));
  activePings = [];
}

/**
 * Removes a ping from the active pings array
 */
function removeFromActivePings(mesh: PingMesh): void {
  const index = activePings.findIndex((p) => p.mesh === mesh);
  if (index !== -1) {
    activePings.splice(index, 1);
  }
}

// #endregion Helper Functions

// #region Chat Logging

const MAX_DISPLAY_LENGTH = 30;

/**
 * Truncates a string to MAX_DISPLAY_LENGTH characters, appending ' ...' if it was cut.
 */
function truncate(str: string): string {
  return str.length > MAX_DISPLAY_LENGTH
    ? str.slice(0, MAX_DISPLAY_LENGTH) + ' ...'
    : str;
}

/**
 * Resolves a human-readable name for a model ID by searching through the application
 * repository for a matching application, package, or class.
 * Returns the raw ID if no match is found.
 */
function getEntityName(modelId: string): string {
  const appRepo = useApplicationRepositoryStore.getState();
  const appData = appRepo.getByModelId(modelId);
  if (!appData) return modelId;

  // Check if it's the application itself
  if (appData.getId() === modelId) {
    return appData.application.name;
  }

  // Check packages
  const matchingPackage = appData.getPackages().find((p) => p.id === modelId);
  if (matchingPackage) return matchingPackage.name;

  // Check classes
  const matchingClass = appData.getClasses().find((c) => c.id === modelId);
  if (matchingClass) return matchingClass.name;

  return modelId;
}

/**
 * Logs a ping event to the chat store so it can be replayed later.
 * @param modelId - The model ID that was pinged, or null for a position-only ping
 * @param position - The world position of the ping
 * @param durationMs - Duration of the ping in milliseconds
 */
function _logPingToChat(
  modelId: string | null,
  position: THREE.Vector3,
  durationMs: number
): void {
  const posData = { x: position.x, y: position.y, z: position.z };
  let pingMsg: string;
  if (modelId) {
    const entityName = truncate(getEntityName(modelId));
    pingMsg = `📍 Pinged: ${entityName}`;
  } else {
    const posStr = `(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
    pingMsg = `📍 Pinged position ${truncate(posStr)}`;
  }

  useChatStore
    .getState()
    .sendChatMessage(pingMsg, true, 'ping', [
      modelId ?? '',
      posData,
      durationMs,
    ]);
}

// #endregion Chat Logging

// #region Public API
/**
 * Triggers a ping animation at the position of a model by its ID
 */
export function pingByModelId(
  modelId: string,
  sendMessage: boolean = true,
  options: PingByModelIdOptions = {}
): void {
  const {
    color = useHighlightingStore.getState().highlightingColor(),
    durationMs = 3000,
    replay = false,
    removeOldPings = false,
  } = options;

  const modelWorldPosition = getWorldPositionOfModel(modelId);
  if (!modelWorldPosition) {
    console.warn(`Model position not found for ID: ${modelId}`);
    return;
  }

  // Log to chat when this is a local user action (sendMessage=true) and not a replay
  if (sendMessage && !replay) {
    _logPingToChat(modelId, modelWorldPosition, durationMs);
  }

  pingPosition(modelWorldPosition, color, false, durationMs, {
    replay,
    removeOldPings,
  });

  // Send network message
  if (sendMessage) {
    useMessageSenderStore.getState().sendPingUpdate({
      modelIds: [modelId],
    });
  }
}

/**
 * Replays a ping event from the chat log
 */
export function pingReplay(
  userId: string,
  modelId: string,
  pingPos: { x: number; y: number; z: number } | null,
  durationMs: number = 3000
): void {
  const isLocalUser = userId === useLocalUserStore.getState().userId;
  let color: THREE.ColorRepresentation;

  if (isLocalUser) {
    color = useHighlightingStore.getState().highlightingColor();
  } else {
    const remoteUser = useCollaborationSessionStore
      .getState()
      .lookupRemoteUserById(userId);
    color = remoteUser?.color ?? new THREE.Color(0xffffff);
  }

  if (modelId) {
    pingByModelId(modelId, false, {
      color,
      durationMs,
      replay: true,
      removeOldPings: false,
    });
  } else if (pingPos) {
    const position = new THREE.Vector3(pingPos.x, pingPos.y, pingPos.z);
    pingPosition(position, color, false, durationMs, { replay: true });
  }
}

/**
 * Triggers a ping animation at a specific 3D position
 */
export function pingPosition(
  position: THREE.Vector3,
  color: THREE.ColorRepresentation = useHighlightingStore
    .getState()
    .highlightingColor(),
  sendMessage = true,
  durationMs: number = 3000,
  options: PingOptions = {}
): void {
  if (!globalMixer || !globalScene) {
    console.warn(
      'Ping system not initialized. Make sure AnimatedPing component is mounted.'
    );
    return;
  }

  const scene = globalScene;
  const {
    replay = false,
    pingedObject = scene,
    removeOldPings = false,
  } = options;

  if (!(pingedObject instanceof THREE.Object3D)) {
    console.warn('Pinged object is not a valid Object3D');
    return;
  }

  // Send ping update message and log to chat (for position-only pings without a modelId)
  if (sendMessage && !replay) {
    _logPingToChat(null, position, durationMs);
    useMessageSenderStore.getState().sendPingUpdate({
      positions: [position],
    });
  }

  // Clean up existing pings if requested
  if (removeOldPings) {
    cleanupAllActivePings(scene);
  }

  // Create ping container and mesh
  const pingContainer = new THREE.Group();
  pingContainer.position.copy(position);

  const pingColorObj = new THREE.Color(color);
  const mesh = new PingMesh({
    animationMixer: globalMixer,
    color: pingColorObj,
  });
  mesh.layers.enable(useVisualizationStore.getState().sceneLayers.Ping);
  pingContainer.add(mesh);

  // Scale container according to landscape settings
  pingContainer.scale.setScalar(
    useUserSettingsStore.getState().visualizationSettings.landscapeScalar.value
  );
  scene.add(pingContainer);

  // Start ping animation
  mesh.startPinging(replay);

  // Set up timeout to clean up ping after duration
  const timeout = setTimeout(() => {
    cleanupActivePing(
      {
        container: pingContainer,
        mesh,
        timeout,
      },
      scene
    );
    removeFromActivePings(mesh);
  }, durationMs);

  // Push ping in active pings array to keep track of it
  activePings.push({
    container: pingContainer,
    mesh,
    timeout,
  });
}

/**
 * Cleans up all active pings and resets the ping system
 */
export function cleanupPings(): void {
  if (globalScene) {
    cleanupAllActivePings(globalScene);
  }
}

// #endregion Public API

// #region React Component

/**
 * Component that initializes and manages the ping animation system.
 * Must be mounted in the React Three Fiber scene for pings to work.
 */
export function AnimatedPing() {
  const mixerRef = useRef<AnimationMixer | null>(null);
  const { scene } = useThree();

  // Initialize mixer and set global references
  useEffect(() => {
    mixerRef.current = new AnimationMixer(
      undefined as unknown as THREE.Object3D
    );
    globalMixer = mixerRef.current;
    globalScene = scene;

    return () => {
      // Cleanup on unmount
      cleanupPings();
      globalMixer = null;
      globalScene = null;
      mixerRef.current = null;
    };
  }, [scene]);

  // Advance animation mixer each frame
  useFrame((_, dt) => {
    if (mixerRef.current) {
      mixerRef.current.update(dt);
    }
  });

  return null;
}

// #endregion React Component
