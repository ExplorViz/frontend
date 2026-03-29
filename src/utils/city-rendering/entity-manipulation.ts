import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
    Building,
    City,
    District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

const {
  closeDistricts,
  hideBuildings,
  hideDistricts,
  openDistricts,
  showBuildings,
  showDistricts,
} = useVisualizationStore.getState().actions;

function getChildDistrictIds(entity: Package | District): string[] {
  if ('subPackages' in entity) {
    return entity.subPackages.map((p) => p.id);
  }
  return entity.districtIds;
}

function getChildBuildingIds(entity: District): string[] {
  return entity.buildingIds;
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

  const isOpen = !useVisualizationStore
    .getState()
    .closedDistrictIds.has(district.id);
  if (isOpen) {
    return;
  }

  openDistricts([district.id]);
  showDistricts(getChildDistrictIds(district));
  showBuildings(getChildBuildingIds(district));

  if (sendMessage) {
    useMessageSenderStore.getState().sendDistrictUpdate([district.id], true);
  }
}

/**
 * Closes a given district.
 *
 * @param districtId Id of districte which shall be closed
 */
export function closeDistrict(
  districtId: string,
  hide = false,
  sendMessage = true
) {
  const district = useModelStore.getState().getDistrict(districtId);

  if (!district) return;

  const isOpen = !useVisualizationStore
    .getState()
    .closedDistrictIds.has(district.id);
  if (hide) {
    hideDistricts([district.id]);
  }

  if (!isOpen) {
    return;
  }

  if (sendMessage) {
    useMessageSenderStore.getState().sendDistrictUpdate([district.id], false);
  }

  closeDistricts([district.id]);

  hideBuildings(getChildBuildingIds(district));

  const chidDistrictIds = getChildDistrictIds(district);
  chidDistrictIds.forEach((childDistrictId) => {
    closeDistrict(childDistrictId, true, false);
  });
}

/**
 * Closes all districts which are part of the given city
 *
 * @param city City which contains the districts
 */
export function closeAllDistrictsInCity(city: City, sendMessage = true) {
  const districtIdsToHide = city.allContainedDistrictIds.filter(
    (id) => !city.districtIds.includes(id)
  );
  closeDistricts(city.allContainedDistrictIds);
  hideDistricts(districtIdsToHide);
  hideBuildings(city.allContainedBuildingIds);

  if (sendMessage) {
    useMessageSenderStore
      .getState()
      .sendDistrictUpdate(city.allContainedDistrictIds, false);
  }
}

export function closeAllDistrictsInLandscape(sendMessage = true) {
  const allDistricts = useModelStore.getState().getAllDistricts();

  const topLevelDistrictIds = allDistricts
    .filter((district) => {
      return district.parentDistrictId === undefined;
    })
    .map((district) => district.id);

  const allDistrictIds = allDistricts.map((district) => district.id);
  const allBuildingIds = useModelStore
    .getState()
    .getAllBuildings()
    .map((building) => building.id);

  closeDistricts(allDistrictIds);
  hideDistricts(
    Array.from(new Set(allDistrictIds).difference(new Set(topLevelDistrictIds)))
  );
  hideBuildings(allBuildingIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendDistrictUpdate(allDistrictIds, false);
  }
}

/**
 * Opens all districts which are part of the given city
 *
 * @param city City which contains the districts to be opened
 */
export function openAllDistrictsInCity(city: City, sendMessage = true) {
  openDistricts(city.allContainedDistrictIds);
  showBuildings(city.allContainedBuildingIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendDistrictUpdate(city.allContainedDistrictIds, true);
  }
}

export function openAllDistrictsInLandscape(sendMessage = true) {
  const districtIds = useModelStore
    .getState()
    .getAllDistricts()
    .map((district) => district.id);
  const buildingIds = useModelStore
    .getState()
    .getAllBuildings()
    .map((building) => building.id);

  openDistricts(districtIds);
  showDistricts(districtIds);
  showBuildings(buildingIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendDistrictUpdate(districtIds, true);
  }
}
