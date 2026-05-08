import {
  Building,
  Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

type BuildingVisibilityArgs = {
  buildingId: string;
  building?: Building;
  hiddenBuildingIds: Set<string>;
  removedDistrictIds: Set<string>;
  hiddenLanguages: Set<Language>;
};

export function isBuildingVisible({
  buildingId,
  building,
  hiddenBuildingIds,
  removedDistrictIds,
  hiddenLanguages,
}: BuildingVisibilityArgs): boolean {
  const language = building?.language ?? 'LANGUAGE_UNSPECIFIED';

  return (
    !hiddenBuildingIds.has(buildingId) &&
    !removedDistrictIds.has(buildingId) &&
    !hiddenLanguages.has(language)
  );
}
