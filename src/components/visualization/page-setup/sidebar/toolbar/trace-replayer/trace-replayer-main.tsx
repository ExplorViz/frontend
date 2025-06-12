import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import {
  getApplicationFromClass,
  getHashCodeToClassMap,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import RenderingLoop from 'explorviz-frontend/src/rendering/application/rendering-loop';
import {
  TraceNode,
  TraceTreeBuilder,
  TraceTreeVisitor,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import {
  AnimationEntity,
  GeometryFactory,
  HueSpace,
  Partition,
  Tab,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-animation';
import { Button } from 'react-bootstrap';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useShallow } from 'zustand/react/shallow';
import TraceSpeed from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-speed';
import TraceTimeline from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-timeline';
import { PlayIcon, SquareCircleIcon } from '@primer/octicons-react';
import TracePreProcess from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-preprocess';
import TraceStepDetails from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-step-details';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';

interface TraceReplayerMainProps {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;
}

export default function TraceReplayerMain({
  selectedTrace,
  structureData,
  renderingLoop,
}: TraceReplayerMainProps) {
  const appRenderer = useApplicationRendererStore(
    useShallow((state) => ({
      addCommunicationForAllApplications:
        state.addCommunicationForAllApplications,
      landscape3D: state.landscape3D,
      getMeshById: state.getMeshById,
      getPositionInLandscape: state.getPositionInLandscape,
      openAllComponentsOfAllApplications:
        state.openAllComponentsOfAllApplications,
      removeCommunicationForAllApplications:
        state.removeCommunicationForAllApplications,
    }))
  );

  const configuration = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
      setIsCommRendered: state.setIsCommRendered,
    }))
  );

  const highlighter = useHighlightingStore(
    useShallow((state) => ({
      highlightTrace: state.highlightTrace,
      // removeHighlightingForAllApplications:
      //   state.removeHighlightingForAllApplications,
      // updateHighlighting: state.updateHighlighting,
      // updateHighlightingOnHover: state.updateHighlightingOnHover,
      // toggleHighlight: state.toggleHighlight,
      // toggleHighlightById: state.toggleHighlightById,
    }))
  );

  const [timeline, setTimeline] = useState<TraceNode[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [entities, setEntities] = useState<Map<string, AnimationEntity>>(
    new Map()
  );
  const [delta, setDelta] = useState(1);
  const [frame, setFrame] = useState(0);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [afterimage, setAfterimage] = useState<boolean>(true);
  const [eager, setEager] = useState<boolean>(true);
  let classMap = new Map<string, Class>(getHashCodeToClassMap(structureData));
  let scene: THREE.Scene = renderingLoop.scene;
  let geometry: GeometryFactory = new GeometryFactory(
    appRenderer.landscape3D!,
    appRenderer.getPositionInLandscape
  );

  let speed = useRef<number>(5);
  let cursor = useRef<number>(0);
  const [paused, setPaused] = useState(true);
  const [stopped, setStopped] = useState(true);
  const [observer, setObserver] = useState<((cursor: number) => void)[]>([]);
  const trace = getSortedTraceSpans(selectedTrace);
  const tree = new TraceTreeBuilder(trace, classMap).build();

  const opacity = 0.3;

  const turnTransparent = (opacity: number) => {
    classMap.forEach((classModel) => {
      const mesh = appRenderer.getMeshById(classModel.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(opacity);
        mesh.unhighlight();
        turnAncestorsTransparent(classModel.parent, opacity);
      }
    });
  };

  const turnAncestorsTransparent = (
    component: Package,
    innerOpacity: number,
    step: number = 0
  ) => {
    if (component && innerOpacity >= opacity) {
      const mesh = appRenderer.getMeshById(component.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(innerOpacity);
        mesh.unhighlight();
        turnAncestorsTransparent(component.parent, opacity - step, step);
      }
    }
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
    setTimeline(nodes);
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

  const callbackCursor = (c: number) => {
    // setStopped(true);
    cursor.current = c;
    // setStopped(false);
    setDelta(0);
    setFrame(frame + 1);
    // if (paused) {
    // setPaused(true);
    // }
  };

  // Function that is called each frame to animate traces
  useEffect(() => {
    if (stopped || paused) {
      return;
    }

    // Nothing left to animate
    if (entities.size <= 0) {
      setStopped(true);
      return;
    }

    const min = Math.min(...timeline.map((node) => node.start));
    const max = Math.max(...timeline.map((node) => node.end));
    const duration = max - min;

    turnTransparent(opacity);

    // So we have an even speed for all traces, we consider the duration of the trace
    cursor.current = cursor.current + delta * speed.current * (duration / 1e2);

    observer.forEach((notify) => {
      notify(cursor.current);
    });

    entities.forEach((entity: AnimationEntity, id: string) => {
      // Move entity
      {
        const start = entity.callee.start;
        const end = eager
          ? entity.callee.children.reduce(
              (end, node) => Math.min(node.start, end),
              entity.callee.end
            )
          : entity.callee.end;

        const progress = (cursor.current - start) / (end - start);

        if (0.0 <= progress && progress <= 1.0) {
          entity.move(progress);
        } else {
          entity.afterimage();
        }
      }

      // Spawn children
      const colors = entity.colorSpace.partition(entity.callee.children.length);
      const heights = entity.heightSpace.partition(
        entity.callee.children.length
      );
      entity.callee.children.forEach((node, idx: number) => {
        if (
          node.start <= cursor.current &&
          node.end >= cursor.current &&
          !entities.has(node.id)
        ) {
          const spawn = new AnimationEntity(
            scene,
            geometry,
            entity.callee,
            node,
            heights[idx],
            colors[idx]
          );
          const origin = getApplicationFromClass(
            structureData,
            entity.callee.clazz
          );
          const target = getApplicationFromClass(structureData, node.clazz);

          entities.set(node.id, spawn);

          tabs.forEach((tab) => {
            tab.active = false;
          });
          const tab = new Tab(
            entity.callee,
            node,
            origin,
            target,
            spawn.colorSpace.color,
            () => {
              tabs.forEach((tab) => {
                tab.active = false;
              });
            }
          );
          tab.active = true;
          setTabs([...tabs, tab]);
        }
      });

      // Destroy entity
      if (afterimage && entity.callee.end <= cursor.current) {
        entity.destroy();
        entities.delete(id);

        setTabs(tabs.filter((tab) => entity.callee.id !== tab.id));
        if (tabs.length > 0) {
          tabs.at(-1)!.active = true;
        }
      }

      entity.caller.mesh.highlight();
      entity.caller.mesh.turnOpaque();
      turnAncestorsTransparent(entity.caller.clazz.parent, 1, 0.1);

      entity.callee.mesh.highlight();
      entity.callee.mesh.turnOpaque();
      turnAncestorsTransparent(entity.callee.clazz.parent, 1, 0.1);
    });
  }, [delta, frame]);

  // start()
  useEffect(() => {
    if (stopped) {
      return;
    }

    setPaused(false);

    renderingLoop.tickCallbacks.push({
      id: 'trace-player',
      callback: (delta) => {
        setDelta(delta);
        setFrame(frame + 1);
      },
    });

    configuration.setIsCommRendered(false);
    appRenderer.openAllComponentsOfAllApplications();
    appRenderer.removeCommunicationForAllApplications();

    // Find alive entities
    const nodes: TraceNode[] = timeline.filter((node) => {
      return node.start <= cursor.current && node.end >= cursor.current;
    });
    nodes.sort((a: TraceNode, b: TraceNode): number => {
      return a.start === b.start
        ? a.end === b.end
          ? a.id < b.id
            ? -1
            : 1
          : a.end - b.end
        : a.start - b.start;
    });

    // Spawn initial set of entities
    const colors = HueSpace.default.partition(nodes.length);
    const heights = new Partition(0.5, 1.5).partition(nodes.length);
    nodes.forEach((caller: TraceNode, idx: number): void => {
      const spawn = new AnimationEntity(
        scene,
        geometry,
        caller,
        caller,
        heights[idx],
        colors[idx]
      );
      const origin = getApplicationFromClass(structureData, caller.clazz);

      entities.set(caller.id, spawn);

      tabs.forEach((tab) => {
        tab.active = false;
      });
      const tab = new Tab(
        caller,
        caller,
        origin,
        origin,
        spawn.colorSpace.color,
        () => {
          tabs.forEach((tab) => {
            tab.active = false;
          });
        }
      );
      tab.active = true;
      setTabs([...tabs, tab]);
    });
  }, [stopped]);

  // stop()
  useEffect(() => {
    if (!stopped) {
      return;
    }

    renderingLoop.tickCallbacks = renderingLoop.tickCallbacks.filter(
      (callback) => {
        return callback.id !== 'trace-player';
      }
    );

    configuration.setIsCommRendered(true);
    appRenderer.addCommunicationForAllApplications();

    // turnTransparent(1);

    entities.forEach((entity) => {
      entity.destroy();
    });
    entities.clear();
    setTabs([]);
    cursor.current = 0;
    observer.forEach((observer) => {
      observer(cursor.current);
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
    setEager((prev: boolean) => !prev);
  };

  const toggleAfterimage = () => {
    setAfterimage((prev: boolean) => !prev);
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
            type="button"
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
              type="button"
            >
              <PlayIcon size="small" />
            </Button>
          ) : (
            <Button
              className="th-btn mx-2 navbar-highlight playing"
              title="Stop"
              onClick={() => setPaused(true)}
              type="button"
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
        <TraceSpeed
          callback={(s: number) => {
            speed.current = s;
          }}
        />
      </div>

      <div className="mb-3">
        <TraceTimeline
          timeline={timeline}
          select={false}
          cursor={true}
          observer={observer}
          selection={(start: number, end: number) => {}}
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
                duration={tab.duration}
              />
            </ul>
          )
      )}
    </div>
  );
}
