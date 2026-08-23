import { useEvolutionAnimationFetchServiceStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service';
import {
  useEvolutionAnimationStore,
  WINDOW_SIZE,
} from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import {
  applyEvolutionRenderingConfig,
  applySkeletonLayout,
} from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-rendering-setup';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  BuildingMetricMapping,
  SELECTED_BUILDING_METRIC_OPTIONS,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useEffect, useCallback, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { ChevronUpIcon, XIcon } from '@primer/octicons-react';
import {
  useFloatingPanel,
  FloatingPanelPosition,
} from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/floating-panel.ts';

const UNITS = [
  { label: 'Hour', ms: 3600000 },
  { label: 'Day', ms: 86400000 },
  { label: 'Week', ms: 604800000 },
  { label: 'Month', ms: 2592000000 },
];

export default function EvolutionAnimationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    layoutMode,
    timeMode,
    speedMs,
    granularity,
    bucketSize,
    agingEnabled,
    agingCommits,
    agingMs,
    deltaMode,
    rangeFrom,
    rangeTo
  } = useEvolutionAnimationStore(
    useShallow((state) => ({
      layoutMode: state.layoutMode,
      timeMode: state.timeMode,
      speedMs: state.speedMs,
      granularity: state.granularity,
      bucketSize: state.bucketSize,
      agingEnabled: state.agingEnabled,
      agingCommits: state.agingCommits,
      agingMs: state.agingMs,
      deltaMode: state.deltaMode,
      rangeFrom: state.rangeFrom,
      rangeTo: state.rangeTo,
    }))
  );
  const {
    setLayoutMode,
    setTimeMode,
    setSpeed,
    setGranularity,
    setBucketSize,
    setAgingEnabled,
    setAgingCommits,
    setAgingMs,
    setDeltaMode,
    setRange,
  } = useEvolutionAnimationStore.getState().actions;
  const [isLoading, setIsLoading] = useState(false);
  const anchorAtToolsButton = useCallback((): FloatingPanelPosition | null => {
    const toolSidebar = document.getElementById('toolsSidebarButtonContainer');
    if (toolSidebar) {
      const rect = toolSidebar.getBoundingClientRect();
      return { left: rect.right + 8, top: rect.top };
    }
    const tools = document.querySelector('.sidebar-tools-button');
    if (tools) {
      const rect = tools.getBoundingClientRect();
      return { left: rect.left, top: rect.bottom + 8 };
    }
    return null;
  }, []);

  const { ref, isMinimized, toggleMinimized, onDragStart } = useFloatingPanel(
    anchorAtToolsButton,
    8
  );


  const [timeCount, setTimeCount] = useState(1);
  const [timeUnit, setTimeUnit] = useState(86400000);
  const [agingTimeCount, setAgingTimeCount] = useState(
    Math.max(1, Math.round(agingMs / 2592000000))
  );
  const [agingTimeUnit, setAgingTimeUnit] = useState(2592000000);
  const heightMetric = useUserSettingsStore(
    (s) => s.visualizationSettings.buildingHeightMetric.value
  );
  const metricMapping = useUserSettingsStore(
    (s) => s.visualizationSettings.buildingMetricMapping.value
  );
  const metricBuckets = useUserSettingsStore(
    (s) => s.visualizationSettings.buildingMetricBuckets.value
  );
  const updateSetting = useUserSettingsStore((s) => s.updateSetting);

  const repositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );
  const hasFrames = useEvolutionAnimationStore(
    (state) => state.totalCount > 0
  );
  const fetchWindow = useEvolutionAnimationFetchServiceStore(
    (state) => state.fetchAnimationWindow
  );
  const fetchSkeleton = useEvolutionAnimationFetchServiceStore(
    (state) => state.fetchAnimationSkeleton
  );
  const fetchDeltaWindow = useEvolutionAnimationFetchServiceStore(
    (state) => state.fetchAnimationDeltaWindow
  );

  //Sync when layout is toggeled
  useEffect(() => {
    useUserSettingsStore
      .getState()
      .updateSetting(
        'buildingLayoutAlgorithm',
        layoutMode === 'spiral' ? 'spiral' : 'None'
      );
    applySkeletonLayout();
  }, [layoutMode]);

  //On mount
  /*
  useEffect(() => {
    if (!repositoryName) return;

    useCommitTreeStateStore.getState().resetSelectedCommits();

    let cancelled = false;
    setIsLoading(true);
    const mountState = useEvolutionAnimationStore.getState();
    fetchSkeleton(repositoryName, mountState.rangeFrom, mountState.rangeTo)
      .then((skeleton) => {
        if (cancelled) return;
        useEvolutionAnimationStore.getState().actions.setSkeleton(skeleton);
      })
      .catch((e) => console.error('Failed to fetch animation frames:', e))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);
  },[]);*/
  useEffect(() => {
    if (!repositoryName) return;
    useCommitTreeStateStore.getState().resetSelectedCommits();
  }, []);

  const handleStart = async () => {
    if (!repositoryName) return;
    setIsLoading(true);
    try {
      useEvolutionAnimationStore.getState().actions.restart();
      const store = useEvolutionAnimationStore.getState();
      const actions = store.actions;
      if (!store.stableFrame) {
        const skeleton = await fetchSkeleton(
          repositoryName,
          store.rangeFrom,
          store.rangeTo
        );
        actions.setSkeleton(skeleton);
        applySkeletonLayout(skeleton.landscape);
      }

      if (store.deltaMode) {
        const firstWindow = await fetchDeltaWindow(
          repositoryName,
          0,
          WINDOW_SIZE,
          store.granularity,
          store.timeMode,
          store.bucketSize,
          store.loadedAgingWindow,
          store.rangeFrom,
          store.rangeTo
        );
        actions.setTotalCount(firstWindow.totalCount);
        actions.addDeltaFrames(firstWindow.frames);
      } else {
        const firstWindow = await fetchWindow(
          repositoryName,
          0,
          WINDOW_SIZE,
          store.granularity,
          store.timeMode,
          store.bucketSize
        );
        actions.setTotalCount(firstWindow.totalCount);
        actions.addFrames(firstWindow.frames);
      }
      actions.markBlockRequested(0);
      applyEvolutionRenderingConfig();
      useEvolutionAnimationStore.getState().actions.setSpeed(speedMs);
      useEvolutionAnimationStore.getState().actions.play(); // auto-start
    } catch (e) {
      console.error('Failed to fetch animation frames:', e);
    } finally {
      setIsLoading(false);
    }
  };
  const reloadAnimation = async () => {
    if (!repositoryName) return;
    const store = useEvolutionAnimationStore.getState();
    if (!store.stableFrame) return;
    if (store.deltaMode) {
      const win = await fetchDeltaWindow(
        repositoryName,
        0,
        WINDOW_SIZE,
        store.granularity,
        store.timeMode,
        store.bucketSize,
        store.loadedAgingWindow,
        store.rangeFrom,
        store.rangeTo
      );
      store.actions.setTotalCount(win.totalCount);
      store.actions.addDeltaFrames(win.frames);
    } else {
      const win = await fetchWindow(
        repositoryName,
        0,
        WINDOW_SIZE,
        store.granularity,
        store.timeMode,
        store.bucketSize
      );
      store.actions.setTotalCount(win.totalCount);
      store.actions.addFrames(win.frames);
    }
    store.actions.markBlockRequested(0);
  };
  const applyTimeBucket = (count: number, unitMs: number) => {
    setBucketSize(Math.max(1, count * unitMs));
    void reloadAnimation();
  };

  return createPortal(
    <div
      className={`evolution-animation-panel${isMinimized ? ' evolution-animation-panel--minimized' : ''}`}
      ref={ref}
    >
      <div
        className="evolution-animation-panel__header"
        onPointerDown={onDragStart}
      >
        <span className="fw-bold">Repo Evolution</span>
        <div className="evolution-animation-panel__header-actions">
          <button
            type="button"
            className="btn evolution-animation-panel__icon-button"
            title={isMinimized ? 'Maximize' : 'Minimize'}
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleMinimized}
          >
            <ChevronUpIcon
              size="small"
              className={isMinimized ? '' : 'hide-bottom-bar-icon-down'}
            />
          </button>
          <button
            type="button"
            className="btn evolution-animation-panel__icon-button"
            aria-label="Close"
            title="Close"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
          >
            <XIcon size="small" verticalAlign="middle" />
          </button>
        </div>
      </div>
      <Tabs defaultActiveKey="scope" className="mb-3" fill>
        <Tab eventKey="scope" title="Scope">
          <Form.Group className="mb-3">
            <Form.Label> Time frame (empty = whole history)</Form.Label>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <Form.Control
                type="date"
                size="sm"
                value={
                  rangeFrom
                    ? new Date(rangeFrom).toISOString().slice(0, 10)
                    : ''
                }
                onChange={(e) =>
                  setRange(
                    e.target.value
                      ? Date.parse(e.target.value + 'T00:00:00Z')
                      : 0,
                    rangeTo
                  )
                }
              />
              <Form.Control
                type="date"
                size="sm"
                value={
                  rangeTo ? new Date(rangeTo).toISOString().slice(0, 10) : ''
                }
                onChange={(e) =>
                  setRange(
                    rangeFrom,
                    e.target.value
                      ? Date.parse(e.target.value + 'T23:59:59Z')
                      : 0
                  )
                }
              />
            </div>
          </Form.Group>
        </Tab>
        <Tab eventKey="animation" title="Animation">
          <Form.Group className="mb-3">
            <Form.Label>Layout</Form.Label>
            <div style={{ display: 'flex' }}>
              <Form.Check
                style={{ flex: 1 }}
                type="radio"
                label="Spiral"
                name="layoutMode"
                checked={layoutMode === 'spiral'}
                onChange={() => setLayoutMode('spiral')}
              />
              <Form.Check
                style={{ flex: 1 }}
                type="radio"
                label="City"
                name="layoutMode"
                checked={layoutMode === 'city'}
                onChange={() => setLayoutMode('city')}
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Navigation Mode</Form.Label>
            <div style={{ display: 'flex' }}>
              <Form.Check
                style={{ flex: 1 }}
                type="radio"
                label="Commit"
                name="timeMode"
                checked={timeMode === 'commit'}
                onChange={() => {
                  setTimeMode('commit');
                  reloadAnimation();
                }}
              />
              <Form.Check
                style={{ flex: 1 }}
                type="radio"
                label="Time"
                name="timeMode"
                checked={timeMode === 'time'}
                onChange={() => {
                  setTimeMode('time');
                  reloadAnimation();
                }}
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Speed: {speedMs}ms</Form.Label>
            <Form.Range
              min={200}
              max={3000}
              step={100}
              value={speedMs}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </Form.Group>

          {timeMode === 'commit' && (
            <Form.Group className="mb-3">
              <Form.Label>Commits per Frame: {granularity}</Form.Label>
              <Form.Control
                type="number"
                min={1}
                size="sm"
                value={granularity}
                onChange={(e) => {
                  setGranularity(Math.max(1, Number(e.target.value)));
                  reloadAnimation();
                }}
              />
            </Form.Group>
          )}

          {timeMode === 'time' && (
            <Form.Group className="mb-3">
              <Form.Label> Time-Bucket</Form.Label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Form.Control
                  type="number"
                  min={1}
                  size="sm"
                  value={timeCount}
                  style={{ width: '70px' }}
                  onChange={(e) => {
                    const c = Math.max(1, Number(e.target.value));
                    setTimeCount(c);
                    applyTimeBucket(c, timeUnit);
                  }}
                />
                <Form.Select
                  size="sm"
                  value={timeUnit}
                  onChange={(e) => {
                    const u = Number(e.target.value);
                    setTimeUnit(u);
                    applyTimeBucket(timeCount, u);
                  }}
                >
                  {UNITS.map((o) => (
                    <option key={o.ms} value={o.ms}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label> Height Metric</Form.Label>
            <Form.Select
              size="sm"
              value={heightMetric}
              onChange={(e) =>
                updateSetting('buildingHeightMetric', e.target.value)
              }
            >
              {SELECTED_BUILDING_METRIC_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Form.Select>

            <Form.Label style={{ marginTop: '6px' }}>Strategy</Form.Label>
            <Form.Select
              size="sm"
              value={metricMapping}
              onChange={(e) =>
                updateSetting('buildingMetricMapping', e.target.value)
              }
            >
              {Object.values(BuildingMetricMapping).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Form.Select>

            {metricMapping === BuildingMetricMapping.BucketCount && (
              <>
                <Form.Label style={{ marginTop: '6px' }}>Buckets</Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  min={2}
                  max={10}
                  value={metricBuckets}
                  onChange={(e) =>
                    updateSetting(
                      'buildingMetricBuckets',
                      Math.max(2, Number(e.target.value))
                    )
                  }
                />
              </>
            )}
          </Form.Group>
          {/*
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="delta-switch"
              label="Delta Mode (Streaming)"
              checked={deltaMode}
              onChange={(e) => setDeltaMode(e.target.checked)}
              style={{ fontSize: '12px' }}
            />
          </Form.Group>
          */}
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="aging-switch"
              label="Aging (grey out)"
              checked={agingEnabled}
              onChange={(e) => setAgingEnabled(e.target.checked)}
              style={{ fontSize: '12px' }}
            />
            {agingEnabled && timeMode === 'commit' && (
              <>
                <Form.Label style={{ marginTop: '6px' }}>
                  Grey out after: {agingCommits} Commits
                </Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  size="sm"
                  value={agingCommits}
                  onChange={(e) =>
                    setAgingCommits(Math.max(1, Number(e.target.value)))
                  }
                />
              </>
            )}
            {agingEnabled && timeMode === 'time' && (
              <>
                <Form.Label style={{ marginTop: '6px' }}>
                  Grey out after
                </Form.Label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Form.Control
                    type="number"
                    min={1}
                    size="sm"
                    value={agingTimeCount}
                    style={{ width: '70px' }}
                    onChange={(e) => {
                      const c = Math.max(1, Number(e.target.value));
                      setAgingTimeCount(c);
                      setAgingMs(c * agingTimeUnit);
                    }}
                  />
                  <Form.Select
                    size="sm"
                    value={agingTimeUnit}
                    onChange={(e) => {
                      const u = Number(e.target.value);
                      setAgingTimeUnit(u);
                      setAgingMs(agingTimeCount * u);
                    }}
                  >
                    {UNITS.map((o) => (
                      <option key={o.ms} value={o.ms}>
                        {o.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </>
            )}
          </Form.Group>
        </Tab>
      </Tabs>

      <Button
        variant="primary"
        size="sm"
        className="w-100"
        disabled={isLoading || !repositoryName}
        onClick={handleStart}
      >
        {isLoading ? 'Loading...' : hasFrames ? 'Restart' : 'Start Animation'}
      </Button>
    </div>,
    document.body
  );
}
