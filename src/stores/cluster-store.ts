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
    centroids: Map<number, ClusterCentroid>
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
function buildReverseIndex(
  entityIdToCluster: Map<string, number>
): Map<number, string[]> {
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

  setClusters: (entityToCluster, centroids) => {
    set({
      entityIdToCluster: entityToCluster,
      centroids,
      clusterToEntities: buildReverseIndex(entityToCluster),
      // Reset distances when clusters change
      centroidDistances: new Map<number, number>(),
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
