import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
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
 * Returns the nesting depth (level) of a district (0 for top-level districts).
 */
function getDistrictLevel(districtId: string): number {
  // Use layout data if available
  const districtLayout = useLayoutStore.getState().getLayout(districtId);
  if (districtLayout) return districtLayout.level;
  // Compute level from model otherwise
  const { getDistrict } = useModelStore.getState();
  let level = 0;
  let parentId = getDistrict(districtId)?.parentDistrictId;
  while (parentId) {
    level++;
    parentId = getDistrict(parentId)?.parentDistrictId;
  }
  return level;
}

/**
 * Component that automatically opens and closes districts based on
 * the distance from the camera to their cluster centroids.
 */
export default function AutoDistrictOpenerR3F() {
  const {
    enableClustering,
    autoOpenCloseDistricts,
    districtOpenCloseDistanceThreshold,
    districtNestingInfluence,
    districtSizeInfluence,
    distanceUpdateFrequency,
  } = useUserSettingsStore(
    useShallow((state) => ({
      enableClustering: state.visualizationSettings.enableClustering.value,
      autoOpenCloseDistricts:
        state.visualizationSettings.autoOpenCloseDistricts.value,
      districtOpenCloseDistanceThreshold:
        state.visualizationSettings.districtOpenCloseDistanceThreshold.value,
      districtNestingInfluence:
        state.visualizationSettings.districtNestingInfluence.value,
      districtSizeInfluence:
        state.visualizationSettings.districtSizeInfluence.value,
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

  const districtLayouts = useLayoutStore((state) => state.districtLayouts);

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

    let maxArea = 0;
    districtLayouts.forEach((layout) => {
      maxArea = Math.max(maxArea, layout.area);
    });

    districts.forEach((district) => {
      const distance = getCentroidDistance(district.id);
      if (distance === undefined) {
        // No cluster assignment, skip
        return;
      }

      const isCurrentlyOpen = isDistrictOpen(district.id, closedDistrictIds);
      // Nested districts get a smaller threshold, so they open later
      // (closer to the camera) than their ancestors.
      const districtLevel = getDistrictLevel(district.id);
      // Larger districts get a larger threshold, so they open from farther away.
      const layout = districtLayouts.get(district.id);
      const relativeSize =
        layout && maxArea > 0 ? Math.sqrt(layout.area / maxArea) : 0;
      const effectiveThreshold =
        districtOpenCloseDistanceThreshold *
        Math.pow(1 - districtNestingInfluence, districtLevel) *
        (1 + districtSizeInfluence * relativeSize);
      const isWithinThreshold = distance <= effectiveThreshold;

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
    districtNestingInfluence,
    districtSizeInfluence,
    districtLayouts,
    getAllDistricts,
  ]);

  return null;
}
