import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import EvolutionAnimationPanel from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-panel';
import EvolutionPlaybackControls from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-playback-controls';

import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';

export default function EvolutionAnimationButton() {
  const [showPanel, setShowPanel] = useState(false);

  const hasFrames = useEvolutionAnimationStore(
    (state) => state.frames.length > 0
  );

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="ms-2"
        onClick={() => setShowPanel((prev) => !prev)}
      >
        Repo Evolution
      </Button>

      {showPanel && (
        <EvolutionAnimationPanel
          onClose={() => setShowPanel(false)}
        />
      )}
      {/*Show playback controls once frames are loaded*/}
      {hasFrames && <EvolutionPlaybackControls />}
    </>
  );
}









