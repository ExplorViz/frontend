import { useCallback, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { create } from 'zustand';

export interface ClusterCentroid {
  id: number;
  position: THREE.Vector3;
}

export interface ClusterMapping {
  entityId: string;
  clusterId: number;
}

interface ClusterStoreState {
  entityIdToCluster: Map<string, number>;

  // Centroids for each cluster
  centroids: Map<number, ClusterCentroid>;

  // Reverse index: cluster id -> entity ids (kept in sync with entityIdToCluster)
  clusterToEntities: Map<number, string[]>;

  // Distance from camera to each centroid
  centroidDistances: Map<number, number>;

  // Actions
  setClusters: (
    entityToCluster: Map<string, number>,
    centroids: Map<number, ClusterCentroid>,
    cameraPosition?: THREE.Vector3
  ) => void;

  getClusterId: (entityId: string) => number | undefined;
  getCentroid: (clusterId: number) => ClusterCentroid | undefined;
  getCentroidForEntityId: (entityId: string) => ClusterCentroid | undefined;
  getAllClusters: () => Map<number, ClusterCentroid>;
  getEntitiesInCluster: (clusterId: number) => string[];
  clearClusters: () => void;
  calculateDistanceToCamera: (cameraPosition: THREE.Vector3) => void;
  getCentroidDistance: (entityId: string) => number | undefined;
  getAllCentroidDistances: () => Map<number, number>;
}

/** Builds a cluster-id -> entity-ids reverse index from the forward map. */
function buildReverseIndex(entityIdToCluster: Map<string, number>): Map<number, string[]> {
  const index = new Map<number, string[]>();
  entityIdToCluster.forEach((clusterId, entityId) => {
    let list = index.get(clusterId);
    if (!list) {
      list = [];
      index.set(clusterId, list);
    }
    list.push(entityId);
  });
  return index;
}

export const useClusterStore = create<ClusterStoreState>()((set, get) => ({
  entityIdToCluster: new Map<string, number>(),
  centroids: new Map<number, ClusterCentroid>(),
  clusterToEntities: new Map<number, string[]>(),
  centroidDistances: new Map<number, number>(),

  setClusters: (entityToCluster, centroids, cameraPosition) => {
    // When a camera position is provided, seed distances in the same update so
    // semantic-zoom labels never see a frame with missing distances.
    const centroidDistances = new Map<number, number>();
    if (cameraPosition) {
      centroids.forEach((centroid, clusterId) => {
        centroidDistances.set(clusterId, cameraPosition.distanceTo(centroid.position));
      });
    }

    set({
      entityIdToCluster: entityToCluster,
      centroids,
      clusterToEntities: buildReverseIndex(entityToCluster),
      centroidDistances,
    });
  },

  getClusterId: (entityId) => {
    return get().entityIdToCluster.get(entityId);
  },

  getCentroid: (clusterId) => {
    return get().centroids.get(clusterId);
  },

  getCentroidForEntityId: (entityId) => {
    const clusterId = get().entityIdToCluster.get(entityId);
    if (clusterId === undefined) {
      return undefined;
    }
    return get().centroids.get(clusterId);
  },

  getAllClusters: () => {
    return get().centroids;
  },

  getEntitiesInCluster: (clusterId) => {
    return get().clusterToEntities.get(clusterId) ?? [];
  },

  clearClusters: () => {
    set({
      entityIdToCluster: new Map<string, number>(),
      centroids: new Map<number, ClusterCentroid>(),
      clusterToEntities: new Map<number, string[]>(),
      centroidDistances: new Map<number, number>(),
    });
  },

  calculateDistanceToCamera: (cameraPosition: THREE.Vector3) => {
    const { centroids, centroidDistances } = get();

    const distances = new Map<number, number>(centroidDistances);
    centroids.forEach((centroid, clusterId) => {
      distances.set(clusterId, cameraPosition.distanceTo(centroid.position));
    });

    set({ centroidDistances: distances });
  },

  getCentroidDistance: (entityId: string) => {
    const clusterId = get().entityIdToCluster.get(entityId);
    if (clusterId === undefined) {
      return undefined;
    }
    return get().centroidDistances.get(clusterId);
  },

  getAllCentroidDistances: () => {
    return get().centroidDistances;
  },
}));

/*
 * "Is this entity's cluster within this distance of the camera?", for the
 * semantic zoom of labels.
 *
 * A large landscape has a label per building and the distances change several
 * times a second while the camera moves. Asking every label on every change
 * costs frames, so a label is only told when its own answer changes: the
 * labels are kept per cluster with the range of their thresholds, and a
 * cluster whose distance stays on one side of that range is skipped as a whole.
 */

type RangeListener = { entityId: string; threshold: number; notify: () => void; clusterId: number };
type ClusterRangeListeners = { listeners: Set<RangeListener>; min: number; max: number; stale: boolean };

/** Stands in as the cluster of entities that have none (yet). */
const UNCLUSTERED = -1;
const rangeListeners = new Map<number, ClusterRangeListeners>();

function addRangeListener(listener: RangeListener) {
  listener.clusterId = useClusterStore.getState().entityIdToCluster.get(listener.entityId) ?? UNCLUSTERED;
  let entry = rangeListeners.get(listener.clusterId);
  if (!entry) {
    entry = { listeners: new Set(), min: Infinity, max: -Infinity, stale: false };
    rangeListeners.set(listener.clusterId, entry);
  }
  entry.listeners.add(listener);
  entry.min = Math.min(entry.min, listener.threshold);
  entry.max = Math.max(entry.max, listener.threshold);
}

function removeRangeListener(listener: RangeListener) {
  const entry = rangeListeners.get(listener.clusterId);
  if (!entry || !entry.listeners.delete(listener)) return;
  if (entry.listeners.size === 0) {
    rangeListeners.delete(listener.clusterId);
  } else if (listener.threshold === entry.min || listener.threshold === entry.max) {
    entry.stale = true;
  }
}

function refreshThresholdRange(entry: ClusterRangeListeners) {
  entry.min = Infinity;
  entry.max = -Infinity;
  entry.listeners.forEach(({ threshold }) => {
    if (threshold < entry.min) entry.min = threshold;
    if (threshold > entry.max) entry.max = threshold;
  });
  entry.stale = false;
}

useClusterStore.subscribe((state, previous) => {
  if (rangeListeners.size === 0) return;

  if (state.entityIdToCluster !== previous.entityIdToCluster) {
    // New clusters: every answer may have changed.
    const all = [...rangeListeners.values()].flatMap((entry) => [...entry.listeners]);
    rangeListeners.clear();
    all.forEach(addRangeListener);
    all.forEach((listener) => listener.notify());
    return;
  }

  if (state.centroidDistances === previous.centroidDistances) return;
  rangeListeners.forEach((entry, clusterId) => {
    const before = previous.centroidDistances.get(clusterId);
    const after = state.centroidDistances.get(clusterId);
    if (before === after) return;
    if (before === undefined || after === undefined) {
      entry.listeners.forEach((listener) => listener.notify());
      return;
    }
    if (entry.stale) refreshThresholdRange(entry);
    // An answer changes if its threshold lies between the two distances.
    const low = Math.min(before, after);
    const high = Math.max(before, after);
    if (high <= entry.min || low > entry.max) return;
    entry.listeners.forEach((listener) => {
      if (low <= listener.threshold && listener.threshold < high) listener.notify();
    });
  });
});

/**
 * Whether the entity's cluster is at most `threshold` away from the camera;
 * `fallback` while the entity has no cluster or its distance is unknown.
 * Re-renders only when the answer changes. While not `enabled` the answer is
 * false and nothing is listened to.
 */
export function useIsWithinCentroidDistance(
  entityId: string,
  threshold: number,
  fallback: boolean,
  enabled = true
): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!enabled) return () => {};
      const listener: RangeListener = { entityId, threshold, notify, clusterId: UNCLUSTERED };
      addRangeListener(listener);
      return () => removeRangeListener(listener);
    },
    [entityId, threshold, enabled]
  );
  return useSyncExternalStore(subscribe, () => {
    if (!enabled) return false;
    const distance = useClusterStore.getState().getCentroidDistance(entityId);
    return distance !== undefined ? distance <= threshold : fallback;
  });
}
