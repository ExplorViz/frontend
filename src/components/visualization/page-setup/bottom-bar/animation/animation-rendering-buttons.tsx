import { useState, useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import EvolutionAnimationPanel from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-panel';
import EvolutionPlaybackControls from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-playback-controls';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';

const NORMAL_RENDER_CONFIG = {
  renderDynamic: false,
  renderStatic: true,
  renderOnlyDifferences: false,
  buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
};

export default function EvolutionAnimationButton() {
  const [showPanel, setShowPanel] = useState(false);
  const hasFrames = useEvolutionAnimationStore((state) => state.totalCount > 0);
  const landscapeToken = useLandscapeTokenStore((s) => s.token?.value);


  const overriddenLayoutRef = useRef<string | null>(null);

  const togglePanel = () => {
    if (!showPanel && overriddenLayoutRef.current === null) {
      overriddenLayoutRef.current =
        useUserSettingsStore.getState().visualizationSettings.buildingLayoutAlgorithm.value;
    }
    setShowPanel((prev) => !prev);
  };
  useEffect(() => {
    const restoreLayout = () => {
      if (overriddenLayoutRef.current === null) return;
      useUserSettingsStore
        .getState()
        .updateSetting('buildingLayoutAlgorithm', overriddenLayoutRef.current);
      overriddenLayoutRef.current = null;
    };
    window.addEventListener('beforeunload', restoreLayout);

    return () => {
      window.removeEventListener('beforeunload', restoreLayout);
      useEvolutionAnimationStore.getState().actions.reset();
      setShowPanel(false);
      useRenderingServiceStore
        .getState()
        .setAnalysisModeFromEvolutionRenderingConfig(NORMAL_RENDER_CONFIG);
      useVisibilityServiceStore
        .getState()
        .applyEvolutionModeRenderingConfiguration(NORMAL_RENDER_CONFIG);
      restoreLayout();
    };
  }, [landscapeToken]);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="ms-2"
        onClick={togglePanel}
      >
        Repo Evolution
      </Button>

      {showPanel && (
        <EvolutionAnimationPanel onClose={() => setShowPanel(false)} />
      )}
      {/*Show playback controls once frames are loaded*/}
      {hasFrames && <EvolutionPlaybackControls />}
    </>
  );
}









