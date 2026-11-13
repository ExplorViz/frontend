import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { usePingStore } from 'explorviz-frontend/src/stores/ping-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  onPingReceived,
  ownPingColor,
  sharePing,
  type ReceivedPing,
} from 'explorviz-frontend/src/utils/collaboration/pings';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import { isAggregatedCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
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
let stopShowingReceivedPings: (() => void) | null = null;
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
function removePingContainer(container: THREE.Group | null, scene: THREE.Scene): void {
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

// #region Entity Names

/**
 * Resolves a human-readable name for a model ID
 * Returns the raw ID if no match is found.
 */
export function getEntityName(modelId: string): string {
  const entity = useModelStore.getState().getModel(modelId);
  if (!entity) return modelId;

  if (isAggregatedCommunication(entity)) {
    return `${entity.sourceEntity.name}<->${entity.targetEntity.name}`;
  }

  return entity.name;
}

// #endregion Entity Names

/** Your color for pings: your Participant color in a Room, else the highlighting color. */
function ownColor(): THREE.ColorRepresentation {
  return ownPingColor() ?? useHighlightingStore.getState().highlightingColor();
}

/** Shows another Participant's ping in their color, at the entity if this browser knows where it is. */
function showReceivedPing({ entityId, position, color }: ReceivedPing): void {
  if (entityId && getWorldPositionOfModel(entityId)) {
    pingByModelId(entityId, false, { color });
  } else {
    pingPosition(new THREE.Vector3(...position), color, false);
  }
}

// #region Public API
/**
 * Triggers a ping animation at the position of a model by its ID
 */
export function pingByModelId(modelId: string, sendMessage: boolean = true, options: PingByModelIdOptions = {}): void {
  const { color = ownColor(), durationMs = 3000, replay = false, removeOldPings = false } = options;

  // Always notify the ping store so the sidebar can react.
  // Store by resolved name so SVG nodes (identified by name) can match directly.
  usePingStore.getState().addPing(getEntityName(modelId), durationMs);

  const modelWorldPosition = getWorldPositionOfModel(modelId);
  if (!modelWorldPosition) {
    console.warn(`Model position not found for ID: ${modelId}`);
    return;
  }

  if (sendMessage && !replay) {
    sharePing({ entityId: modelId, position: modelWorldPosition.toArray() });
  }

  pingPosition(modelWorldPosition, color, false, durationMs, {
    replay,
    removeOldPings,
  });
}

/**
 * Shows a ping from the chat history again, in the color of whoever pinged,
 * without sending it.
 */
export function replayPing(entityId: string, position: number[], color: THREE.ColorRepresentation): void {
  if (entityId && getWorldPositionOfModel(entityId)) {
    pingByModelId(entityId, false, { color, replay: true });
  } else if (position.length === 3) {
    pingPosition(new THREE.Vector3().fromArray(position), color, false, 3000, { replay: true });
  }
}

/**
 * Triggers a ping animation at a specific 3D position
 */
export function pingPosition(
  position: THREE.Vector3,
  color: THREE.ColorRepresentation = ownColor(),
  sendMessage = true,
  durationMs: number = 3000,
  options: PingOptions = {}
): void {
  if (!globalMixer || !globalScene) {
    console.warn('Ping system not initialized. Make sure AnimatedPing component is mounted.');
    return;
  }

  const scene = globalScene;
  const { replay = false, pingedObject = scene, removeOldPings = false } = options;

  if (!(pingedObject instanceof THREE.Object3D)) {
    console.warn('Pinged object is not a valid Object3D');
    return;
  }

  if (sendMessage && !replay) {
    sharePing({ position: position.toArray() });
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
  pingContainer.scale.setScalar(useUserSettingsStore.getState().visualizationSettings.landscapeScalar.value);
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

/**
 * Registers the animation mixer and scene used by the ping system.
 * Called by the AnimatedPing component when it mounts.
 */
export function registerPingRuntime(mixer: AnimationMixer, scene: THREE.Scene): void {
  globalMixer = mixer;
  globalScene = scene;
  stopShowingReceivedPings?.();
  stopShowingReceivedPings = onPingReceived(showReceivedPing);
}

/**
 * Cleans up all pings and releases the registered mixer and scene.
 */
export function unregisterPingRuntime(): void {
  cleanupPings();
  stopShowingReceivedPings?.();
  stopShowingReceivedPings = null;
  globalMixer = null;
  globalScene = null;
}

// #endregion Public API
