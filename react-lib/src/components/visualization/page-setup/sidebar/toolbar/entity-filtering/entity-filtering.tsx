import React, { useEffect, useRef } from 'react';

import Button from 'react-bootstrap/Button';
import TraceFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/trace-filtering/trace-filtering';
import StructureFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/structure-filtering';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  NEW_SELECTED_TIMESTAMP_EVENT,
  useTimestampStore,
} from 'explorviz-frontend/src/stores/timestamp';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';

interface EntityFilteringProps {
  readonly landscapeData: LandscapeData;
}

export default function EntityFiltering({
  landscapeData,
}: EntityFilteringProps) {
  const timestamp = useTimestampStore((state) => state.timestamp);
  const updateSelectedTimestamp = useTimestampStore(
    (state) => state.updateSelectedTimestamp
  );

  const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );

  const initialLandscapeData = useRef<LandscapeData>(landscapeData);

  const resetToInit = () => {
    triggerRenderingForGivenLandscapeData(
      initialLandscapeData.current!.structureLandscapeData,
      initialLandscapeData.current!.dynamicLandscapeData
    );
    updateSelectedTimestamp(timestamp);
  };

  const resetState = () => {
    // reset state, since new timestamp has been loaded
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
      <TraceFiltering landscapeData={landscapeData} />

      <h6 className="text-center">
        <u>Structure Filtering</u>
      </h6>
      <StructureFiltering landscapeData={landscapeData} />
    </>
  );
}
