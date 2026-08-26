import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { isDistrictOpen } from 'explorviz-frontend/src/utils/city-rendering/district-close-state';
import {
  collectDistrictSubtreeIds,
  filterDistrictIdsForCity,
} from 'explorviz-frontend/src/utils/city-rendering/district-tree';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

const { closeDistricts, hideDistricts, openDistricts, showDistricts } =
  useVisualizationStore.getState().actions;

function getValidatedChildDistrictIds(district: District): string[] {
  return district.districtIds.filter((childDistrictId) => {
    const childDistrict = useModelStore.getState().getDistrict(childDistrictId);
    return (
      childDistrict != null &&
      childDistrict.parentCityId === district.parentCityId &&
      childDistrict.parentDistrictId === district.id
    );
  });
}

/**
 * Given a district or building, returns a list of all ancestor districts.
 *
 * @param entity District or Building of which the ancestors shall be returned (entity is not included in the list)
 */
export function getAllAncestorDistricts(
  entity: District | Building
): (Package | District)[] {
  if (!entity.parentDistrictId) {
    return [];
  }

  const parent = useModelStore.getState().getDistrict(entity.parentDistrictId);
  if (!parent) {
    return [];
  }

  return [parent, ...getAllAncestorDistricts(parent)];
}

export function closeDistrictsByList(
  districtIds: string[],
  hide = false,
  sendMessage = true
) {
  districtIds.forEach((districtId) => {
    closeDistrict(districtId, hide, sendMessage);
  });
}

/**
 * Opens a give district.
 *
 * @param district District which shall be opened
 */
export function openDistrict(districtId: string, sendMessage = true) {
  const district = useModelStore.getState().getDistrict(districtId);
  if (!district) return;

  const isOpen = isDistrictOpen(
    district.id,
    useVisualizationStore.getState().closedDistrictIds
  );
  if (isOpen) {
    return;
  }

  openDistricts([district.id]);
  showDistricts(getValidatedChildDistrictIds(district));
}

/**
 * Opens a district and expands the full subtree: all nested districts and their buildings.
 */
export function openDistrictAndChildren(
  districtId: string,
  sendMessage = true
) {
  const { districtIds } = collectDistrictSubtreeIds(districtId);
  if (districtIds.length === 0) {
    return;
  }
  openDistricts(districtIds);
  showDistricts(districtIds);
}

/**
 * Closes a given district.
 *
 * @param districtId Id of district which shall be closed
 */
export function closeDistrict(
  districtId: string,
  hide = false,
  sendMessage = true
) {
  const district = useModelStore.getState().getDistrict(districtId);

  if (!district) {
    console.error('No district model with districtId in store', districtId);
    return;
  }

  const isOpen = isDistrictOpen(
    district.id,
    useVisualizationStore.getState().closedDistrictIds
  );
  if (hide) {
    hideDistricts([district.id]);
  }

  if (!isOpen) {
    return;
  }

  closeDistricts([district.id]);

  getValidatedChildDistrictIds(district).forEach((childDistrictId) => {
    closeDistrict(childDistrictId, true, false);
  });
}

/**
 * Closes all districts which are part of the given city
 *
 * @param city City which contains the districts
 */
export function closeAllDistrictsInCity(city: City, sendMessage = true) {
  const cityDistrictIds = filterDistrictIdsForCity(
    city.id,
    city.allContainedDistrictIds
  );
  const districtIdsToHide = cityDistrictIds.filter(
    (id) => !city.districtIds.includes(id)
  );
  closeDistricts(cityDistrictIds);
  hideDistricts(districtIdsToHide);
}

export function closeAllDistrictsInLandscape(sendMessage = true) {
  const allDistricts = useModelStore.getState().getAllDistricts();
  const allCities = useModelStore.getState().getAllCities();

  const topLevelDistrictIds = allCities.flatMap((city) => city.districtIds);

  const allDistrictIds = allDistricts.map((district) => district.id);

  closeDistricts(allDistrictIds);

  const districtIdsToHide = Array.from(
    new Set(allDistrictIds).difference(new Set(topLevelDistrictIds))
  );
  hideDistricts(districtIdsToHide);
  showDistricts(topLevelDistrictIds);
}

/**
 * Opens all districts which are part of the given city
 *
 * @param city City which contains the districts to be opened
 */
export function openAllDistrictsInCity(city: City, sendMessage = true) {
  const cityDistrictIds = filterDistrictIdsForCity(
    city.id,
    city.allContainedDistrictIds
  );
  openDistricts(cityDistrictIds);
  showDistricts(cityDistrictIds);
}

export function openAllDistrictsInLandscape(sendMessage = true) {
  const districtIds = useModelStore
    .getState()
    .getAllDistricts()
    .map((district) => district.id);

  openDistricts(districtIds);
  showDistricts(districtIds);
}
