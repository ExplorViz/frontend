import React, { useEffect, useState } from 'react';

import {
  DynamicLandscapeData,
  Trace,
  Span,
} from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Application,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import { getHashCodeToClassMap } from 'react-lib/src/utils/landscape-structure-helpers';
import { getSortedTraceSpans } from 'react-lib/src/utils/trace-helpers';
import RenderingLoop from 'react-lib/src/rendering/application/rendering-loop';
import { useRenderingServiceStore } from 'react-lib/src/stores/rendering-service';
import TraceSelection from './trace-selection';
import TraceReplayerMain from './trace-replayer-main';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';

interface TraceSelectionAndReplayerProps {
  renderingLoop: RenderingLoop;
  readonly dynamicData: DynamicLandscapeData;
  readonly structureData: StructureLandscapeData;
  readonly application: Application;
  readonly landscapeData: LandscapeData;
  highlightTrace(trace: Trace, traceStep: string): void;
  removeHighlighting(): void;
  moveCameraTo(
    model: Class | Span,
    applicationObject3D: ApplicationObject3D,
    dynamicData: DynamicLandscapeData,
    cameraControls: CameraControls
  ): void;
}

export default function TraceSelectionAndReplayer({
  renderingLoop,
  dynamicData,
  structureData,
  application,
  landscapeData,
  highlightTrace,
  removeHighlighting,
  moveCameraTo,
}: TraceSelectionAndReplayerProps) {
  const pauseVisualizationUpdating = useRenderingServiceStore(
    (state) => state.pauseVisualizationUpdating
  );
  const resumeVisualizationUpdating = useRenderingServiceStore(
    (state) => state.resumeVisualizationUpdating
  );

  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);

  const hashCodeToClassMap = getHashCodeToClassMap(structureData);
  const applicationTraces = dynamicData.filter((trace) =>
    trace.spanList.some(
      (span) => hashCodeToClassMap.get(span.methodHash) !== undefined
    )
  );

  const selectTrace = (trace: Trace) => {
    if (trace !== selectedTrace) {
      pauseVisualizationUpdating(true);
      setSelectedTrace(trace);
      const traceSteps = getSortedTraceSpans(trace);

      if (traceSteps.length > 0) {
        const [firstStep] = traceSteps;
        highlightTrace(trace, firstStep.spanId);
      }
    } else {
      // Reset highlighting when highlighted trace is clicked again
      resumeVisualizationUpdating();
      setSelectedTrace(null);
      removeHighlighting();
    }
  };

  useEffect(() => {
    return () => {
      if (selectedTrace) {
        removeHighlighting();
      }
    };
  }, []);

  return (
    <>
      <TraceSelection
        moveCameraTo={moveCameraTo}
        selectTrace={selectTrace}
        dynamicData={dynamicData}
        structureData={structureData}
        application={application}
        applicationTraces={applicationTraces}
        selectedTrace={selectedTrace!}
      />

      {selectedTrace && (
        <TraceReplayerMain
          selectedTrace={selectedTrace}
          dynamicData={dynamicData}
          structureData={structureData}
          renderingLoop={renderingLoop}
          highlightTrace={highlightTrace}
          landscapeData={landscapeData}
        />
      )}
    </>
  );
}
