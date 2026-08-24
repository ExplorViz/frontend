import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { buildMergedFlatLandscape } from './evolution-frame-visuals';

export const EVOLUTION_ANIMATION_RENDER_CONFIG = {
  renderDynamic: false,
  renderStatic: true,
  renderOnlyDifferences: true,
  buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
};

export function applyEvolutionRenderingConfig() {
  useRenderingServiceStore
    .getState()
    .setAnalysisModeFromEvolutionRenderingConfig(
      EVOLUTION_ANIMATION_RENDER_CONFIG
    );
  useVisibilityServiceStore
    .getState()
    .applyEvolutionModeRenderingConfiguration(
      EVOLUTION_ANIMATION_RENDER_CONFIG
    );
}

export function triggerEvolutionLandscapeRendering(
  flatLandscape: FlatLandscape
) {
  useRenderingServiceStore
    .getState()
    .triggerRenderingForGivenLandscapeData(flatLandscape, [], {
      communications: [],
      fromUnixNano: 0n,
      toUnixNano: 0n,
      metrics: {},
    });
}

export function applySkeletonLayout(stableFrame?: FlatLandscape | null) {
  const frame =
    stableFrame ?? useEvolutionAnimationStore.getState().stableFrame;
  if (!frame) return;

  applyEvolutionRenderingConfig();
  triggerEvolutionLandscapeRendering(frame);
}

export function applyAnimationFrameLayout(): boolean{
  const store = useEvolutionAnimationStore.getState();
  const mergedFrame = buildMergedFlatLandscape(store);
  if (!mergedFrame) return false;

  applyEvolutionRenderingConfig();
  triggerEvolutionLandscapeRendering(mergedFrame);
  store.actions.reapplyCurrentFrameVisuals();
  return true;
}
