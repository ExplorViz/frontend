import {
  forwardRef,
  Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { EntityFilteringController } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import LanguageFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/language-filtering/language-filtering';
import StructureFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/structure-filtering';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {
  NEW_SELECTED_TIMESTAMP_EVENT,
  useTimestampStore,
} from 'explorviz-frontend/src/stores/timestamp';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import Button from 'react-bootstrap/Button';
import { StructureFilteringHandle } from './structure-filtering/structure-filtering';

interface EntityFilteringProps {
  readonly landscapeData: LandscapeData;
}

type FilterMode = 'Hide' | 'Remove';

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
  const structureFilteringRef = useRef<StructureFilteringHandle>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('Remove');

  useImperativeHandle(ref, () => ({
    applyFilters: ({ minClassMethodCount }) => {
      if (minClassMethodCount !== undefined) {
        structureFilteringRef.current?.setMinMethodCount(minClassMethodCount);
      }
    },
    reset: () => {
      structureFilteringRef.current?.reset();
    },
  }));

  const resetToInit = () => {
    triggerRenderingForGivenLandscapeData(
      initialLandscapeData.current!.flatLandscapeData,
      initialLandscapeData.current!.dynamicLandscapeData,
      initialLandscapeData.current!.aggregatedFileCommunication
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
        initialLandscapeData.current!.flatLandscapeData,
        initialLandscapeData.current!.dynamicLandscapeData,
        initialLandscapeData.current!.aggregatedFileCommunication
      );
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    };
  }, []);

  return (
    <>
      <h6 className="text-center">
        <u>Filter Mode</u>
      </h6>
      <div className="mb-3">
        <div className="d-flex align-items-center gap,">
          <label className="form-label m-0" htmlFor="entity-filter-mode">
            Filter Mode:
          </label>
          <select
            id="entity-filter-mode"
            className="form-select mt-1"
            value={filterMode}
            onChange={(event) =>
              setFilterMode(event.target.value as FilterMode)
            }
          >
            <option value="Hide">Hide</option>
            <option value="Remove">Remove</option>
          </select>
        </div>
      </div>
      <hr className="dropdown-divider mb-3" />
      <h6 className="text-center">
        <u>Language Filtering</u>
      </h6>
      <LanguageFiltering />

      <hr className="dropdown-divider mb-3" />
      <h6 className="text-center mt-2">
        <u>Structure Filtering</u>
      </h6>
      <StructureFiltering
        ref={structureFilteringRef}
        landscapeData={landscapeData}
        flatLandscapeData={landscapeData.flatLandscapeData}
        filterMode={filterMode}
      />
      <div className="mt-4 mb-2 col text-center">
        <Button variant="outline-secondary" onClick={resetToInit}>
          Reset Filtering
        </Button>
      </div>
    </>
  );
});

export default EntityFiltering;
