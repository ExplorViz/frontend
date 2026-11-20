import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { invalidateLayoutCache } from 'explorviz-frontend/src/utils/layout/elk-layouter';

export const EVOLUTION_ANIMATION_RENDER_CONFIG = {
  renderDynamic: false,
  renderStatic: true,
  renderOnlyDifferences: true,
  buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
};

const NORMAL_RENDER_CONFIG = {
  renderDynamic: false,
  renderStatic: true,
  renderOnlyDifferences: false,
  buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
};

// Building layout that was active before the evolution animation switched it.
let layoutBeforeAnimation: string | null = null;

export function rememberLayoutBeforeAnimation() {
  if (layoutBeforeAnimation !== null) return;
  layoutBeforeAnimation = useUserSettingsStore.getState().visualizationSettings.buildingLayoutAlgorithm.value;
}

export function restoreLayoutBeforeAnimation() {
  if (layoutBeforeAnimation === null) return;
  useUserSettingsStore.getState().updateSetting('buildingLayoutAlgorithm', layoutBeforeAnimation);
  layoutBeforeAnimation = null;
}

function getCurrentFrameCommitHash(): string | null {
  const { deltaMode, deltaFrames, loadedFrames, currentFrameIndex } = useEvolutionAnimationStore.getState();
  const frame = deltaMode ? deltaFrames.get(currentFrameIndex) : loadedFrames.get(currentFrameIndex);
  return frame?.commitHash ?? null;
}

/**
 * Leaves the evolution animation: restores the building layout that was active
 * before the animation and renders the commit of the last displayed frame.
 */
export function exitEvolutionAnimation() {
  const commitHash = useEvolutionAnimationStore.getState().totalCount > 0 ? getCurrentFrameCommitHash() : null;

  useEvolutionAnimationStore.getState().actions.reset();
  restoreLayoutBeforeAnimation();
  invalidateLayoutCache();

  const commitSelected =
    commitHash !== null &&
    useCommitTreeStateStore
      .getState()
      .setDefaultState(useEvolutionDataRepositoryStore.getState()._repoNameCommitTreeMap, commitHash, null);

  if (commitSelected) {
    useRenderingServiceStore.getState().triggerRenderingForSelectedCommits();
  } else {
    useRenderingServiceStore.getState().setAnalysisModeFromEvolutionRenderingConfig(NORMAL_RENDER_CONFIG);
    useVisibilityServiceStore.getState().applyEvolutionModeRenderingConfiguration(NORMAL_RENDER_CONFIG);
  }
}

export function applyEvolutionRenderingConfig() {
  useRenderingServiceStore.getState().setAnalysisModeFromEvolutionRenderingConfig(EVOLUTION_ANIMATION_RENDER_CONFIG);
  useVisibilityServiceStore.getState().applyEvolutionModeRenderingConfiguration(EVOLUTION_ANIMATION_RENDER_CONFIG);
}

export function triggerEvolutionLandscapeRendering(flatLandscape: FlatLandscape) {
  useRenderingServiceStore.getState().triggerRenderingForGivenLandscapeData(flatLandscape, [], {
    communications: [],
    fromUnixNano: 0n,
    toUnixNano: 0n,
    metrics: {},
  });
}

export function applySkeletonLayout(stableFrame?: FlatLandscape | null) {
  const frame = stableFrame ?? useEvolutionAnimationStore.getState().stableFrame;
  if (!frame) return;

  invalidateLayoutCache();
  applyEvolutionRenderingConfig();
  triggerEvolutionLandscapeRendering(frame);
}

export function applyAnimationFrameLayout(): boolean {
  const store = useEvolutionAnimationStore.getState();
  if (!store.stableFrame || store.totalCount === 0) {
    return false;
  }

  store.actions.reapplyCurrentFrameVisuals();
  return true;
}
