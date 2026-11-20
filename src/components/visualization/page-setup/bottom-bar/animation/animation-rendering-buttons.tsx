import EvolutionAnimationPanel from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-panel';
import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { restoreLayoutBeforeAnimation } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-rendering-setup';
import EvolutionPlaybackControls from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-playback-controls';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';

const NORMAL_RENDER_CONFIG = {
  renderDynamic: false,
  renderStatic: true,
  renderOnlyDifferences: false,
  buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
};

interface EvolutionAnimationButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline-secondary';
  size?: 'sm' | 'lg';
}

export default function EvolutionAnimationButton({
  className = 'bottom-bar-chart-button ms-2',
  variant,
  size,
}: EvolutionAnimationButtonProps = {}) {
  const [showPanel, setShowPanel] = useState(false);
  const hasFrames = useEvolutionAnimationStore((state) => state.totalCount > 0);
  const landscapeToken = useLandscapeTokenStore((s) => s.token?.value);

  const closePanel = () => {
    setShowPanel(false);
    // Without a running animation, closing the panel leaves the evolution animation.
    if (useEvolutionAnimationStore.getState().totalCount === 0) {
      restoreLayoutBeforeAnimation();
    }
  };

  const togglePanel = () => {
    if (showPanel) {
      closePanel();
    } else {
      setShowPanel(true);
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', restoreLayoutBeforeAnimation);

    return () => {
      window.removeEventListener('beforeunload', restoreLayoutBeforeAnimation);
      useEvolutionAnimationStore.getState().actions.reset();
      setShowPanel(false);
      useRenderingServiceStore.getState().setAnalysisModeFromEvolutionRenderingConfig(NORMAL_RENDER_CONFIG);
      useVisibilityServiceStore.getState().applyEvolutionModeRenderingConfiguration(NORMAL_RENDER_CONFIG);
      restoreLayoutBeforeAnimation();
    };
  }, [landscapeToken]);

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={togglePanel}>
        Evolution Animation
      </Button>

      {showPanel && <EvolutionAnimationPanel onClose={closePanel} />}
      {/*Show playback controls once frames are loaded*/}
      {(showPanel || hasFrames) && <EvolutionPlaybackControls />}
    </>
  );
}
