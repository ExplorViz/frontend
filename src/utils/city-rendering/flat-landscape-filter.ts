import {
  BuildingComparisonVisibility,
  isBuildingComparisonFilterActive,
} from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import { District, FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

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
    districtSubtreeHasRemainingBuildings(childDistrictId, districts, remainingBuildingIds)
  );
}

export function pruneFlatLandscapeByRemainingBuildings(
  flatLandscape: FlatLandscape,
  remainingBuildingIds: Set<string> = new Set(Object.keys(flatLandscape.buildings))
): void {
  for (const district of Object.values(flatLandscape.districts)) {
    district.buildingIds = district.buildingIds.filter((id) => remainingBuildingIds.has(id));
    district.districtIds = district.districtIds.filter((id) =>
      districtSubtreeHasRemainingBuildings(id, flatLandscape.districts, remainingBuildingIds)
    );
  }

  for (const city of Object.values(flatLandscape.cities)) {
    city.buildingIds = city.buildingIds.filter((id) => remainingBuildingIds.has(id));
    city.allContainedBuildingIds = city.allContainedBuildingIds.filter((id) => remainingBuildingIds.has(id));
    city.districtIds = city.districtIds.filter((id) =>
      districtSubtreeHasRemainingBuildings(id, flatLandscape.districts, remainingBuildingIds)
    );
    city.allContainedDistrictIds = city.allContainedDistrictIds.filter((id) =>
      districtSubtreeHasRemainingBuildings(id, flatLandscape.districts, remainingBuildingIds)
    );
  }

  for (const districtId of Object.keys(flatLandscape.districts)) {
    if (!districtSubtreeHasRemainingBuildings(districtId, flatLandscape.districts, remainingBuildingIds)) {
      delete flatLandscape.districts[districtId];
    }
  }
}

export function filterFlatLandscapeByBuildingComparisonVisibility(
  flatLandscape: FlatLandscape,
  visibility: BuildingComparisonVisibility
): FlatLandscape {
  if (!isBuildingComparisonFilterActive(visibility)) {
    return flatLandscape;
  }

  const filteredFlatLandscape = structuredClone(flatLandscape);

  for (const [buildingId, building] of Object.entries(filteredFlatLandscape.buildings)) {
    if (!building.commitComparison || !visibility[building.commitComparison]) {
      delete filteredFlatLandscape.buildings[buildingId];
    }
  }

  pruneFlatLandscapeByRemainingBuildings(filteredFlatLandscape);

  return filteredFlatLandscape;
}

/**
 * Removes every district without direct buildings and moves its inner districts
 * up to the removed district's parent (district or city), so the layout can
 * place them more compactly. Mutates the given landscape.
 */
export function collapseDistrictsWithoutBuildings(flatLandscape: FlatLandscape): void {
  const { districts } = flatLandscape;

  const collapse = (districtIds: readonly string[], parentDistrictId: string | undefined): string[] =>
    districtIds.flatMap((districtId) => {
      const district = districts[districtId];
      if (!district) {
        return [];
      }

      if (district.buildingIds.length === 0) {
        const innerDistrictIds = collapse(district.districtIds, parentDistrictId);
        delete districts[districtId];
        return innerDistrictIds;
      }

      if (parentDistrictId === undefined) {
        delete district.parentDistrictId;
      } else {
        district.parentDistrictId = parentDistrictId;
      }
      district.districtIds = collapse(district.districtIds, district.id);
      return [districtId];
    });

  for (const city of Object.values(flatLandscape.cities)) {
    city.districtIds = collapse(city.districtIds, undefined);
  }

  for (const city of Object.values(flatLandscape.cities)) {
    city.allContainedDistrictIds = city.allContainedDistrictIds.filter((id) => districts[id] !== undefined);
  }
}
