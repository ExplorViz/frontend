import React, { useEffect, useState } from 'react';
import {
  DynamicLandscapeData,
  Trace,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import RenderingLoop from 'explorviz-frontend/src/rendering/application/rendering-loop';
import TraceReplayerMain from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-main';
import TraceSelection from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-selection';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useShallow } from 'zustand/react/shallow';

export type TimeUnit = 'ns' | 'μs' | 'ms' | 's';

interface TraceSelectionAndReplayerProps {
  highlightTrace: (trace: Trace, traceStep: string) => void;
  removeHighlighting: () => void;
  renderingLoop: RenderingLoop;
  dynamicData: DynamicLandscapeData;
  structureData: StructureLandscapeData;
}

const TraceSelectionAndReplayer: React.FC<TraceSelectionAndReplayerProps> = ({
  highlightTrace,
  removeHighlighting,
  renderingLoop,
  dynamicData,
  structureData,
}) => {
  const renderingStore = useRenderingServiceStore(
    useShallow((state) => ({
      pauseVisualizationUpdating: state.pauseVisualizationUpdating,
      resumeVisualizationUpdating: state.resumeVisualizationUpdating,
      visualizationPaused: state._visualizationPaused,
    }))
  );

  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [unit, setUnit] = useState<TimeUnit>('ns');

  const applicationTraces = dynamicData.filter((trace) => {
    const hashCodeToClassMap = getHashCodeToClassMap(structureData);
    return trace.spanList.some(
      (span) => hashCodeToClassMap.get(span.methodHash) !== undefined
    );
  });

  const toggleUnit = () => {
    switch (unit) {
      case 'ns':
        setUnit('μs');
        break;
      case 'μs':
        setUnit('ms');
        break;
      case 'ms':
        setUnit('s');
        break;
      case 's':
        setUnit('ns');
        break;
    }
  };

  const selectTrace = (trace: Trace) => {
    if (trace !== selectedTrace) {
      const visualizationPaused = renderingStore.visualizationPaused;
      if (!visualizationPaused) {
        renderingStore.pauseVisualizationUpdating(true);
      }
      setSelectedTrace(trace);
      const traceSteps = getSortedTraceSpans(trace);

      if (traceSteps.length > 0) {
        const [firstStep] = traceSteps;
        highlightTrace(trace, firstStep.spanId);
      }
    } else {
      // Reset highlighting when highlighted trace is clicked again
      if (!renderingStore.visualizationPaused) {
        renderingStore.resumeVisualizationUpdating();
      }
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
  }, [selectedTrace, removeHighlighting]);

  return (
    <div>
      <TraceSelection
        selectTrace={selectTrace}
        structureData={structureData}
        applicationTraces={applicationTraces}
        selectedTrace={selectedTrace!}
        unit={unit}
        toggleUnit={toggleUnit}
      />

      {selectedTrace && (
        <TraceReplayerMain
          selectedTrace={selectedTrace}
          structureData={structureData}
          renderingLoop={renderingLoop}
        />
      )}
    </div>
  );
};

export default TraceSelectionAndReplayer;
