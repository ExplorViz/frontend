import { useFrame, useThree } from '@react-three/fiber';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { clusterEntitiesAsync } from 'explorviz-frontend/src/utils/clustering/k-means';
import { ClusterCentroid } from 'explorviz-frontend/src/stores/cluster-store';
import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

const CLUSTER_BALL_RADIUS = 0.05;
const CLUSTER_BALL_SEGMENTS = 16;

/**
 * Component that visualizes cluster centroids as balls in the 3D visualization.
 * The centroids are positioned in the layout coordinate system, so they will be
 * automatically transformed by the LandscapeR3F component's scale and position.
 *
 * The k-means computation is offloaded to a Web Worker via `clusterEntitiesAsync`
 * so the main thread (and therefore the renderer) stays responsive while
 * clustering runs. A generation counter ensures that stale results from a
 * superseded computation are discarded.
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

  // Each time a new computation is kicked off we increment this counter.
  // The async callback checks the counter before writing to the store so that
  // results from superseded runs are silently dropped.
  const generationRef = useRef(0);

  // Calculate distances of clusters to camera at configured frequency
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

  const computeClusters = useCallback(async () => {
    if (!enableClustering) {
      useClusterStore.getState().clearClusters();
      return;
    }

    const buildingIds = useModelStore
      .getState()
      .getAllBuildings()
      .map((b) => b.id);
    const districtIds = useModelStore
      .getState()
      .getAllDistricts()
      .map((d) => d.id);

    // Capture the generation for this run so we can detect stale results
    const generation = ++generationRef.current;

    const clusteringResult = await clusterEntitiesAsync(
      [...buildingIds, ...districtIds],
      clusterCount
    );

    // Discard the result if a newer computation has already been started
    if (generation !== generationRef.current) return;

    useClusterStore
      .getState()
      .setClusters(
        clusteringResult.entityToCluster,
        clusteringResult.centroids
      );
  }, [enableClustering, clusterCount]);

  useEffect(() => {
    computeClusters();
  }, [computeClusters, buildingLayouts, districtLayouts]);

  // Subscribe to the cluster store so the centroid balls re-render whenever
  // setClusters is called (the previous code read getState() outside a
  // subscription, so the balls were never updated reactively).
  const centroids = useClusterStore((state) => state.centroids);
  const clusters: ClusterCentroid[] = displayClusters
    ? Array.from(centroids.values())
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
