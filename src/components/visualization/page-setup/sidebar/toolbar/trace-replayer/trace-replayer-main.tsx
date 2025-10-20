import { useEffect, useRef, useState } from 'react';
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
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useTraceReplayStore } from 'explorviz-frontend/src/stores/trace-replay';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import Button from 'react-bootstrap/Button';
import { useShallow } from 'zustand/react/shallow';

interface TraceReplayerMainProps {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
}

export default function TraceReplayerMain({
  selectedTrace,
  structureData,
}: TraceReplayerMainProps) {
  const visualizationStore = useVisualizationStore(
    useShallow((state) => ({
      openComponents: state.actions.openComponents,
      closeComponents: state.actions.closeComponents,
      setHighlightedEntityId: state.actions.setHighlightedEntityId,
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

  const [timeline, setTimeline] = useState<TraceNode[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [afterimage, setAfterimage] = useState<boolean>(true);
  const [eager, setEager] = useState<boolean>(true);
  let classMap = new Map<string, Class>(getHashCodeToClassMap(structureData));

  let cursor = useRef<number>(0);
  const [paused, setPaused] = useState(true);
  const [stopped, setStopped] = useState(true);
  const [observer] = useState<((cursor: number) => void)[]>([]);
  const trace = getSortedTraceSpans(selectedTrace);
  const tree = new TraceTreeBuilder(trace, classMap).build();

  const opacity = 0.3;

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

  const loadReplay = useTraceReplayStore((s) => s.loadTimeline);
  useEffect(() => {
    const nodes: TraceNode[] = [];
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      nodes.push(node);
      if (node.end - node.start < 1) {
        setReady(false);
      }
    });
    tree.accept(visitor);
    setTimeline(nodes);
    // push to R3F overlay
    loadReplay(
      nodes.map((n) => ({
        id: n.id,
        sourceClassId: n.sourceClass?.id ?? n.targetClass.id,
        targetClassId: n.targetClass.id,
        start: n.start,
        end: n.end,
        parentId: n.parent?.id,
        childrenIds: n.children.map((c) => c.id),
      }))
    );
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

    cursor.current = 0;

    setTimeline(timeline);
    setReady(true);
  };

  const setCursorStore = useTraceReplayStore((s) => s.setCursor);
  const callbackCursor = (c: number) => {
    cursor.current = c;
    setCursorStore(c);
  };

  // Remove external animation: handled inside R3F overlay

  // start()
  useEffect(() => {
    if (stopped) {
      return;
    }

    setPaused(false);

    // No need for tickCallbacks anymore since we're using useFrame

    configuration.setIsCommRendered(false);

    // Instead of appRenderer methods, use the visualization store
    // Open all components by getting all component IDs and opening them
    const allComponentIds = Array.from(classMap.values())
      .map((clazz) => clazz.parent?.id)
      .filter(Boolean) as string[];
    visualizationStore.openComponents(allComponentIds);

    // Start overlay playback and reset cursor to start
    const { play, stop, setCursor } = useTraceReplayStore.getState();
    stop();
    if (timeline.length > 0)
      setCursor(Math.min(...timeline.map((n) => n.start)));
    play();
  }, [stopped]);

  // stop()
  useEffect(() => {
    if (!stopped) {
      return;
    }

    // No need to filter tickCallbacks anymore since we're using useFrame

    configuration.setIsCommRendered(true);

    // Instead of appRenderer methods, we don't need to add communication back
    // as the communication rendering is controlled by the configuration store

    // Clear highlighting and reset state
    visualizationStore.removeAllHighlightedEntityIds();
    setTabs([]);
    useTraceReplayStore.getState().stop();
    cursor.current = 0;
    observer.forEach((obs) => {
      obs(cursor.current);
    });

    if (selectedTrace && selectedTrace.spanList.length > 0) {
      // highlighter.highlightTrace(
      //   selectedTrace,
      //   selectedTrace.spanList[0].spanId
      // );
    }

    setPaused(true);
  }, [stopped]);

  const toggleEager = () => {
    setEager((prev) => !prev);
  };

  const toggleAfterimage = () => {
    setAfterimage((prev) => !prev);
  };

  return (
    <div>
      <h5>Trace Player</h5>

      {ready ? (
        <div className="mb-3">
          <Button
            className="th-btn mx-2"
            title="Stop"
            onClick={() => {
              setStopped(true);
              setPaused(false);
            }}
          >
            <SquareCircleIcon size="small" />
          </Button>

          {paused ? (
            <Button
              className="th-btn mx-2"
              title="Play"
              onClick={() => {
                setStopped(false);
                setPaused(false);
              }}
            >
              <PlayIcon size="small" />
            </Button>
          ) : (
            <Button
              className="th-btn mx-2 navbar-highlight playing"
              title="Stop"
              onClick={() => setPaused(true)}
            >
              <PlayIcon size="small" />
            </Button>
          )}
        </div>
      ) : (
        <div>
          <TracePreProcess
            tree={tree}
            timeline={timeline}
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
        Remove Traces
      </div>

      <div className="mb-3">
        <TraceSpeed />
      </div>

      <div className="mb-3">
        <TraceTimeline
          timeline={timeline}
          select={false}
          cursor={true}
          observer={observer}
          selection={() => {}}
          callback={callbackCursor}
        />
      </div>
      <div className="mb-3">
        <ul className="nav nav-tabs">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              className={`nav-link ${tab.active ? 'active' : ''}`}
              title={tab.label}
              onClick={tab.enable}
              type="button"
            >
              {tab.label}
            </Button>
          ))}
        </ul>
      </div>

      {tabs.map(
        (tab) =>
          tab.active && (
            <ul className="nav nav-tabs" key={tab.id}>
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
            </ul>
          )
      )}
    </div>
  );
}
