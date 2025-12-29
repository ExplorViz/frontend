import { useFrame } from '@react-three/fiber';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeComponent,
  openComponent,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Component that automatically opens and closes components based on
 * the distance from the camera to their cluster centroids.
 * Components can only be automatically opened if the parent component is already opened.
 * Components can only be automatically closed if all subpackages are already closed.
 */
export default function AutoComponentOpenerR3F() {
  const {
    enableClustering,
    autoOpenCloseComponents,
    componentOpenCloseDistanceThreshold,
    distanceUpdateFrequency,
  } = useUserSettingsStore(
    useShallow((state) => ({
      enableClustering: state.visualizationSettings.enableClustering.value,
      autoOpenCloseComponents:
        state.visualizationSettings.autoOpenCloseComponents.value,
      componentOpenCloseDistanceThreshold:
        state.visualizationSettings.componentOpenCloseDistanceThreshold.value,
      distanceUpdateFrequency:
        state.visualizationSettings.distanceUpdateFrequency.value,
    }))
  );

  const closedComponentIds = useVisualizationStore(
    (state) => state.closedComponentIds
  );
  const getCentroidDistance = useClusterStore(
    (state) => state.getCentroidDistance
  );
  const getAllComponents = useModelStore((state) => state.getAllComponents);

  const lastUpdateTimeRef = useRef<number>(0);

  useFrame(() => {
    if (
      !enableClustering ||
      !autoOpenCloseComponents ||
      distanceUpdateFrequency <= 0
    ) {
      return;
    }

    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const updateInterval = 1000.0 / distanceUpdateFrequency;

    if (timeSinceLastUpdate >= updateInterval) {
      const components = getAllComponents();

      components.forEach((component) => {
        const distance = getCentroidDistance(component.id);
        if (distance === undefined) {
          // No cluster assignment, skip
          return;
        }

        const isCurrentlyOpen = !closedComponentIds.has(component.id);
        const isWithinThreshold =
          distance <= componentOpenCloseDistanceThreshold;

        if (isWithinThreshold && !isCurrentlyOpen) {
          // Open component when close to cluster centroid
          // But only if parent component is already opened (or component has no parent)
          const parentIsOpen =
            component.parent === undefined ||
            !closedComponentIds.has(component.parent.id);

          if (parentIsOpen) {
            openComponent(component.id, false);
          }
        } else if (!isWithinThreshold && isCurrentlyOpen) {
          // Close component when far from cluster centroid
          // But only if all subpackages are already closed
          const allSubPackagesClosed = component.subPackages.every(
            (subPackage) => closedComponentIds.has(subPackage.id)
          );

          if (allSubPackagesClosed) {
            closeComponent(component.id, false, false);
          }
        }
      });

      lastUpdateTimeRef.current = now;
    }
  });

  return null;
}
