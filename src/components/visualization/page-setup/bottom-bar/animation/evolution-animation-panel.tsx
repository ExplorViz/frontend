import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionAnimationFetchServiceStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service';
import { useEvolutionAnimationStore, WINDOW_SIZE } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';

export default function EvolutionAnimationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { layoutMode, timeMode, speedMs, granularity } = useEvolutionAnimationStore(
    useShallow((state) => ({
      layoutMode: state.layoutMode,
      timeMode: state.timeMode,
      speedMs: state.speedMs,
      granularity: state.granularity,
    }))
  );
  const { setLayoutMode, setTimeMode, setSpeed } =
    useEvolutionAnimationStore.getState().actions;
  const [isLoading, setIsLoading] = useState(false);

  const repositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );

  const fetchWindow = useEvolutionAnimationFetchServiceStore(
    (state) => state.fetchAnimationWindow
  );
  const fetchSkeleton = useEvolutionAnimationFetchServiceStore(
    (state) => state.fetchAnimationSkeleton
  );

    //Sync when layout is toggeled
  useEffect(() => {

    useUserSettingsStore
      .getState()
      .updateSetting(
        'buildingLayoutAlgorithm',
        layoutMode === 'spiral' ? 'spiral' : 'None'
      );
  }, [layoutMode]);

 //On mount
  useEffect(() => {
    if (!repositoryName) return;

    useCommitTreeStateStore.getState().resetSelectedCommits();

    let cancelled = false;
    setIsLoading(true);
    Promise.all([fetchSkeleton(repositoryName), fetchWindow(repositoryName,0,0)])
      .then(([skeleton, animationWindow]) => {
        if (cancelled) return;
        const actions = useEvolutionAnimationStore.getState().actions;
        actions.setSkeleton(skeleton);
        actions.setTotalCount(animationWindow.totalCount);

        useRenderingServiceStore
          .getState()
          .setAnalysisModeFromEvolutionRenderingConfig({
            renderDynamic: false,
            renderStatic: true,
            renderOnlyDifferences: true,
            buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
          });
        useVisibilityServiceStore
          .getState()
          .applyEvolutionModeRenderingConfiguration({
            renderDynamic: false,
            renderStatic: true,
            renderOnlyDifferences: true,
            buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
          });
      })
      .catch((e) => console.error('Failed to fetch animation frames:', e))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  },[]);


  const handleStart = async () => {
    if (!repositoryName) return;
    setIsLoading(true);
    try {
      const granul = useEvolutionAnimationStore.getState().granularity;
      const [skeleton, firstWindow] = await Promise.all([
        fetchSkeleton(repositoryName),
        fetchWindow(repositoryName, 0, WINDOW_SIZE, granul),
      ]);
      const actions = useEvolutionAnimationStore.getState().actions;
      actions.setSkeleton(skeleton);
      actions.setTotalCount(firstWindow.totalCount);
      actions.addFrames(firstWindow.frames);
      actions.markBlockRequested(0);
      useRenderingServiceStore
        .getState()
        .setAnalysisModeFromEvolutionRenderingConfig({
          renderDynamic: false,
          renderStatic: true,
          renderOnlyDifferences: true,
          buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
        });
      useVisibilityServiceStore
        .getState()
        .applyEvolutionModeRenderingConfiguration({
          renderDynamic: false,
          renderStatic: true,
          renderOnlyDifferences: true,
          buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
        });
      useEvolutionAnimationStore.getState().actions.setSpeed(speedMs);
      useEvolutionAnimationStore.getState().actions.play(); // auto-start
    } catch (e) {
      console.error('Failed to fetch animation frames:', e);
    } finally {
      setIsLoading(false);
    }
  };
    const onGranularityChange = async (g: number) => {
      if (!repositoryName) return;
      const actions = useEvolutionAnimationStore.getState().actions;
      actions.setGranularity(g);
      const win = await fetchWindow(repositoryName, 0, WINDOW_SIZE, g);
      actions.setTotalCount(win.totalCount);
      actions.addFrames(win.frames);
      actions.markBlockRequested(0);
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
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label style={{ fontSize: '12px', color: '#aaa' }}>
          Commits pro Frame: {granularity}
        </Form.Label>
        <Form.Control
          type="number"
          min={1}
          size="sm"
          value={granularity}
          onChange={(e) =>
            onGranularityChange(Math.max(1, Number(e.target.value)))
          }
        />
      </Form.Group>

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
