import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { isDistrictOpen } from 'explorviz-frontend/src/utils/city-rendering/district-close-state';
import {
  collectDistrictSubtreeIds,
  filterDistrictIdsForCity,
} from 'explorviz-frontend/src/utils/city-rendering/district-tree';
import { Building, City, District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  changeDistricts,
  getDistricts,
  type DistrictAction,
} from 'explorviz-frontend/src/utils/collaboration/districts';

/*
 * The District actions behind each user action. Each function works out which
 * Districts are concerned and passes them to `changeDistricts` as one change.
 */

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
export function getAllAncestorDistricts(entity: District | Building): (Package | District)[] {
  if (!entity.parentDistrictId) {
    return [];
  }

  const parent = useModelStore.getState().getDistrict(entity.parentDistrictId);
  if (!parent) {
    return [];
  }

  return [parent, ...getAllAncestorDistricts(parent)];
}

export function closeDistrictsByList(districtIds: string[], hide = false, _sendMessage = true) {
  const closed = new Set(getDistricts().closedDistrictIds);
  changeDistricts(districtIds.flatMap((districtId) => closeDistrictActions(districtId, hide, closed)));
}

/**
 * Opens a give district.
 *
 * @param district District which shall be opened
 */
export function openDistrict(districtId: string, _sendMessage = true) {
  const district = useModelStore.getState().getDistrict(districtId);
  if (!district) return;

  const isOpen = isDistrictOpen(district.id, getDistricts().closedDistrictIds);
  if (isOpen) {
    return;
  }

  changeDistricts([
    { type: 'open', ids: [district.id] },
    { type: 'show', ids: getValidatedChildDistrictIds(district) },
  ]);
}

/**
 * Opens a district and expands the full subtree: all nested districts and their buildings.
 */
export function openDistrictAndChildren(districtId: string, _sendMessage = true) {
  const { districtIds } = collectDistrictSubtreeIds(districtId);
  if (districtIds.length === 0) {
    return;
  }
  changeDistricts([
    { type: 'open', ids: districtIds },
    { type: 'show', ids: districtIds },
  ]);
}

/**
 * Closes a given district.
 *
 * @param districtId Id of district which shall be closed
 */
export function closeDistrict(districtId: string, hide = false, _sendMessage = true) {
  changeDistricts(closeDistrictActions(districtId, hide, new Set(getDistricts().closedDistrictIds)));
}

/**
 * The actions that close a District and, if it was open, close and hide its
 * open descendants. `closed` is updated as if the actions had been applied.
 */
function closeDistrictActions(districtId: string, hide: boolean, closed: Set<string>): DistrictAction[] {
  const district = useModelStore.getState().getDistrict(districtId);

  if (!district) {
    console.error('No district model with districtId in store', districtId);
    return [];
  }

  const actions: DistrictAction[] = [];
  if (hide) {
    actions.push({ type: 'hide', ids: [district.id] });
  }

  if (!isDistrictOpen(district.id, closed)) {
    return actions;
  }

  closed.add(district.id);
  actions.push({ type: 'close', ids: [district.id] });

  getValidatedChildDistrictIds(district).forEach((childDistrictId) => {
    actions.push(...closeDistrictActions(childDistrictId, true, closed));
  });
  return actions;
}

/**
 * Closes all districts which are part of the given city
 *
 * @param city City which contains the districts
 */
export function closeAllDistrictsInCity(city: City, _sendMessage = true) {
  const cityDistrictIds = filterDistrictIdsForCity(city.id, city.allContainedDistrictIds);
  const districtIdsToHide = cityDistrictIds.filter((id) => !city.districtIds.includes(id));
  changeDistricts([
    { type: 'close', ids: cityDistrictIds },
    { type: 'hide', ids: districtIdsToHide },
  ]);
}

/** Closes every District and hides the nested ones; one small action whatever the Landscape's size. */
export function closeAllDistrictsInLandscape(_sendMessage = true) {
  const topLevelIds = useModelStore
    .getState()
    .getAllCities()
    .flatMap((city) => city.districtIds);
  changeDistricts([{ type: 'closeAll', topLevelIds }]);
}

/**
 * Opens all districts which are part of the given city
 *
 * @param city City which contains the districts to be opened
 */
export function openAllDistrictsInCity(city: City, _sendMessage = true) {
  const cityDistrictIds = filterDistrictIdsForCity(city.id, city.allContainedDistrictIds);
  changeDistricts([
    { type: 'open', ids: cityDistrictIds },
    { type: 'show', ids: cityDistrictIds },
  ]);
}

export function openAllDistrictsInLandscape(_sendMessage = true) {
  changeDistricts([{ type: 'openAll' }]);
}
