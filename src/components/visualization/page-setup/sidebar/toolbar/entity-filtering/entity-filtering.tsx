import { forwardRef, Ref, useEffect, useImperativeHandle, useRef } from 'react';

import StructureFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/structure-filtering';
import TraceFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/trace-filtering/trace-filtering';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {
  NEW_SELECTED_TIMESTAMP_EVENT,
  useTimestampStore,
} from 'explorviz-frontend/src/stores/timestamp';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import Button from 'react-bootstrap/Button';
import { TraceFilteringHandle } from './trace-filtering/trace-filtering';
import { StructureFilteringHandle } from './structure-filtering/structure-filtering';
import { EntityFilteringController } from 'explorviz-frontend/src/components/chatbot/chatbot-context';

interface EntityFilteringProps {
  readonly landscapeData: LandscapeData;
}

const EntityFiltering = forwardRef<
  EntityFilteringController,
  EntityFilteringProps
>(function EntityFiltering(
  { landscapeData }: EntityFilteringProps,
  ref: Ref<EntityFilteringController>
) {
  const timestamp = useTimestampStore((state) => state.timestamp);
  const updateSelectedTimestamp = useTimestampStore(
    (state) => state.updateSelectedTimestamp
  );

  const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );

  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const traceFilteringRef = useRef<TraceFilteringHandle>(null);
  const structureFilteringRef = useRef<StructureFilteringHandle>(null);

  useImperativeHandle(ref, () => ({
    applyFilters: ({
      minTraceStartTimestamp,
      minTraceDuration,
      minClassMethodCount,
    }) => {
      if (minTraceStartTimestamp !== undefined) {
        traceFilteringRef.current?.setMinStartTimestamp(minTraceStartTimestamp);
      }
      if (minTraceDuration !== undefined) {
        traceFilteringRef.current?.setMinDuration(minTraceDuration);
      }
      if (minClassMethodCount !== undefined) {
        structureFilteringRef.current?.setMinMethodCount(minClassMethodCount);
      }
    },
    reset: () => {
      traceFilteringRef.current?.reset();
      structureFilteringRef.current?.reset();
    },
  }));

  const resetToInit = () => {
    triggerRenderingForGivenLandscapeData(
      initialLandscapeData.current!.structureLandscapeData,
      initialLandscapeData.current!.dynamicLandscapeData
    );
    updateSelectedTimestamp(timestamp);
  };

  const resetState = () => {
    // Reset state, since new timestamp has been loaded
    initialLandscapeData.current = landscapeData;
  };

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    return () => {
      triggerRenderingForGivenLandscapeData(
        initialLandscapeData.current!.structureLandscapeData,
        initialLandscapeData.current!.dynamicLandscapeData
      );
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    };
  }, []);

  return (
    <>
      <div className="mt-2 mb-2 col text-center">
        <Button variant="outline-secondary" onClick={resetToInit}>
          Reset Filtering
        </Button>
      </div>

      <hr className="dropdown-divider mb-3" />

      <h6 className="text-center">
        <u>Trace Filtering</u>
      </h6>
      <TraceFiltering ref={traceFilteringRef} landscapeData={landscapeData} />

      <h6 className="text-center">
        <u>Structure Filtering</u>
      </h6>
      <StructureFiltering
        ref={structureFilteringRef}
        landscapeData={landscapeData}
      />
    </>
  );
});

export default EntityFiltering;
