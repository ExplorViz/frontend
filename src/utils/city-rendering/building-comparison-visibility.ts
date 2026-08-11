import { CommitComparison } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export type BuildingComparisonVisibility = Record<CommitComparison, boolean>;

export const BUILDING_COMPARISON_CATEGORIES: readonly {
  key: CommitComparison;
  label: string;
}[] = [
  { key: 'UNCHANGED', label: 'Unchanged' },
  { key: 'ADDED', label: 'Added' },
  { key: 'MODIFIED', label: 'Modified' },
  { key: 'REMOVED', label: 'Removed' },
] as const;

export const ALL_BUILDING_COMPARISONS_VISIBLE: BuildingComparisonVisibility = {
  UNCHANGED: true,
  ADDED: true,
  MODIFIED: true,
  REMOVED: true,
};

export function isBuildingComparisonFilterActive(
  visibility: BuildingComparisonVisibility
): boolean {
  return BUILDING_COMPARISON_CATEGORIES.some(({ key }) => !visibility[key]);
}

export function setBuildingComparisonVisibility(
  visibility: BuildingComparisonVisibility,
  comparison: CommitComparison,
  visible: boolean
): BuildingComparisonVisibility {
  if (visibility[comparison] === visible) {
    return visibility;
  }

  return { ...visibility, [comparison]: visible };
}
