import { EvolutionModeRenderingConfiguration } from 'explorviz-frontend/src/stores/rendering-service';
import {
  Building,
  Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';

type BuildingVisibilityArgs = {
  buildingId: string;
  building?: Building;
  hiddenBuildingIds: Set<string>;
  removedDistrictIds: Set<string>;
  hiddenLanguages: Set<Language>;
  evoConfig: EvolutionModeRenderingConfiguration;
  isDiffMode: boolean;
};

export function isBuildingVisible({
  buildingId,
  building,
  hiddenBuildingIds,
  removedDistrictIds,
  hiddenLanguages,
  evoConfig,
  isDiffMode,
}: BuildingVisibilityArgs): boolean {
  if (!building) {
    return false;
  }

  const language = normalizeLanguage(building.language);

  if (
    hiddenBuildingIds.has(buildingId) ||
    removedDistrictIds.has(buildingId) ||
    hiddenLanguages.has(language)
  ) {
    return false;
  }

  if (isDiffMode || evoConfig.renderOnlyDifferences) {
    return !!building.commitComparison;
  }

  if (
    building.originOfData === TypeOfAnalysis.Static ||
    building.originOfData === TypeOfAnalysis.StaticAndRuntime
  ) {
    return evoConfig.renderStatic;
  }

  if (building.originOfData === TypeOfAnalysis.Runtime) {
    return evoConfig.renderDynamic;
  }

  return true;
}
