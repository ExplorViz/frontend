import * as THREE from 'three';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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

export const useClusterStore = create<ClusterStoreState>()(
  devtools(
    (set, get) => ({
      entityIdToCluster: new Map<string, number>(),
      centroids: new Map<number, ClusterCentroid>(),
      centroidDistances: new Map<number, number>(),

      setClusters: (entityToCluster, centroids) => {
        set({
          entityIdToCluster: entityToCluster,
          centroids,
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
        const entities: string[] = [];
        get().entityIdToCluster.forEach((id, entityId) => {
          if (id === clusterId) {
            entities.push(entityId);
          }
        });
        return entities;
      },

      clearClusters: () => {
        set({
          entityIdToCluster: new Map<string, number>(),
          centroids: new Map<number, ClusterCentroid>(),
          centroidDistances: new Map<number, number>(),
        });
      },

      calculateDistanceToCamera: (cameraPosition: THREE.Vector3) => {
        const distances = new Map<number, number>();
        const centroids = get().centroids;

        centroids.forEach((centroid, clusterId) => {
          const distance = cameraPosition.distanceTo(centroid.position);
          distances.set(clusterId, distance);
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
    }),
    {
      name: 'cluster-store',
    }
  )
);
