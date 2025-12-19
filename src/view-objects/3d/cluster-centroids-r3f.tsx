import { useFrame, useThree } from '@react-three/fiber';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  getAllClassIdsInApplications,
  getAllPackageIdsInApplications,
} from 'explorviz-frontend/src/utils/application-helpers';
import { clusterEntities } from 'explorviz-frontend/src/utils/clustering/k-means';
import { useEffect, useState } from 'react';
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
  const [positions, setPositions] = useState<THREE.Vector3[]>([]);
  const { clusterCount, displayClusters } = useUserSettingsStore(
    useShallow((state) => ({
      clusterCount: state.visualizationSettings.clusterCount.value,
      displayClusters: state.visualizationSettings.displayClusters.value,
    }))
  );

  const classLayouts = useLayoutStore((state) => state.classLayouts);
  const { camera } = useThree();

  // Calculate distances to camera every frame
  useFrame(() => {
    if (displayClusters) {
      useClusterStore.getState().calculateDistanceToCamera(camera.position);
    }
  });

  useEffect(() => {
    if (displayClusters) {
      const applications = useModelStore.getState().getAllApplications();
      const classIds = getAllClassIdsInApplications(applications);
      const packageIds = getAllPackageIdsInApplications(applications);

      const clusteringResult = clusterEntities(
        [...classIds, ...packageIds],
        clusterCount
      );
      const positions: THREE.Vector3[] = [];
      clusteringResult.centroids.forEach((centroid) => {
        positions.push(centroid.position.clone());
      });
      setPositions(positions);

      useClusterStore
        .getState()
        .setClusters(
          clusteringResult.entityToCluster,
          clusteringResult.centroids
        );
    } else {
      // Clear clusters if clustering is disabled
      useClusterStore.getState().clearClusters();
    }
  }, [classLayouts, clusterCount, displayClusters]);

  if (!displayClusters) {
    return null;
  }

  return (
    <group>
      {positions.map((position) => (
        <mesh position={position}>
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
