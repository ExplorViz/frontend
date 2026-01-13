import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  insertApplicationToLandscape,
  insertClassesToLandscape,
  removeComponentFromLandscape,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

interface EditingContextData {
  canGoBack: boolean;
  canGoForward: boolean;
  addApplication: (name: string, classes: string[]) => string | undefined;
  addClasses: (id: string, classes: string[]) => void;
  removeComponent: (id: string) => void;
  goBack: () => void;
  goForward: () => void;
  reset: () => void;
}

export const EditingContext = createContext<EditingContextData>({
  canGoBack: false,
  canGoForward: false,
  addApplication: () => undefined,
  addClasses: () => {},
  removeComponent: () => {},
  goBack: () => {},
  goForward: () => {},
  reset: () => {},
});
EditingContext.displayName = 'EditingContext';

export function EditingProvider({ children }: PropsWithChildren) {
  const [landscapeData, setLandscapeData] = useRenderingServiceStore(
    useShallow((state) => [state._landscapeData, state.setLandscapeData])
  );
  const { actions, removedComponentIds } = useVisualizationStore();
  const [history, setHistory] = useState<[LandscapeData, Set<string>][]>([]);

  // always +1 of the currently rendered element in history
  const [editingCursor, setEditingCursor] = useState(0);
  const hasInitializedHistory = useRef(false);

  const addToHistory = useCallback(
    (landscapeData: LandscapeData, removedIds?: Set<string>) => {
      setHistory((prevHistory) => {
        const currentCursor = editingCursor;
        return [
          ...prevHistory.slice(0, currentCursor),
          [
            structuredClone(landscapeData),
            removedComponentIds.union(removedIds || new Set<string>()),
          ],
        ];
      });
      setLandscapeData(landscapeData);
      setEditingCursor((cursor) => cursor + 1);
      if (removedIds) {
        actions.setRemovedComponents(removedIds);
      }
    },
    [removedComponentIds, editingCursor, actions, setLandscapeData]
  );

  const reset = useCallback(() => {
    setHistory([]);
    setEditingCursor(0);
  }, []);

  useEffect(() => {
    // Initialize history with the current state on first render when landscapeData is available
    if (
      !hasInitializedHistory.current &&
      landscapeData &&
      history.length === 0
    ) {
      hasInitializedHistory.current = true;
      setHistory([[structuredClone(landscapeData), removedComponentIds]]);
      setEditingCursor(1);
    }
    // Reset history when landscapeData is null
    if (!landscapeData && history.length > 0) {
      reset();
      hasInitializedHistory.current = false;
    }
  }, [landscapeData, history.length, reset, removedComponentIds]);

  const canGoBack = editingCursor > 1;
  const canGoForward = editingCursor < history.length;

  const addApplication = useCallback(
    (name: string, classes: string[]) => {
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
    },
    [landscapeData, addToHistory]
  );

  const addClasses = useCallback(
    (id: string, classes: string[]) => {
      if (!landscapeData) return;

      const structureLandscapeData = insertClassesToLandscape(
        landscapeData.structureLandscapeData,
        id,
        classes
      );

      addToHistory({
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
        structureLandscapeData,
      });
    },
    [landscapeData, addToHistory]
  );

  const removeComponent = useCallback(
    (id: string) => {
      if (!landscapeData) return;

      const [structureLandscapeData, removedIds] = removeComponentFromLandscape(
        landscapeData.structureLandscapeData,
        id
      );
      addToHistory(
        {
          dynamicLandscapeData: landscapeData.dynamicLandscapeData,
          structureLandscapeData,
        },
        removedIds
      );
    },
    [landscapeData, addToHistory]
  );

  const goBack = useCallback(() => {
    if (editingCursor <= 1) return;
    const [previousLandscapeData, previousRemovedIds] =
      history[editingCursor - 2];
    setLandscapeData(previousLandscapeData);
    actions.setRemovedComponents(previousRemovedIds);
    setEditingCursor((cursor) => cursor - 1);
  }, [setLandscapeData, actions, editingCursor, history]);

  const goForward = useCallback(() => {
    if (editingCursor >= history.length) return;
    const [nextLandscapeData, nextRemovedIds] = history[editingCursor];
    setLandscapeData(nextLandscapeData);
    actions.setRemovedComponents(nextRemovedIds);
    setEditingCursor((cursor) => cursor + 1);
  }, [setLandscapeData, actions, editingCursor, history]);

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
