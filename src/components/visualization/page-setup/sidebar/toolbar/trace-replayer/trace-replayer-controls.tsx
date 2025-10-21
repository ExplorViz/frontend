import { useEffect, useState } from 'react';
import { PlayIcon, SquareCircleIcon } from '@primer/octicons-react';
import TracePreProcess from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-preprocess';
import TraceSpeed from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-speed';
import TraceStepDetails from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-step-details';
import TraceTimeline from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-timeline';
import {
  TraceNode,
  TraceTreeBuilder,
  TraceTreeVisitor,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { TraceTab } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tab';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useTraceReplayStore } from 'explorviz-frontend/src/stores/trace-replay';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { openAllComponentsInLandscape } from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';

interface TraceReplayerControlsProps {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
}

export default function TraceReplayerControls({
  selectedTrace,
  structureData,
}: TraceReplayerControlsProps) {
  const visualizationStore = useVisualizationStore(
    useShallow((state) => ({
      removeAllHighlightedEntityIds:
        state.actions.removeAllHighlightedEntityIds,
    }))
  );

  const configuration = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
      setIsCommRendered: state.setIsCommRendered,
    }))
  );

  const [localTimeline, setLocalTimeline] = useState<TraceNode[]>([]);
  let classMap = new Map<string, Class>(getHashCodeToClassMap(structureData));

  const [observer] = useState<((cursor: number) => void)[]>([]);
  const trace = getSortedTraceSpans(selectedTrace);
  const tree = new TraceTreeBuilder(trace, classMap).build();

  const turnAncestorsTransparent = (
    component: Package | undefined,
    innerOpacity: number,
    step: number = 0
  ) => {
    if (component && innerOpacity >= opacity) {
      // Instead of manipulating meshes directly, we'll use the visualization store
      // to control highlighting and transparency through the new system
      visualizationStore.removeAllHighlightedEntityIds();
      turnAncestorsTransparent(component.parent, opacity - step, step);
    }
  };

  const {
    loadTimeline: loadReplay,
    ready,
    tabs,
    afterimage,
    eager,
    opacity,
    playing,
    play,
    pause,
    stop,
    setReady,
    setTabs,
    setAfterimage,
    setEager,
    cursor,
  } = useTraceReplayStore(
    useShallow((state) => ({
      loadTimeline: state.loadTimeline,
      ready: state.ready,
      tabs: state.tabs,
      afterimage: state.afterimage,
      eager: state.eager,
      opacity: state.opacity,
      playing: state.playing,
      play: state.play,
      pause: state.pause,
      stop: state.stop,
      setReady: state.setReady,
      setTabs: state.setTabs,
      setAfterimage: state.setAfterimage,
      setEager: state.setEager,
      cursor: state.cursor,
    }))
  );

  const handleStop = () => {
    stop();
    configuration.setIsCommRendered(true);
    visualizationStore.removeAllHighlightedEntityIds();
    setTabs([]);
  };

  useEffect(() => {
    const nodes: TraceNode[] = [];
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      nodes.push(node);
      if (node.end - node.start < 1) {
        setReady(false);
      }
    });
    tree.accept(visitor);
    setLocalTimeline(nodes);
    // push to R3F overlay
    const replayNodes = nodes.map((n) => ({
      id: n.id,
      sourceClassId: n.sourceClass?.id ?? n.targetClass.id,
      targetClassId: n.targetClass.id,
      start: n.start,
      end: n.end,
      parentId: n.parent?.id,
      childrenIds: n.children.map((c) => c.id),
    }));

    loadReplay(replayNodes);
    setReady(true);
  }, []);

  const callbackReady = () => {
    const timeline: TraceNode[] = [];

    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      timeline.push(node);
      if (node.end - node.start < 1) {
        setReady(false);
      }
    });
    tree.accept(visitor);

    if (timeline.length > 100) {
      setReady(false);
    }

    setLocalTimeline(timeline);
    setReady(true);
  };

  const setCursorStore = useTraceReplayStore((s) => s.setCursor);
  const callbackCursor = (c: number) => {
    setCursorStore(c);
  };

  // start / pause effect
  useEffect(() => {
    if (playing) {
      // Hide communication to avoid clutter
      configuration.setIsCommRendered(false);

      // Open all components in landscape such that trace is fully visible
      openAllComponentsInLandscape();
    } else {
      observer.forEach((obs) => {
        obs(useTraceReplayStore.getState().cursor);
      });
    }
  }, [playing]);

  const toggleEager = () => {
    setEager(!eager);
  };

  const toggleAfterimage = () => {
    setAfterimage(!afterimage);
  };

  // Update tabs based on currently active trace steps
  useEffect(() => {
    if (!ready || localTimeline.length === 0) {
      setTabs([]);
      return;
    }

    // Find active nodes at current cursor position
    const activeNodes = localTimeline.filter(
      (node) => node.start <= cursor && node.end >= cursor
    );

    if (activeNodes.length === 0) {
      setTabs([]);
      return;
    }

    // Create tabs for active nodes
    const newTabs: TraceTab[] = [];

    activeNodes.forEach((node, index) => {
      // Get source and target classes
      const sourceClass = node.sourceClass;
      const targetClass = node.targetClass;

      if (!sourceClass || !targetClass) return;

      // Find applications for source and target classes
      const sourceApp = sourceClass.parent?.parent as Application | undefined;
      const targetApp = targetClass.parent?.parent as Application | undefined;

      // Create a color for this tab
      const hue = (index * 137.5) % 360; // Golden angle for good distribution
      const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.5);

      // Create callback for tab activation
      const callback = () => {
        // Highlight the specific trace step
        // ToDo: Highlight communication
      };

      // Create TraceTab
      const tab = new TraceTab(
        node,
        node,
        sourceApp,
        targetApp,
        color,
        callback
      );

      newTabs.push(tab);
    });

    setTabs(newTabs);
  }, [cursor, localTimeline, ready, setTabs, visualizationStore]);

  // Cleanup effect: stop and reset replay when component is destroyed
  useEffect(() => {
    return () => {
      // Stop the replay and reset state when component unmounts
      stop();
      setReady(false);
      setTabs([]);
      visualizationStore.removeAllHighlightedEntityIds();
      configuration.setIsCommRendered(true);
    };
  }, [stop, setReady, setTabs, visualizationStore]);

  return (
    <div>
      <h5>Trace Player</h5>

      {ready ? (
        <div className="mb-3">
          <button
            className="btn btn-secondary mx-2"
            title="Stop"
            onClick={() => {
              handleStop();
            }}
          >
            <SquareCircleIcon size="small" />
          </button>

          {!playing ? (
            <button
              className="btn btn-primary mx-2"
              title="Play"
              onClick={() => {
                play();
              }}
            >
              <PlayIcon size="small" />
            </button>
          ) : (
            <button
              className="btn btn-warning mx-2 navbar-highlight playing"
              title="Pause"
              onClick={() => pause()}
            >
              <PlayIcon size="small" />
            </button>
          )}
        </div>
      ) : (
        <div>
          <TracePreProcess
            tree={tree}
            timeline={localTimeline}
            callback={callbackReady}
          />
        </div>
      )}

      <div className="my-3">
        <label htmlFor="eager-checkbox"></label>
        <input
          id="eager-checkbox"
          className="mx-2"
          type="checkbox"
          checked={eager}
          onChange={toggleEager}
        />
        Eager Expansion
      </div>

      <div className="my-3">
        <label htmlFor="afterimage-checkbox"></label>
        <input
          id="afterimage-checkbox"
          className="mx-2"
          type="checkbox"
          checked={afterimage}
          onChange={toggleAfterimage}
        />
        Keep Trace Lines
      </div>

      <div className="mb-3">
        <TraceSpeed />
      </div>

      <div className="mb-3">
        <TraceTimeline
          timeline={localTimeline}
          select={false}
          cursor={true}
          observer={observer}
          selection={() => {}}
          callback={callbackCursor}
        />
      </div>
      {tabs.length > 0 && (
        <div className="mb-3">
          <h6>Active Trace Steps</h6>
          <div className="d-flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`btn btn-sm ${tab.active ? 'btn-primary' : 'btn-outline-primary'}`}
                title={`${tab.name} (${tab.caller} → ${tab.callee})`}
                onClick={tab.enable}
                type="button"
                style={
                  tab.active
                    ? { backgroundColor: tab.style.split(': ')[1] }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tabs.map(
        (tab) =>
          tab.active && (
            <div key={tab.id} className="mt-3">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Selected Trace Step Details</h6>
                </div>
                <div className="card-body">
                  <TraceStepDetails
                    operationName={tab.name}
                    sourceClass={tab.caller}
                    targetClass={tab.callee}
                    sourceApplicationName={tab.origin}
                    targetApplicationName={tab.target}
                    spanStartTime={tab.start}
                    spanEndTime={tab.end}
                    start={tab.start}
                    end={tab.end}
                    duration={tab.duration}
                  />
                </div>
              </div>
            </div>
          )
      )}
    </div>
  );
}
