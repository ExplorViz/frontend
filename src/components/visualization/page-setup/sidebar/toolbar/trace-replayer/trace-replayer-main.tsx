import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import {
  getApplicationFromClass,
  getHashCodeToClassMap,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import RenderingLoop from 'explorviz-frontend/src/rendering/application/rendering-loop';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
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
      landscape3D: state.landscape3D,
      getPositionInLandscape: state.getPositionInLandscape,
    }))
  );

  const [timeline, setTimeline] = useState<TraceNode[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(5);
  const [paused, setPaused] = useState<boolean>(true);
  const [stopped, setStopped] = useState<boolean>(true);
  const [entities, setEntities] = useState<Map<string, AnimationEntity>>(
    new Map()
  );
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [afterimage, setAfterimage] = useState<boolean>(true);
  const [eager, setEager] = useState<boolean>(true);
  const [classMap, setClassMap] = useState<Map<string, Class>>(
    getHashCodeToClassMap(structureData)
  );
  const [scene] = useState<THREE.Scene>(renderingLoop.scene);
  const [geometry] = useState<GeometryFactory>(
    new GeometryFactory(
      appRenderer.landscape3D!,
      appRenderer.getPositionInLandscape
    )
  );
  const observer: ((cursor: number) => void)[] = [];
  const trace = getSortedTraceSpans(selectedTrace);
  const tree = new TraceTreeBuilder(trace, classMap).build();

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

    setCursor(0);

    setTimeline(timeline);
    setReady(true);
  };

  const tick = (delta: number) => {
    if (!stopped && !paused) {
      // this.turnTransparent();

      setCursor(cursor + delta * speed);

      observer.forEach((notify) => {
        notify(cursor);
      });

      if (entities.size > 0) {
        entities.forEach((entity: AnimationEntity, id: string) => {
          // move entity
          {
            const start = entity.callee.start;
            const end = eager
              ? entity.callee.children.reduce(
                  (end, node) => Math.min(node.start, end),
                  entity.callee.end
                )
              : entity.callee.end;

            const progress = (cursor - start) / (end - start);

            if (0.0 <= progress && progress <= 1.0) {
              entity.move(progress);
            } else {
              entity.afterimage();
            }
          }

          // spawn children
          const colors = entity.colorSpace.partition(
            entity.callee.children.length
          );
          const heights = entity.heightSpace.partition(
            entity.callee.children.length
          );
          entity.callee.children.forEach((node, idx: number) => {
            if (
              node.start <= cursor &&
              node.end >= cursor &&
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
          if (afterimage && entity.callee.end <= cursor) {
            entity.destroy();
            entities.delete(id);

            setTabs(tabs.filter((tab) => entity.callee.id !== tab.id));
            if (tabs.length > 0) {
              tabs.at(-1)!.active = true;
            }
          }

          entity.caller.mesh.highlight();
          entity.caller.mesh.turnOpaque();
          // turnAncestorsTransparent(entity.caller.clazz.parent, 1, 0.1);

          entity.callee.mesh.highlight();
          entity.callee.mesh.turnOpaque();
          // turnAncestorsTransparent(entity.callee.clazz.parent, 1, 0.1);
        });
      } else {
        stop();
      }
    }
  };

  const start = () => {
    setPaused(false);
    if (stopped) {
      return;
    }
    setStopped(true);
    renderingLoop.tickCallbacks.push({ id: 'trace-player', callback: tick });

    // this.isCommRendered = this.configuration.isCommRendered;
    // this.configuration.isCommRendered = false;
    // this.renderer.openAllComponentsOfAllApplications();
    // this.renderer.removeCommunicationForAllApplications();

    // Find alive entities
    const nodes: TraceNode[] = timeline.filter((node) => {
      return node.start <= cursor && node.end >= cursor;
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
  };

  const pause = () => {
    setPaused(true);
  };

  const stop = () => {
    setPaused(true);
    setStopped(true);
    // renderingLoop.tickCallbacks.remove({
    //   id: 'trace-player',
    //   callback: tick,
    // });

    // this.configuration.isCommRendered = this.isCommRendered;
    // if (this.configuration.isCommRendered) {
    //   this.renderer.addCommunicationForAllApplications();
    // }

    // this.turnTransparent(1);

    entities.forEach((entity) => {
      entity.destroy();
    });
    entities.clear();
    setTabs([]);
    setCursor(0);
    observer.forEach((observer) => {
      observer(cursor);
    });

    if (selectedTrace && selectedTrace.spanList.length > 0) {
      // this.args.highlightTrace(
      //   this.args.selectedTrace,
      //   this.args.selectedTrace.spanList[0].spanId
      // );
    }
  };

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
            title="Next"
            onClick={stop}
            type="button"
          >
            <SquareCircleIcon size="small" />
          </Button>

          {paused ? (
            <Button
              className="th-btn mx-2"
              title="Play"
              onClick={start}
              type="button"
            >
              <PlayIcon size="small" />
            </Button>
          ) : (
            <Button
              className="th-btn mx-2 navbar-highlight playing"
              title="Stop"
              onClick={pause}
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
        <TraceSpeed callback={(speed: number) => setSpeed(speed)} />
      </div>

      <div className="mb-3">
        <TraceTimeline
          timeline={timeline}
          select={true}
          cursor={false}
          observer={[]}
          selection={(start: number, end: number) => {}}
          callback={(cursor: number) => {}}
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
                caller={tab.caller}
                callee={tab.callee}
                origin={tab.origin}
                target={tab.target}
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
