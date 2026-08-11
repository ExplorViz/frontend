import { forwardRef, Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { EntityFilteringController } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import FqnFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/fqn-filtering/fqn-filtering';
import LanguageFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/language-filtering/language-filtering';
import StructureFiltering from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/structure-filtering';
import {
  EntityFilterMode,
  useEntityFilteringStore,
} from 'explorviz-frontend/src/stores/entity-filtering-store';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import Button from 'react-bootstrap/Button';
import { useShallow } from 'zustand/react/shallow';
import { StructureFilteringHandle } from './structure-filtering/structure-filtering';

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
  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const structureFilteringRef = useRef<StructureFilteringHandle>(null);

  const {
    filterMode,
    inclusionExpressions,
    exclusionExpressions,
    setFilterMode,
    setInclusionExpressions,
    setExclusionExpressions,
    setMinMethodCount,
    resetFilters,
  } = useEntityFilteringStore(
    useShallow((state) => ({
      filterMode: state.filterMode,
      inclusionExpressions: state.inclusionExpressions,
      exclusionExpressions: state.exclusionExpressions,
      setFilterMode: state.actions.setFilterMode,
      setInclusionExpressions: state.actions.setInclusionExpressions,
      setExclusionExpressions: state.actions.setExclusionExpressions,
      setMinMethodCount: state.actions.setMinMethodCount,
      resetFilters: state.actions.resetFilters,
    }))
  );

  useImperativeHandle(ref, () => ({
    applyFilters: ({ minClassMethodCount }) => {
      if (minClassMethodCount !== undefined) {
        setMinMethodCount(minClassMethodCount);
      }
    },
    reset: () => {
      resetFilters();
    },
  }));

  const resetState = () => {
    initialLandscapeData.current = landscapeData;
  };

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    return () => {
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
              setFilterMode(event.target.value as EntityFilterMode)
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
        <u>FQN Filtering</u>
      </h6>
      <FqnFiltering
        inclusionExpressions={inclusionExpressions}
        exclusionExpressions={exclusionExpressions}
        onInclusionChange={setInclusionExpressions}
        onExclusionChange={setExclusionExpressions}
      />

      <hr className="dropdown-divider mb-3" />
      <h6 className="text-center mt-2">
        <u>Structure Filtering</u>
      </h6>
      <StructureFiltering
        ref={structureFilteringRef}
        flatLandscapeData={landscapeData.flatLandscapeData}
      />
      <div className="mt-4 mb-2 col text-center">
        <Button variant="outline-secondary" onClick={() => resetFilters()}>
          Reset All Filters
        </Button>
      </div>
    </>
  );
});

export default EntityFiltering;
