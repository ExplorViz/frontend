import React, { ChangeEvent, FormEvent, useRef, useState } from 'react';

import * as THREE from 'three';
import {
  DynamicLandscapeData,
  Span,
  Trace,
} from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import {
  calculateDuration,
  getSortedTraceSpans,
} from 'react-lib/src/utils/trace-helpers';
import { getHashCodeToClassMap } from 'react-lib/src/utils/landscape-structure-helpers';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import RenderingLoop from 'react-lib/src/rendering/application/rendering-loop';
import { useConfigurationStore } from 'react-lib/src/stores/configuration';
import { getAllAncestorComponents } from 'react-lib/src/utils/application-rendering/entity-manipulation';
import BaseMesh from 'react-lib/src/view-objects/3d/base-mesh';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import Button from 'react-bootstrap/Button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  SquareFillIcon,
  XCircleIcon,
} from '@primer/octicons-react';
import TraceNavigation from './trace-navigation';
import TraceStepDetails from './trace-step-details';

const TICK_CALLBACK_ID = 'trace-replayer-main';

const DEFAULT_OPACITY = 1;

class Blob extends BaseMesh<THREE.SphereGeometry, THREE.Material> {
  constructor(
    radius: number,
    color: THREE.Color = new THREE.Color('red'),
    opacity: number = 1
  ) {
    super(color, color, opacity);
    this.highlight();
    this.geometry = new THREE.SphereGeometry(radius, 8, 8);
  }

  move(position: THREE.Vector3): void {
    this.position.copy(position);
  }
}

export class Afterimage {
  private mesh: BaseMesh;

  private opacity: number = DEFAULT_OPACITY;

  constructor(mesh: BaseMesh) {
    this.mesh = mesh;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }

  delete() {
    this.mesh.turnOpaque();
    this.mesh.unhighlight();
    this.opacity = -1;
  }

  tick(): void {
    if (this.opacity >= 0.3) {
      this.mesh.show();
      this.mesh.highlight();
      this.mesh.turnTransparent(this.opacity);
    } else {
      this.mesh.hide();
      this.mesh.unhighlight();
    }
    this.opacity -= 0.01;
  }

  alive(): boolean {
    return this.opacity > 0;
  }

  reset() {
    this.opacity = DEFAULT_OPACITY;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }
}

class Record {
  public clazz: Class;
  public mesh: BaseMesh;
  public duration: number;

  constructor(clazz: Class, mesh: BaseMesh, duration: number) {
    this.clazz = clazz;
    this.mesh = mesh;
    this.duration = duration;
  }
}

interface TraceReplayerMainArgs {
  selectedTrace: Trace;
  dynamicData: DynamicLandscapeData;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;
  readonly landscapeData: LandscapeData;
  highlightTrace(trace: Trace, traceStep: string): void;
}

