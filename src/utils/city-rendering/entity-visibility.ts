import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { EvolutionBuildingVisualState } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-frame-visuals';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { EvolutionModeRenderingConfiguration } from 'explorviz-frontend/src/stores/rendering-service';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  Building,
  Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

export type EntityVisibilityContext = {
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

export function getEvolutionAnimationSnapshot(): EvolutionAnimationSnapshot {
  const { totalCount, buildingVisualStates } =
    useEvolutionAnimationStore.getState();
  return { totalCount, buildingVisualStates };
}

function buildEntityVisibilityContext(
  visualizationState: Pick<
    EntityVisibilityContext,
    | 'hiddenDistrictIds'
    | 'removedDistrictIds'
    | 'hiddenBuildingIds'
    | 'hiddenLanguages'
  >,
  evoConfig: EvolutionModeRenderingConfiguration,
  isDiffMode: boolean
): EntityVisibilityContext {
  return {
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

export function isDistrictVisible(
  districtId: string,
  context: Pick<
    EntityVisibilityContext,
    'hiddenDistrictIds' | 'removedDistrictIds'
  >
): boolean {
  return (
    !context.hiddenDistrictIds.has(districtId) &&
    !context.removedDistrictIds.has(districtId)
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

  const visual = getBuildingVisualOverlay(buildingId, animation);
  if (visual?.isPlaceholder || baseBuilding.isPlaceholder) {
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
  context: Pick<
    EntityVisibilityContext,
    'hiddenDistrictIds' | 'removedDistrictIds'
  >
): number {
  let count = 0;
  for (const districtId of districtIds) {
    if (isDistrictVisible(districtId, context)) {
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
  context: Pick<
    EntityVisibilityContext,
    'hiddenDistrictIds' | 'removedDistrictIds'
  >
): string[] {
  const visibleDistrictIds: string[] = [];
  for (const districtId of districtIds) {
    if (isDistrictVisible(districtId, context)) {
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
    hiddenDistrictIds,
    removedDistrictIds,
    hiddenBuildingIds,
    hiddenLanguages,
  } = useVisualizationStore(
    useShallow((state) => ({
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
          hiddenDistrictIds,
          removedDistrictIds,
          hiddenBuildingIds,
          hiddenLanguages,
        },
        evoConfig,
        isDiffMode
      ),
    [
      hiddenDistrictIds,
      removedDistrictIds,
      hiddenBuildingIds,
      hiddenLanguages,
      evoConfig,
      isDiffMode,
    ]
  );
}
