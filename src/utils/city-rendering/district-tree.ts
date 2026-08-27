import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { isDistrictClosed } from 'explorviz-frontend/src/utils/city-rendering/district-close-state';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export function isBuildingHiddenByClosedDistrictAncestor(
  building: Building,
  closedDistrictIds: Set<string>
): boolean {
  let parentDistrictId = building.parentDistrictId;
  const districts = useModelStore.getState().districts;

  while (parentDistrictId) {
    if (isDistrictClosed(parentDistrictId, closedDistrictIds)) {
      return true;
    }

    const parentDistrict = districts[parentDistrictId];
    if (!parentDistrict) {
      break;
    }

    parentDistrictId = parentDistrict.parentDistrictId;
  }

  return false;
}

export function isBuildingHiddenByClosedDistricts(
  buildingId: string,
  closedDistrictIds: Set<string>,
  building?: Building
): boolean {
  const resolvedBuilding =
    building ?? useModelStore.getState().getBuilding(buildingId);
  if (!resolvedBuilding) {
    return false;
  }

  return isBuildingHiddenByClosedDistrictAncestor(
    resolvedBuilding,
    closedDistrictIds
  );
}

export function collectDistrictSubtreeIds(districtId: string): {
  districtIds: string[];
  buildingIds: string[];
} {
  const district = useModelStore.getState().getDistrict(districtId);
  if (!district) {
    return { districtIds: [], buildingIds: [] };
  }

  const districtIds = [district.id];
  const buildingIds = district.buildingIds.filter((buildingId) => {
    const building = useModelStore.getState().getBuilding(buildingId);
    return building?.parentDistrictId === district.id;
  });

  for (const childDistrictId of district.districtIds) {
    const childDistrict = useModelStore.getState().getDistrict(childDistrictId);
    if (!childDistrict || childDistrict.parentDistrictId !== district.id) {
      continue;
    }

    const nested = collectDistrictSubtreeIds(childDistrictId);
    districtIds.push(...nested.districtIds);
    buildingIds.push(...nested.buildingIds);
  }

  return { districtIds, buildingIds };
}

export function filterBuildingIdsForCity(
  cityId: string,
  buildingIds: readonly string[]
): string[] {
  const modelStore = useModelStore.getState();
  const seenBuildingIds = new Set<string>();

  return buildingIds.filter((buildingId) => {
    if (seenBuildingIds.has(buildingId)) {
      return false;
    }

    const building = modelStore.getBuilding(buildingId);
    if (building?.parentCityId !== cityId) {
      return false;
    }

    seenBuildingIds.add(buildingId);
    return true;
  });
}

export function filterDistrictIdsForCity(
  cityId: string,
  districtIds: readonly string[]
): string[] {
  const modelStore = useModelStore.getState();
  const seenDistrictIds = new Set<string>();

  return districtIds.filter((districtId) => {
    if (seenDistrictIds.has(districtId)) {
      return false;
    }

    const district = modelStore.getDistrict(districtId);
    if (district?.parentCityId !== cityId) {
      return false;
    }

    seenDistrictIds.add(districtId);
    return true;
  });
}
