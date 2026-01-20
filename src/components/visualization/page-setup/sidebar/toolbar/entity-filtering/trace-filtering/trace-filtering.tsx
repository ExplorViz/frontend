import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import TraceStart, {
  TraceStartHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/trace-filtering/trace-start';
import TraceDuration, {
  TraceDurationHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/trace-filtering/trace-duration';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';

interface TraceFilteringProps {
  readonly landscapeData: LandscapeData;
}

export type TraceFilteringHandle = {
  setMinDuration: (value: number) => void;
  setMinStartTimestamp: (value: number) => void;
  reset: () => void;
};

const TraceFiltering = forwardRef<TraceFilteringHandle, TraceFilteringProps>(
  function TraceFiltering({ landscapeData }: TraceFilteringProps, ref) {
    const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
      (state) => state.triggerRenderingForGivenLandscapeData
    );

    const [
      numRemainingTracesAfterFilteredByDuration,
      setNumRemainingTracesAfterFilteredByDuration,
    ] = useState<number>(landscapeData.dynamicLandscapeData.length);
    const [
      numRemainingTracesAfterFilteredByStarttime,
      setNumRemainingTracesAfterFilteredByStarttime,
    ] = useState<number>(landscapeData.dynamicLandscapeData.length);

    const [initialLandscapeData, setInitialLandscapeData] =
      useState<LandscapeData>(landscapeData);

    const traceStartRef = useRef<TraceStartHandle>(null);
    const traceDurationRef = useRef<TraceDurationHandle>(null);

    const selectedMinDuration = useRef<number>(0);
    const selectedMinStartTimestamp = useRef<number>(0);

    const traceCount = (() => {
      const tracesThatAreRendered: Trace[] = structuredClone(
        landscapeData.dynamicLandscapeData
      );

      const hashCodeClassMap = getHashCodeToClassMap(
        landscapeData.structureLandscapeData
      );

      for (let i = tracesThatAreRendered.length - 1; i >= 0; i--) {
        for (const span of tracesThatAreRendered[i].spanList) {
          if (!hashCodeClassMap.get(span.methodHash)) {
            // single span of trace is missing in structure data, then skip complete trace
            tracesThatAreRendered.splice(i, 1);
            break;
          }
        }
      }

      return tracesThatAreRendered.length;
    })();

    const _triggerRenderingForGivenLandscapeData = () => {
      let numFilter = 0;

      // hide all traces that begin before selected timestamp
      let newTraces = initialLandscapeData!.dynamicLandscapeData.filter((t) => {
        if (t.startTime >= selectedMinStartTimestamp.current!) {
          numFilter++;
          return true;
        }

        return false;
      });
      setNumRemainingTracesAfterFilteredByStarttime(numFilter);
      numFilter = 0;

      // hide all traces that have a strict lower duration than selected
      newTraces = newTraces.filter((t) => {
        if (t.duration >= selectedMinDuration.current!) {
          numFilter++;
          return true;
        }

        return false;
      });
      setNumRemainingTracesAfterFilteredByDuration(numFilter);
      numFilter = 0;

      triggerRenderingForGivenLandscapeData(
        landscapeData.structureLandscapeData,
        newTraces
      );
    };

    const resetState = () => {
      // reset state, since new timestamp has been loaded

      setInitialLandscapeData(landscapeData);

      setNumRemainingTracesAfterFilteredByDuration(
        landscapeData.dynamicLandscapeData.length
      );

      setNumRemainingTracesAfterFilteredByStarttime(
        landscapeData.dynamicLandscapeData.length
      );

      selectedMinDuration.current = 0;
      selectedMinStartTimestamp.current = 0;
    };

    const updateDuration = (newMinDuration: number) => {
      selectedMinDuration.current = newMinDuration;
      _triggerRenderingForGivenLandscapeData();
    };

    const updateStartTimestamp = (newMinStartTimestamp: number) => {
      selectedMinStartTimestamp.current = newMinStartTimestamp;
      _triggerRenderingForGivenLandscapeData();
    };

    useEffect(() => {
      eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
      return () => {
        eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
        triggerRenderingForGivenLandscapeData(
          initialLandscapeData.structureLandscapeData,
          initialLandscapeData.dynamicLandscapeData
        );
      };
    }, []);

    useImperativeHandle(ref, () => ({
      setMinDuration: (value: number) => traceDurationRef.current?.setValue(value),
      setMinStartTimestamp: (value: number) => traceStartRef.current?.setValue(value),
      reset: () => {
        resetState();
        traceStartRef.current?.reset();
        traceDurationRef.current?.reset();
      },
    }));

    return (
      initialLandscapeData && (
        <>
          <h6 className="mb-3 mt-3">
            <strong>
              Traces (# shown:
              {traceCount}/{initialLandscapeData!.dynamicLandscapeData.length})
            </strong>
          </h6>

          <TraceStart
            ref={traceStartRef}
            traces={landscapeData.dynamicLandscapeData}
            updateStartTimestamp={updateStartTimestamp}
            remainingTraceCount={numRemainingTracesAfterFilteredByStarttime}
            initialTraceCount={
              initialLandscapeData!.dynamicLandscapeData.length
            }
          />

          <TraceDuration
            ref={traceDurationRef}
            traces={landscapeData.dynamicLandscapeData}
            updateDuration={updateDuration}
            remainingTraceCount={numRemainingTracesAfterFilteredByDuration}
            initialTraceCount={
              initialLandscapeData!.dynamicLandscapeData.length
            }
          />
        </>
      )
    );
  }
);

export default TraceFiltering;
