import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  isDistrictClosed,
  isDistrictOpen,
} from 'explorviz-frontend/src/utils/city-rendering/district-close-state';
import {
  closeDistrict,
  openDistrict,
} from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Component that automatically opens and closes districts based on
 * the distance from the camera to their cluster centroids.
 * Districts can only be automatically opened if the parent district is already opened.
 * Districts can only be automatically closed if all nested districts are already closed.
 */
export default function AutoDistrictOpenerR3F() {
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

  const closedDistrictIds = useVisualizationStore(
    (state) => state.closedDistrictIds
  );

  const { centroidDistances, getCentroidDistance } = useClusterStore(
    useShallow((state) => ({
      centroidDistances: state.centroidDistances,
      getCentroidDistance: state.getCentroidDistance,
    }))
  );

  const getAllDistricts = useModelStore((state) => state.getAllDistricts);

  useEffect(() => {
    if (
      !enableClustering ||
      !autoOpenCloseDistricts ||
      distanceUpdateFrequency <= 0
    ) {
      return;
    }
    const districts = getAllDistricts();

    districts.forEach((district) => {
      const distance = getCentroidDistance(district.id);
      if (distance === undefined) {
        // No cluster assignment, skip
        return;
      }

      const isCurrentlyOpen = isDistrictOpen(district.id, closedDistrictIds);
      const isWithinThreshold = distance <= districtOpenCloseDistanceThreshold;

      if (isWithinThreshold && !isCurrentlyOpen) {
        const parentIsOpen =
          !district.parentDistrictId ||
          isDistrictOpen(district.parentDistrictId, closedDistrictIds);

        if (parentIsOpen) {
          openDistrict(district.id, false);
        }
      } else if (!isWithinThreshold && isCurrentlyOpen) {
        const validatedChildDistrictIds = district.districtIds.filter(
          (childDistrictId) => {
            const childDistrict = useModelStore
              .getState()
              .getDistrict(childDistrictId);
            return (
              childDistrict != null &&
              childDistrict.parentCityId === district.parentCityId &&
              childDistrict.parentDistrictId === district.id
            );
          }
        );

        const allInnerDistrictsClosed = validatedChildDistrictIds.every(
          (childDistrictId) =>
            isDistrictClosed(childDistrictId, closedDistrictIds)
        );

        if (allInnerDistrictsClosed) {
          closeDistrict(district.id, false, false);
        }
      }
    });
  }, [
    centroidDistances,
    getCentroidDistance,
    closedDistrictIds,
    enableClustering,
    autoOpenCloseDistricts,
    distanceUpdateFrequency,
    districtOpenCloseDistanceThreshold,
    getAllDistricts,
  ]);

  return null;
}
