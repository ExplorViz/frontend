import {
  BuildingComparisonVisibility,
  isBuildingComparisonFilterActive,
} from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import {
  District,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

function districtSubtreeHasRemainingBuildings(
  districtId: string,
  districts: Record<string, District>,
  remainingBuildingIds: Set<string>
): boolean {
  const district = districts[districtId];
  if (!district) {
    return false;
  }

  if (district.buildingIds.some((id) => remainingBuildingIds.has(id))) {
    return true;
  }

  return district.districtIds.some((childDistrictId) =>
    districtSubtreeHasRemainingBuildings(
      childDistrictId,
      districts,
      remainingBuildingIds
    )
  );
}

export function filterFlatLandscapeByBuildingComparisonVisibility(
  flatLandscape: FlatLandscape,
  visibility: BuildingComparisonVisibility
): FlatLandscape {
  if (!isBuildingComparisonFilterActive(visibility)) {
    return flatLandscape;
  }

  const filteredFlatLandscape = structuredClone(flatLandscape);

  for (const [buildingId, building] of Object.entries(
    filteredFlatLandscape.buildings
  )) {
    if (!building.commitComparison || !visibility[building.commitComparison]) {
      delete filteredFlatLandscape.buildings[buildingId];
    }
  }

  const remainingBuildingIds = new Set(
    Object.keys(filteredFlatLandscape.buildings)
  );

  for (const district of Object.values(filteredFlatLandscape.districts)) {
    district.buildingIds = district.buildingIds.filter((id) =>
      remainingBuildingIds.has(id)
    );
    district.districtIds = district.districtIds.filter((id) =>
      districtSubtreeHasRemainingBuildings(
        id,
        filteredFlatLandscape.districts,
        remainingBuildingIds
      )
    );
  }

  for (const city of Object.values(filteredFlatLandscape.cities)) {
    city.buildingIds = city.buildingIds.filter((id) =>
      remainingBuildingIds.has(id)
    );
    city.allContainedBuildingIds = city.allContainedBuildingIds.filter((id) =>
      remainingBuildingIds.has(id)
    );
    city.districtIds = city.districtIds.filter((id) =>
      districtSubtreeHasRemainingBuildings(
        id,
        filteredFlatLandscape.districts,
        remainingBuildingIds
      )
    );
    city.allContainedDistrictIds = city.allContainedDistrictIds.filter((id) =>
      districtSubtreeHasRemainingBuildings(
        id,
        filteredFlatLandscape.districts,
        remainingBuildingIds
      )
    );
  }

  return filteredFlatLandscape;
}
