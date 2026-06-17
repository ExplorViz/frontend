import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionAnimationFetchServiceStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service';
import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service.ts';


export default function EvolutionAnimationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [layoutMode, setLayoutMode] = useState<'city' | 'spiral'>('spiral');
  const [timeMode, setTimeMode] = useState<'commit' | 'time'>('commit');
  const [speedMs, setSpeedMs] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [frames, setFrames] = useState<FlatLandscape[]>([]);

  const repositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );

  const fetchFrames = useEvolutionAnimationFetchServiceStore(
    (state) => state.fetchAnimationFramesForRepository
  );

  const handleStart = async () => {
    if (!repositoryName) return;
    setIsLoading(true);
    try {
      const result = await fetchFrames(repositoryName);
      useEvolutionAnimationStore.getState().actions.setFrames(result);
      useRenderingServiceStore
        .getState()
        .setAnalysisModeFromEvolutionRenderingConfig({
          renderDynamic: false,
          renderStatic: true,
          renderOnlyDifferences: true,
          removeUnchangedFromLayout: false,
        });
      useVisibilityServiceStore
        .getState()
        .applyEvolutionModeRenderingConfiguration({
          renderDynamic: false,
          renderStatic: true,
          renderOnlyDifferences: true,
          removeUnchangedFromLayout: false,
        });
      useEvolutionAnimationStore.getState().actions.setSpeed(speedMs);
      useEvolutionAnimationStore.getState().actions.play(); // 🆕 auto-start
      console.log(`Loaded ${result.length} frames for ${repositoryName}`);
      onClose(); // 🆕 close the panel
    } catch (e) {
      console.error('Failed to fetch animation frames:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '150px',
        left: '20px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '16px',
        width: '220px',
        zIndex: 9999,
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
          Repo Evolution
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <Form.Group className="mb-3">
        <Form.Label style={{ fontSize: '12px', color: '#aaa' }}>
          Layout
        </Form.Label>
        <div>
          <Form.Check
            inline
            type="radio"
            label="Spiral"
            name="layoutMode"
            checked={layoutMode === 'spiral'}
            onChange={() => setLayoutMode('spiral')}
          />
          <Form.Check
            inline
            type="radio"
            label="City"
            name="layoutMode"
            checked={layoutMode === 'city'}
            onChange={() => setLayoutMode('city')}
          />
        </div>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label style={{ fontSize: '12px', color: '#aaa' }}>
          Navigation Mode
        </Form.Label>
        <div>
          <Form.Check
            inline
            type="radio"
            label="Commit"
            name="timeMode"
            checked={timeMode === 'commit'}
            onChange={() => setTimeMode('commit')}
          />
          <Form.Check
            inline
            type="radio"
            label="Time"
            name="timeMode"
            checked={timeMode === 'time'}
            onChange={() => setTimeMode('time')}
          />
        </div>
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label style={{ fontSize: '12px', color: '#aaa' }}>
          Speed: {speedMs}ms
        </Form.Label>
        <Form.Range
          min={200}
          max={3000}
          step={100}
          value={speedMs}
          onChange={(e) => setSpeedMs(Number(e.target.value))}
        />
      </Form.Group>

      {frames.length > 0 && (
        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>
          {frames.length} frames loaded
        </p>
      )}

      <Button
        variant="primary"
        size="sm"
        className="w-100"
        disabled={isLoading || !repositoryName}
        onClick={handleStart}
      >
        {isLoading ? 'Loading...' : 'Start Animation'}
      </Button>
    </div>,
    document.body
  );
}
