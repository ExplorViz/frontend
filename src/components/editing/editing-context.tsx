import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useRenderingServiceStore } from '../../stores/rendering-service';
import { useVisualizationStore } from '../../stores/visualization-store';
import {
  insertApplicationToLandscape,
  insertClassesToLandscape,
  removeComponentFromLandscape,
  SimpleClass,
} from '../../utils/landscape-structure-helpers';
import { EditingContext } from './editing-context-store';

export function EditingProvider({ children }: PropsWithChildren) {
  const [landscapeData, setLandscapeData] = useRenderingServiceStore(
    useShallow((state) => [state._landscapeData, state.setLandscapeData])
  );
  const { actions, removedDistrictIds: removedComponentIds } = useVisualizationStore();
  const [history, setHistory] = useState<[LandscapeData, Set<string>][]>([]);

  // always +1 of the currently rendered element in history
  const [editingCursor, setEditingCursor] = useState(0);

  const addToHistory = (editedLandscapeData: LandscapeData, removedIds?: Set<string>) => {
    // The history starts with the landscape as it was before the first edit. That copy is only taken now:
    // copying every landscape as it is loaded held up loading and kept a second copy of it in memory.
    const landscapeBeforeFirstEdit = editingCursor === 0 ? landscapeData : null;

    setHistory((prevHistory) => {
      const entriesBefore: [LandscapeData, Set<string>][] =
        prevHistory.length === 0 && landscapeBeforeFirstEdit
          ? [[structuredClone(landscapeBeforeFirstEdit), removedComponentIds]]
          : prevHistory.slice(0, editingCursor);
      return [
        ...entriesBefore,
        [structuredClone(editedLandscapeData), removedComponentIds.union(removedIds || new Set<string>())],
      ];
    });
    setLandscapeData(editedLandscapeData);
    setEditingCursor((cursor) => (cursor === 0 && landscapeBeforeFirstEdit ? 2 : cursor + 1));
    if (removedIds) {
      actions.setRemovedDistricts(removedIds);
    }
  };

  const reset = () => {
    setHistory([]);
    setEditingCursor(0);
  };

  useEffect(() => {
    // Reset history when landscapeData is null
    if (!landscapeData && history.length > 0) {
      reset();
    }
  }, [landscapeData, history.length, reset]);

  const canGoBack = editingCursor > 1;
  const canGoForward = editingCursor < history.length;

  const addApplication = (name: string, classes: SimpleClass[]) => {
    if (!landscapeData) return;

    const [structureLandscapeData, id] = insertApplicationToLandscape(
      landscapeData.structureLandscapeData,
      name,
      classes
    );

    addToHistory({
      dynamicLandscapeData: landscapeData.dynamicLandscapeData,
      structureLandscapeData,
    });

    return id;
  };

  const addClasses = (id: string, classes: SimpleClass[]) => {
    if (!landscapeData) return;

    const structureLandscapeData = insertClassesToLandscape(landscapeData.structureLandscapeData, id, classes);

    addToHistory({
      dynamicLandscapeData: landscapeData.dynamicLandscapeData,
      structureLandscapeData,
    });
  };

  const removeComponent = (id: string) => {
    if (!landscapeData) return;

    const [structureLandscapeData, removedIds] = removeComponentFromLandscape(landscapeData.structureLandscapeData, id);
    addToHistory(
      {
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
        structureLandscapeData,
      },
      removedIds
    );
  };

  const goBack = () => {
    if (editingCursor <= 1) return;
    const [previousLandscapeData, previousRemovedIds] = history[editingCursor - 2];
    setLandscapeData(previousLandscapeData);
    actions.setRemovedDistricts(previousRemovedIds);
    setEditingCursor((cursor) => cursor - 1);
  };

  const goForward = () => {
    if (editingCursor >= history.length) return;
    const [nextLandscapeData, nextRemovedIds] = history[editingCursor];
    setLandscapeData(nextLandscapeData);
    actions.setRemovedDistricts(nextRemovedIds);
    setEditingCursor((cursor) => cursor + 1);
  };

  return (
    <EditingContext
      value={{
        canGoBack,
        canGoForward,
        addApplication,
        addClasses,
        removeComponent,
        goBack,
        goForward,
        reset,
      }}
    >
      {children}
    </EditingContext>
  );
}
