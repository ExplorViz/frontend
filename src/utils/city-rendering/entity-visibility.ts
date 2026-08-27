import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { EvolutionBuildingVisualState } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-frame-visuals';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { EvolutionModeRenderingConfiguration } from 'explorviz-frontend/src/stores/rendering-service';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { isBuildingHiddenByClosedDistricts } from 'explorviz-frontend/src/utils/city-rendering/district-tree';
import {
  Building,
  Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

export type EntityVisibilityContext = {
  closedDistrictIds: Set<string>;
  hiddenDistrictIds: Set<string>;
  removedDistrictIds: Set<string>;
  hiddenBuildingIds: Set<string>;
  hiddenLanguages: Set<Language>;
  evoConfig: EvolutionModeRenderingConfiguration;
  isDiffMode: boolean;
};

export type EvolutionAnimationSnapshot = {
  totalCount: number;
  buildingVisualStates: Map<string, EvolutionBuildingVisualState>;
};

function computeIsDiffMode(): boolean {
  const selectedCommits = useCommitTreeStateStore.getState()._selectedCommits;
  const currentSelectedRepositoryName =
    useCommitTreeStateStore.getState()._currentSelectedRepositoryName;
  return (
    (selectedCommits.get(currentSelectedRepositoryName)?.length || 0) === 2
  );
}

let cachedAnimationSnapshot: EvolutionAnimationSnapshot | null = null;

/**
 * Used as a default argument throughout the per-building visibility checks, so
 * the snapshot object is reused as long as the underlying store is unchanged.
 */
export function getEvolutionAnimationSnapshot(): EvolutionAnimationSnapshot {
  const { totalCount, buildingVisualStates } =
    useEvolutionAnimationStore.getState();

  if (
    cachedAnimationSnapshot === null ||
    cachedAnimationSnapshot.totalCount !== totalCount ||
    cachedAnimationSnapshot.buildingVisualStates !== buildingVisualStates
  ) {
    cachedAnimationSnapshot = { totalCount, buildingVisualStates };
  }

  return cachedAnimationSnapshot;
}

function buildEntityVisibilityContext(
  visualizationState: Pick<
    EntityVisibilityContext,
    | 'closedDistrictIds'
    | 'hiddenDistrictIds'
    | 'removedDistrictIds'
    | 'hiddenBuildingIds'
    | 'hiddenLanguages'
  >,
  evoConfig: EvolutionModeRenderingConfiguration,
  isDiffMode: boolean
): EntityVisibilityContext {
  return {
    closedDistrictIds: visualizationState.closedDistrictIds,
    hiddenDistrictIds: visualizationState.hiddenDistrictIds,
    removedDistrictIds: visualizationState.removedDistrictIds,
    hiddenBuildingIds: visualizationState.hiddenBuildingIds,
    hiddenLanguages: visualizationState.hiddenLanguages,
    evoConfig,
    isDiffMode,
  };
}

export function getEntityVisibilityContext(): EntityVisibilityContext {
  const visualizationState = useVisualizationStore.getState();
  return buildEntityVisibilityContext(
    visualizationState,
    useVisibilityServiceStore.getState()._evolutionModeRenderingConfiguration,
    computeIsDiffMode()
  );
}

function getBuildingVisualOverlay(
  buildingId: string,
  animation: EvolutionAnimationSnapshot
): EvolutionBuildingVisualState | undefined {
  if (animation.totalCount === 0) {
    return undefined;
  }

  return animation.buildingVisualStates.get(buildingId);
}

export function resolveBuildingForVisibility(
  buildingId: string,
  context: EntityVisibilityContext,
  building?: Building,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): Building | undefined {
  const baseBuilding =
    building ?? useModelStore.getState().getBuilding(buildingId);
  if (!baseBuilding) {
    return undefined;
  }

  const visual = getBuildingVisualOverlay(buildingId, animation);
  if (!visual) {
    return baseBuilding;
  }

  return { ...baseBuilding, ...visual };
}

function isBuildingVisibleExceptClosedDistrictCollapse(
  buildingId: string,
  context: EntityVisibilityContext,
  building?: Building,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): boolean {
  const baseBuilding = resolveBuildingForVisibility(
    buildingId,
    context,
    building,
    animation
  );
  if (!baseBuilding) {
    return false;
  }

  const visual = getBuildingVisualOverlay(buildingId, animation);
  if (
    visual !== undefined ? visual.isPlaceholder : baseBuilding.isPlaceholder
  ) {
    return false;
  }

  const language = normalizeLanguage(baseBuilding.language);

  if (
    context.hiddenBuildingIds.has(buildingId) ||
    context.removedDistrictIds.has(buildingId) ||
    context.hiddenLanguages.has(language)
  ) {
    return false;
  }

  const commitComparison =
    visual?.commitComparison ?? baseBuilding.commitComparison;

  if (context.isDiffMode || context.evoConfig.renderOnlyDifferences) {
    return commitComparison != null;
  }

  if (
    baseBuilding.originOfData === TypeOfAnalysis.Static ||
    baseBuilding.originOfData === TypeOfAnalysis.StaticAndRuntime
  ) {
    return context.evoConfig.renderStatic;
  }

  if (baseBuilding.originOfData === TypeOfAnalysis.Runtime) {
    return context.evoConfig.renderDynamic;
  }

  return true;
}

function districtSubtreeHasRelevantBuilding(
  districtId: string,
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot
): boolean {
  const district = useModelStore.getState().getDistrict(districtId);
  if (!district) {
    return false;
  }

  for (const buildingId of district.buildingIds) {
    if (
      isBuildingVisibleExceptClosedDistrictCollapse(
        buildingId,
        context,
        undefined,
        animation
      )
    ) {
      return true;
    }
  }

  for (const childDistrictId of district.districtIds) {
    if (
      districtSubtreeHasRelevantBuilding(childDistrictId, context, animation)
    ) {
      return true;
    }
  }

  return false;
}

export function isDistrictVisible(
  districtId: string,
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): boolean {
  if (
    context.hiddenDistrictIds.has(districtId) ||
    context.removedDistrictIds.has(districtId)
  ) {
    return false;
  }

  if (!useModelStore.getState().getDistrict(districtId)) {
    return false;
  }

  return districtSubtreeHasRelevantBuilding(districtId, context, animation);
}

export function isCityVisible(
  cityId: string,
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): boolean {
  if (context.removedDistrictIds.has(cityId)) {
    return false;
  }

  const city = useModelStore.getState().getCity(cityId);
  if (!city) {
    return false;
  }

  return city.allContainedBuildingIds.some((buildingId) =>
    isBuildingVisible(buildingId, context, undefined, animation)
  );
}

export function isBuildingVisible(
  buildingId: string,
  context: EntityVisibilityContext,
  building?: Building,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): boolean {
  const baseBuilding =
    building ?? useModelStore.getState().getBuilding(buildingId);
  if (!baseBuilding) {
    return false;
  }

  if (
    isBuildingHiddenByClosedDistricts(
      buildingId,
      context.closedDistrictIds,
      baseBuilding
    )
  ) {
    return false;
  }

  const visual = getBuildingVisualOverlay(buildingId, animation);
  const isPlaceholder =
    visual !== undefined
      ? visual.isPlaceholder
      : baseBuilding.isPlaceholder === true;
  if (isPlaceholder) {
    return false;
  }

  const language = normalizeLanguage(baseBuilding.language);

  if (
    context.hiddenBuildingIds.has(buildingId) ||
    context.removedDistrictIds.has(buildingId) ||
    context.hiddenLanguages.has(language)
  ) {
    return false;
  }

  const commitComparison =
    visual?.commitComparison ?? baseBuilding.commitComparison;

  if (context.isDiffMode || context.evoConfig.renderOnlyDifferences) {
    return commitComparison != null;
  }

  if (
    baseBuilding.originOfData === TypeOfAnalysis.Static ||
    baseBuilding.originOfData === TypeOfAnalysis.StaticAndRuntime
  ) {
    return context.evoConfig.renderStatic;
  }

  if (baseBuilding.originOfData === TypeOfAnalysis.Runtime) {
    return context.evoConfig.renderDynamic;
  }

  return true;
}

export function countVisibleDistrictIds(
  districtIds: readonly string[],
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): number {
  let count = 0;
  for (const districtId of districtIds) {
    if (isDistrictVisible(districtId, context, animation)) {
      count++;
    }
  }
  return count;
}

export function countVisibleBuildingIds(
  buildingIds: readonly string[],
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): number {
  let count = 0;
  for (const buildingId of buildingIds) {
    if (isBuildingVisible(buildingId, context, undefined, animation)) {
      count++;
    }
  }
  return count;
}

export function filterVisibleDistrictIds(
  districtIds: readonly string[],
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): string[] {
  const visibleDistrictIds: string[] = [];
  for (const districtId of districtIds) {
    if (isDistrictVisible(districtId, context, animation)) {
      visibleDistrictIds.push(districtId);
    }
  }
  return visibleDistrictIds;
}

export function filterVisibleBuildingIds(
  buildingIds: readonly string[],
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): string[] {
  const visibleBuildingIds: string[] = [];
  for (const buildingId of buildingIds) {
    if (isBuildingVisible(buildingId, context, undefined, animation)) {
      visibleBuildingIds.push(buildingId);
    }
  }
  return visibleBuildingIds;
}

export function useEntityVisibilityContext(): EntityVisibilityContext {
  const {
    closedDistrictIds,
    hiddenDistrictIds,
    removedDistrictIds,
    hiddenBuildingIds,
    hiddenLanguages,
  } = useVisualizationStore(
    useShallow((state) => ({
      closedDistrictIds: state.closedDistrictIds,
      hiddenDistrictIds: state.hiddenDistrictIds,
      removedDistrictIds: state.removedDistrictIds,
      hiddenBuildingIds: state.hiddenBuildingIds,
      hiddenLanguages: state.hiddenLanguages,
    }))
  );

  const evoConfig = useVisibilityServiceStore(
    (state) => state._evolutionModeRenderingConfiguration
  );

  const selectedCommits = useCommitTreeStateStore(
    (state) => state._selectedCommits
  );
  const currentSelectedRepositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );

  const isDiffMode =
    (selectedCommits.get(currentSelectedRepositoryName)?.length || 0) === 2;

  return useMemo(
    () =>
      buildEntityVisibilityContext(
        {
          closedDistrictIds,
          hiddenDistrictIds,
          removedDistrictIds,
          hiddenBuildingIds,
          hiddenLanguages,
        },
        evoConfig,
        isDiffMode
      ),
    [
      closedDistrictIds,
      hiddenDistrictIds,
      removedDistrictIds,
      hiddenBuildingIds,
      hiddenLanguages,
      evoConfig,
      isDiffMode,
    ]
  );
}
