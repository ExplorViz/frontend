import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeComponent,
  openComponent,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Component that automatically opens and closes districts based on
 * the distance from the camera to their cluster centroids.
 * Districts can only be automatically opened if the parent district is already opened.
 * Districts can only be automatically closed if all nested districts are already closed.
 */
export default function AutoComponentOpenerR3F() {
  const {
    enableClustering,
    autoOpenCloseDistricts,
    districtOpenCloseDistanceThreshold,
    distanceUpdateFrequency,
  } = useUserSettingsStore(
    useShallow((state) => ({
      enableClustering: state.visualizationSettings.enableClustering.value,
      autoOpenCloseDistricts:
        state.visualizationSettings.autoOpenCloseDistricts.value,
      districtOpenCloseDistanceThreshold:
        state.visualizationSettings.districtOpenCloseDistanceThreshold.value,
      distanceUpdateFrequency:
        state.visualizationSettings.distanceUpdateFrequency.value,
    }))
  );

  const closedComponentIds = useVisualizationStore(
    (state) => state.closedDistrictIds
  );

  const { centroidDistances, getCentroidDistance } = useClusterStore(
    useShallow((state) => ({
      centroidDistances: state.centroidDistances,
      getCentroidDistance: state.getCentroidDistance,
    }))
  );

  const getAllComponents = useModelStore((state) => state.getAllComponents);

  useEffect(() => {
    if (
      !enableClustering ||
      !autoOpenCloseDistricts ||
      distanceUpdateFrequency <= 0
    ) {
      return;
    }
    const components = getAllComponents();

    components.forEach((component) => {
      const distance = getCentroidDistance(component.id);
      if (distance === undefined) {
        // No cluster assignment, skip
        return;
      }

      const isCurrentlyOpen = !closedComponentIds.has(component.id);
      const isWithinThreshold = distance <= districtOpenCloseDistanceThreshold;

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
        const allSubPackagesClosed = component.subPackages.every((subPackage) =>
          closedComponentIds.has(subPackage.id)
        );

        if (allSubPackagesClosed) {
          closeComponent(component.id, false, false);
        }
      }
    });
  }, [centroidDistances, getCentroidDistance]);

  return null;
}
