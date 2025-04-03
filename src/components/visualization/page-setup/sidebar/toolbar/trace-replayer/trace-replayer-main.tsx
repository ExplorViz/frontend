import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
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
  Tab,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-animation';
import { Button } from 'react-bootstrap'; // Assuming you're using react-bootstrap for buttons
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useShallow } from 'zustand/react/shallow';
import TraceSpeed from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-speed';
import TraceTimeline from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-timeline';

interface TraceReplayerMainProps {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;
  highlightTrace: (trace: Trace, traceStep: string) => void;
  landscapeData: LandscapeData;
}

export default function TraceReplayerMain({
  selectedTrace,
  structureData,
  renderingLoop,
  highlightTrace,
  landscapeData,
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

  const trace = getSortedTraceSpans(selectedTrace);
  const tree = new TraceTreeBuilder(trace, classMap).build();

  useEffect(() => {
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      // setTimeline((prev: any) => [...prev, node]);
      if (node.end - node.start < 1) {
        setReady(false);
      }
    });
    tree.accept(visitor);
    setReady(true);
  }, [tree]);

  const start = () => {
    if (stopped) {
      setStopped(false);
      // renderingLoop.updatables.push({ tick }); // Assuming tick is defined elsewhere

      // Additional logic for starting the rendering
      // ...
    }
    setPaused(false);
  };

  const pause = () => {
    setPaused(true);
  };

  const stop = () => {
    setPaused(true);
    setStopped(true);
    // renderingLoop.updatables.removeObject({ tick }); // Assuming tick is defined elsewhere

    // Additional logic for stopping the rendering
    // ...
  };

  const toggleEager = () => {
    setEager((prev: boolean) => !prev);
  };

  const toggleAfterimage = () => {
    setAfterimage((prev: boolean) => !prev);
  };

  return (
    <div>
      <h5 align="center">Trace Player</h5>

      {ready ? (
        <div align="center" className="mb-3">
          <Button className="th-btn" title="Next" onClick={stop} type="button">
            Replace with your SVG icon Next
          </Button>

          {paused ? (
            <Button
              className="th-btn"
              title="Play"
              onClick={start}
              type="button"
            >
              Replace with your SVG icon Play
            </Button>
          ) : (
            <Button
              className="th-btn navbar-highlight playing"
              title="Stop"
              onClick={pause}
              type="button"
            >
              Replace with your SVG icon Stop
            </Button>
          )}
        </div>
      ) : (
        <div>Render Trace Preprocess component here</div>
      )}

      <div className="mb-3">
        <label htmlFor="eager-checkbox"></label>
        <input
          id="eager-checkbox"
          type="checkbox"
          checked={eager}
          onChange={toggleEager}
        />
        Eager Expansion
      </div>

      <div className="mb-3">
        <label htmlFor="afterimage-checkbox"></label>
        <input
          id="afterimage-checkbox"
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
              Render TraceStepDetails component here
            </ul>
          )
      )}
    </div>
  );
}
