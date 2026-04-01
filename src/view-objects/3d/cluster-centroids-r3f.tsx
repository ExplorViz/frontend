import { useFrame, useThree } from '@react-three/fiber';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { clusterEntities } from 'explorviz-frontend/src/utils/clustering/k-means';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

const CLUSTER_BALL_RADIUS = 0.05;
const CLUSTER_BALL_SEGMENTS = 16;

/**
 * Component that visualizes cluster centroids as balls in the 3D visualization.
 * The centroids are positioned in the layout coordinate system, so they will be
 * automatically transformed by the LandscapeR3F component's scale and position.
 */
export default function ClusterCentroidsR3F() {
  const {
    clusterCount,
    displayClusters,
    enableClustering,
    distanceUpdateFrequency,
  } = useUserSettingsStore(
    useShallow((state) => ({
      enableClustering: state.visualizationSettings.enableClustering.value,
      clusterCount: state.visualizationSettings.clusterCount.value,
      displayClusters: state.visualizationSettings.displayClusters.value,
      distanceUpdateFrequency:
        state.visualizationSettings.distanceUpdateFrequency.value,
    }))
  );

  const { districtLayouts, buildingLayouts } = useLayoutStore(
    useShallow((state) => ({
      districtLayouts: state.districtLayouts,
      buildingLayouts: state.buildingLayouts,
    }))
  );

  const { camera } = useThree();
  const lastUpdateTimeRef = useRef<number>(performance.now());

  // Calculate distances of clusters of to camera at configured frequency
  useFrame(() => {
    if (enableClustering && distanceUpdateFrequency > 0) {
      const now = performance.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      const updateInterval = 1000.0 / distanceUpdateFrequency; // Convert Hz to milliseconds

      if (timeSinceLastUpdate >= updateInterval) {
        useClusterStore.getState().calculateDistanceToCamera(camera.position);
        lastUpdateTimeRef.current = now;
      }
    }
  });

  const computeClusters = useCallback(() => {
    if (!enableClustering) {
      useClusterStore.getState().clearClusters();
      return [];
    }
    const buildingIds = useModelStore
      .getState()
      .getAllBuildings()
      .map((b) => b.id);
    const districtIds = useModelStore
      .getState()
      .getAllDistricts()
      .map((d) => d.id);

    const clusteringResult = clusterEntities(
      [...buildingIds, ...districtIds],
      clusterCount
    );
    const positions: THREE.Vector3[] = [];
    clusteringResult.centroids.forEach((centroid) => {
      positions.push(centroid.position.clone());
    });

    useClusterStore
      .getState()
      .setClusters(
        clusteringResult.entityToCluster,
        clusteringResult.centroids
      );

    if (displayClusters) {
      return positions;
    } else {
      return [];
    }
  }, [enableClustering, clusterCount, displayClusters]);

  useEffect(() => {
    computeClusters();
  }, [computeClusters, buildingLayouts, districtLayouts]);

  const clusters = displayClusters
    ? Array.from(useClusterStore.getState().getAllClusters().values())
    : [];

  return (
    <group>
      {clusters.map((cluster) => (
        <mesh
          key={`cluster-centroid-${cluster.id}`}
          position={cluster.position}
        >
          <sphereGeometry
            args={[
              CLUSTER_BALL_RADIUS,
              CLUSTER_BALL_SEGMENTS,
              CLUSTER_BALL_SEGMENTS,
            ]}
          />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      ))}
    </group>
  );
}
