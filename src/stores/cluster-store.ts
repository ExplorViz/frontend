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
}

export const useClusterStore = create<ClusterStoreState>()(
  devtools(
    (set, get) => ({
      entityToCluster: new Map<string, number>(),
      centroids: new Map<number, ClusterCentroid>(),

      setClusters: (entityToCluster, centroids) => {
        set({
          entityIdToCluster: entityToCluster,
          centroids,
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
        });
      },
    }),
    {
      name: 'cluster-store',
    }
  )
);
