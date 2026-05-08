import TraceReplayerControls from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-controls';
import TraceSelection from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-selection';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {
  DynamicLandscapeData,
  Trace,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  FlatLandscape,
  getFunctionIdToBuildingMap,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { getSortedTraceSpans } from 'explorviz-frontend/src/utils/trace-helpers';
import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export type TimeUnit = 'ns' | 'μs' | 'ms' | 's';

interface TraceSelectionAndReplayerProps {
  highlightTrace: (trace: Trace, traceStep: string) => void;
  removeHighlighting: () => void;
  dynamicData: DynamicLandscapeData;
  flatData: FlatLandscape;
}

const TraceSelectionAndReplayer: React.FC<TraceSelectionAndReplayerProps> = ({
  highlightTrace,
  removeHighlighting,
  dynamicData,
  flatData,
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

  const functionIdToBuildingMap = getFunctionIdToBuildingMap(flatData);

  const applicationTraces = dynamicData.filter((trace) => {
    return trace.spanList.some(
      (span) => functionIdToBuildingMap.get(span.functionId) !== undefined
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
        flatData={flatData}
        applicationTraces={applicationTraces}
        selectedTrace={selectedTrace}
        unit={unit}
        toggleUnit={toggleUnit}
      />

      {selectedTrace && (
        <TraceReplayerControls
          selectedTrace={selectedTrace}
          flatData={flatData}
        />
      )}
    </div>
  );
};

export default TraceSelectionAndReplayer;
