import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import {
  countVisibleBuildingIds,
  countVisibleDistrictIds,
  EntityVisibilityContext,
  EvolutionAnimationSnapshot,
  getEvolutionAnimationSnapshot,
  useEntityVisibilityContext,
} from 'explorviz-frontend/src/utils/city-rendering/entity-visibility';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface VisibleEntityCountsInput {
  directDistrictIds: string[];
  containedDistrictIds: string[];
  directBuildingIds: string[];
  containedBuildingIds: string[];
}

interface VisibleEntityCounts {
  directDistrictCount: number;
  containedDistrictCount: number;
  directBuildingCount: number;
  containedBuildingCount: number;
}

export function useVisibleEntityCounts({
  directDistrictIds,
  containedDistrictIds,
  directBuildingIds,
  containedBuildingIds,
}: VisibleEntityCountsInput): VisibleEntityCounts {
  const visibilityContext = useEntityVisibilityContext();
  const evolutionAnimation = useEvolutionAnimationStore(
    useShallow((state) => ({
      totalCount: state.totalCount,
      buildingVisualStates: state.buildingVisualStates,
    }))
  );

  return useMemo(() => {
    return countVisibleEntities(
      {
        directDistrictIds,
        containedDistrictIds,
        directBuildingIds,
        containedBuildingIds,
      },
      visibilityContext,
      evolutionAnimation
    );
  }, [
    directDistrictIds,
    containedDistrictIds,
    directBuildingIds,
    containedBuildingIds,
    visibilityContext,
    evolutionAnimation,
  ]);
}

export function countVisibleEntities(
  {
    directDistrictIds,
    containedDistrictIds,
    directBuildingIds,
    containedBuildingIds,
  }: VisibleEntityCountsInput,
  context: EntityVisibilityContext,
  animation: EvolutionAnimationSnapshot = getEvolutionAnimationSnapshot()
): VisibleEntityCounts {
  return {
    directDistrictCount: countVisibleDistrictIds(directDistrictIds, context),
    containedDistrictCount: countVisibleDistrictIds(
      containedDistrictIds,
      context
    ),
    directBuildingCount: countVisibleBuildingIds(
      directBuildingIds,
      context,
      animation
    ),
    containedBuildingCount: countVisibleBuildingIds(
      containedBuildingIds,
      context,
      animation
    ),
  };
}
