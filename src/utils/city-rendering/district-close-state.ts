import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';

const LEGACY_CLOSED_DISTRICT_KEY_SEP = '\u001f';

export function isDistrictClosed(
  districtId: string,
  closedDistrictIds: Set<string>
): boolean {
  return closedDistrictIds.has(districtId);
}

export function isDistrictOpen(
  districtId: string,
  closedDistrictIds: Set<string>
): boolean {
  return !closedDistrictIds.has(districtId);
}

export function serializeClosedDistricts(
  closedDistrictIds: Set<string>
): string[] {
  return [...closedDistrictIds].sort();
}

/** Accepts plain district IDs and legacy city+district composite keys from older sessions. */
export function deserializeClosedDistricts(keys: string[]): Set<string> {
  return new Set(keys.map(normalizeClosedDistrictId));
}

function normalizeClosedDistrictId(key: string): string {
  const sepIndex = key.indexOf(LEGACY_CLOSED_DISTRICT_KEY_SEP);
  if (sepIndex === -1) {
    return key;
  }

  return key.slice(sepIndex + LEGACY_CLOSED_DISTRICT_KEY_SEP.length);
}

export function cityHasClosedDistricts(
  cityId: string,
  closedDistrictIds: Set<string>
): boolean {
  const city = useModelStore.getState().getCity(cityId);
  if (!city) {
    return false;
  }

  return city.allContainedDistrictIds.some((districtId) =>
    closedDistrictIds.has(districtId)
  );
}