export default function TraceReplayerMain({
  selectedTrace,
  dynamicData,
  structureData,
  renderingLoop,
  landscapeData,
  highlightTrace,
}: TraceReplayerMainArgs) {
  // MARK: Stores

  const landscape3D = useApplicationRendererStore((state) => state.landscape3D);
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const getMeshById = useApplicationRendererStore((state) => state.getMeshById);
  const getPositionInLandscape = useApplicationRendererStore(
    (state) => state.getPositionInLandscape
  );
  const openAllComponentsOfAllApplications = useApplicationRendererStore(
    (state) => state.openAllComponentsOfAllApplications
  );
  const addCommunicationForAllApplications = useApplicationRendererStore(
    (state) => state.addCommunicationForAllApplications
  );
  const removeCommunicationForAllApplications = useApplicationRendererStore(
    (state) => state.removeCommunicationForAllApplications
  );
  const isCommRenderedInStore = useConfigurationStore(
    (state) => state.isCommRendered
  );
  const setIsCommRenderedInStore = useConfigurationStore(
    (state) => state.setIsCommRendered
  );

  // MARK: State

  const [trace, setTrace] = useState<Span[]>(() =>
    getSortedTraceSpans(selectedTrace)
  );
  const [currentTraceStep, setCurrentTraceStep] = useState<Span | null>(
    trace.length > 0 ? trace[0] : null
  );
  const [selectedSpeed, setSelectedSpeed] = useState<number>(5);
  const [progress, setProgress] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(true);
  const [stopped, setStopped] = useState<boolean>(true);
  const [index, setIndex] = useState<number>(-1);
  const [classMap] = useState<Map<string, Class>>(() =>
    getHashCodeToClassMap(structureData)
  );
  const [records] = useState<Record[]>(() =>
    trace
      .map((span) => {
        const clazz = classMap.get(span.methodHash);
        if (clazz) {
          const mesh = getMeshById(clazz.id);
          return mesh
            ? new Record(clazz, mesh, calculateDuration(span))
            : undefined;
        }
        return undefined;
      })
      .filter((span) => span !== undefined)
  );

  // MARK: Refs

  const minSpeed = useRef<number>(1);
  const maxSpeed = useRef<number>(20);
  const totalDelta = useRef<number>(0);
  const blob = useRef<Blob | undefined>(undefined);
  const curve = useRef<THREE.QuadraticBezierCurve3 | undefined>(undefined);
  const duration = useRef<number>(0);
  const meshes = useRef<Set<BaseMesh>>(new Set<BaseMesh>());
  const afterimages = useRef<Set<Afterimage>>(new Set<Afterimage>());
  const isCommRendered = useRef<boolean>(false);

  // MARK: Event handlers

  const inputSpeed = (event: FormEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.value;
    if (newValue) {
      setSelectedSpeed(Number(newValue));
    }
  };

  const changeSpeed = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedSpeed(Number(event.currentTarget.value));
  };

  const next = () => {
    if (paused) {
      setIndex((prev) => Math.min(prev + 1, records.length));
    }
  };

  const previous = () => {
    if (paused) {
      setIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const tick = (delta: number) => {
    totalDelta.current += delta;

    if (blob.current && curve.current) {
      const progress = totalDelta.current / duration.current;
      if (0.0 <= progress && progress <= 1.0) {
        // const afterimage = blob.current.clone();
        // renderingLoop.scene.add(afterimage);
        // afterimages.current.add(new Afterimage(afterimage));
        blob.current.move(curve.current.getPoint(progress));
      }
    }
    setProgress(Math.ceil((index / trace.length) * 100));

    if (!stopped && !paused && totalDelta.current > duration.current) {
      totalDelta.current = 0;

      if (index >= 0 && index < records.length - 1) {
        const origin = records[index];
        const target = records[index + 1];
        setIndex((prev) => prev + 1);

        duration.current = (1 + origin.duration / 1000.0) / selectedSpeed;

        getAllAncestorComponents(origin.clazz).forEach((component) => {
          getMeshById(component.id);
        });

        // if (highlights.has(origin.clazz.id)) {
        //   highlights.get(origin.clazz.id)?.reset();
        // } else {
        //   highlights.set(
        //     origin.clazz.id,
        //     new Afterimage(origin.mesh)
        //   );
        // }
        //
        // if (highlights.has(target.clazz.id)) {
        //   highlights.get(target.clazz.id)?.reset();
        // } else {
        //   highlights.set(
        //     target.clazz.id,
        //     new Afterimage(target.mesh)
        //   );
        // }

        afterimages.current.add(new Afterimage(origin.mesh));
        afterimages.current.add(new Afterimage(target.mesh));

        const scale = landscape3D!.scale;
        const support = landscape3D!.position;
        const start = getPositionInLandscape(origin.mesh)
          .multiply(scale)
          .add(support);
        const end = getPositionInLandscape(target.mesh)
          .multiply(scale)
          .add(support);

        const classDistance = Math.hypot(end.x - start.x, end.z - start.z);
        const height =
          classDistance * 0.2 * visualizationSettings.curvyCommHeight.value;
        const middle = new THREE.Vector3(
          start.x + (end.x - start.x) / 2.0,
          height + start.y + (end.y - start.y) / 2.0,
          start.z + (end.z - start.z) / 2.0
        );

        curve.current = new THREE.QuadraticBezierCurve3(start, middle, end);

        blob.current?.move(start);
        blob.current?.show();

        // highlightTrace(selectedTrace, current.spanId);
      } else {
        stop();
      }
    }

    if (afterimages.current.size > 0) {
      const prune = new Set<Afterimage>();
      afterimages.current.forEach((afterimage) => {
        afterimage.tick();
        if (!afterimage.alive()) {
          prune.add(afterimage);
        }
      });
      prune.forEach((afterimage) => afterimages.current.delete(afterimage));
    }
  };

  const turnComponentAndAncestorsTransparent = (
    component: Package,
    opacity: number
  ) => {
    if (component) {
      const mesh = getMeshById(component.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(opacity);
        turnComponentAndAncestorsTransparent(component.parent, opacity);
      }
    }
  };

  const start = () => {
    if (stopped) {
      setStopped(false);
      setIndex(0);
      renderingLoop.tickCallbacks.push({
        id: TICK_CALLBACK_ID,
        callback: tick,
      });

      isCommRendered.current = isCommRenderedInStore;
      setIsCommRenderedInStore(false);
      openAllComponentsOfAllApplications();
      removeCommunicationForAllApplications();

      classMap.forEach((clazz) => {
        const mesh = getMeshById(clazz.id);
        mesh?.turnTransparent();
        turnComponentAndAncestorsTransparent(clazz.parent, 0.3);
      });

      for (let i = 0; i < 3; ++i) {
        const newBlob = new Blob(0.02);
        newBlob.hide();
        renderingLoop.scene.add(newBlob);
        blob.current = newBlob;
        meshes.current.add(newBlob);
      }
    }

    setPaused(false);
  };

  const pause = () => setPaused(true);

  const stop = () => {
    setPaused(true);
    setStopped(true);
    setIndex(1);
    renderingLoop.tickCallbacks = renderingLoop.tickCallbacks.filter(
      (callbackObj) => callbackObj.id !== TICK_CALLBACK_ID
    );
    setProgress(0);

    setIsCommRenderedInStore(isCommRendered.current);
    if (isCommRendered.current) {
      addCommunicationForAllApplications();
    }

    classMap.forEach((clazz) => {
      const mesh = getMeshById(clazz.id);
      mesh?.turnOpaque();
      turnComponentAndAncestorsTransparent(clazz.parent, 1);
    });

    for (const mesh of meshes.current) {
      renderingLoop.scene.remove(mesh);
    }
    meshes.current.clear();

    afterimages.current.forEach((clazz) => {
      clazz.delete();
    });
    afterimages.current.clear();
  };

  const selectNextTraceStep = () => {
    // Can only select next step if a trace is selected
    if (!currentTraceStep) {
      return;
    }

    const currentTracePosition = trace.findIndex(
      (span) => span === currentTraceStep
    );

    if (currentTracePosition === -1) {
      return;
    }

    const nextStepPosition = currentTracePosition + 1;

    if (nextStepPosition > trace.length - 1) {
      return;
    }

    setCurrentTraceStep(trace[nextStepPosition]);
    highlightTrace(selectedTrace, currentTraceStep.spanId);
  };

  const selectPreviousTraceStep = () => {
    // Can only select next step if a trace is selected
    if (!currentTraceStep) {
      return;
    }

    const currentTracePosition = trace.findIndex(
      (span) => span === currentTraceStep
    );

    if (currentTracePosition === -1) {
      return;
    }

    const previousStepPosition = currentTracePosition - 1;

    if (previousStepPosition < 0) {
      return;
    }

    setCurrentTraceStep(trace[previousStepPosition]);
    highlightTrace(selectedTrace, currentTraceStep.spanId);
  };

  // MARK: JSX

  return (
    <>
      <h5 style={{ textAlign: 'center' }}>Trace Player</h5>

      <div style={{ textAlign: 'center' }} className="mb-3">
        <Button
          className="th-btn"
          title="Previous"
          type="button"
          onClick={previous}
        >
          <ChevronLeftIcon size="small" className="align-middle" />
        </Button>

        <Button className="th-btn" title="Next" type="button" onClick={stop}>
          <SquareFillIcon size="small" className="align-middle" />
        </Button>

        {paused ? (
          <Button className="th-btn" title="Play" type="button" onClick={start}>
            <PlayIcon size="small" className="align-middle" />
          </Button>
        ) : (
          <Button
            className="th-btn navbar-highlight playing"
            title="Stop"
            type="button"
            onClick={pause}
          >
            <XCircleIcon size="small" className="align-middle" />
          </Button>
        )}

        <Button className="th-btn" title="Next" type="button" onClick={next}>
          <ChevronRightIcon size="small" className="align-middle" />
        </Button>
      </div>

      <div className="mb-3">
        <div className="range-slider--container">
          <div style={{ width: '100%' }}>
            <label htmlFor="trace-speed-selector">Playback speed</label>
            <input
              id="trace-speed-slider"
              value={selectedSpeed}
              min={minSpeed.current}
              max={maxSpeed.current}
              type="range"
              step="1"
              className="form-control mr-2"
              onChange={changeSpeed}
              onInput={inputSpeed}
            />
            <div className="range-slider--values">
              <span>{minSpeed.current}</span>
              <span style={{ fontWeight: 'bold' }}>{selectedSpeed}</span>
              <span>{maxSpeed.current}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="range-slider--container">
          <div style={{ width: '100%' }}>
            <label htmlFor="trace-progress">Progress</label>
            <input
              id="trace-progress"
              value={progress}
              min="0"
              max="100"
              type="range"
              step="1"
              className="form-control mr-2"
            />
            {progress}%
          </div>
        </div>
      </div>

      <TraceNavigation
        selectPreviousTraceStep={previous}
        selectNextTraceStep={next}
        currentTraceStepIndex={index}
        traceLength={trace.length}
      />

      <hr />

      <TraceStepDetails // Non-existent properties used?
        operationName={operationName}
        sourceClass={sourceClass}
        targetClass={targetClass}
        sourceApplicationName={sourceApplication.name}
        targetApplicationName={targetApplication.name}
        spanStartTime={currentTraceStep!.startTime}
        spanEndTime={currentTraceStep!.endTime}
      />
    </>
  );
}
