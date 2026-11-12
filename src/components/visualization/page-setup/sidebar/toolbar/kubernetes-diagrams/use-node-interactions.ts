import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { usePingStore } from 'explorviz-frontend/src/stores/ping-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { removeAllHighlighting, toggleHighlightById } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { useHighlights } from 'explorviz-frontend/src/utils/collaboration/highlights';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/ping-animation';
import { useCallback, useMemo, useState } from 'react';

const PING_DURATION_MS = 3000;

/**
 * Manages all highlighting and ping interactions for nodes in the kubernetes diagram.
 *
 * Highlighting merges two sources:
 * - localHighlightedNodeNames: nodes highlighted directly in the diagram sidebar
 * - the highlighted entities (utils/collaboration/highlights): nodes highlighted on the 3D canvas
 *
 * A click on a node that has a matching canvas city toggles the highlight of that city.
 * A click on a node with no canvas match toggles the local (sidebar-only) highlight.
 */
export function useNodeInteractions() {
  const getAllCities = useModelStore((state) => state.getAllCities);
  const lookAtEntity = useCameraControlsStore((state) => state.lookAtEntity);
  const highlightedEntityIds = useHighlights((ids) => ids);
  const activePingNodeNames = usePingStore((state) => state.activePingNodeNames);

  const [localHighlightedNodeNames, setLocalHighlightedNodeNames] = useState<Set<string>>(() => new Set());

  const highlightedNodeNames = useMemo(() => {
    const names = new Set<string>(localHighlightedNodeNames);
    for (const city of getAllCities()) {
      if (highlightedEntityIds.has(city.id)) {
        names.add(city.name);
      }
    }
    return names;
  }, [getAllCities, highlightedEntityIds, localHighlightedNodeNames]);

  const handleNodeHighlight = useCallback(
    (nodeName: string) => {
      const matchingCity = getAllCities().find((city) => city.name === nodeName);
      if (matchingCity) {
        toggleHighlightById(matchingCity.id);
      } else {
        setLocalHighlightedNodeNames((prev) => {
          const next = new Set(prev);
          next.has(nodeName) ? next.delete(nodeName) : next.add(nodeName);
          return next;
        });
      }
    },
    [getAllCities]
  );

  const handleNodePing = useCallback(
    (nodeName: string) => {
      const matchingCity = getAllCities().find((city) => city.name === nodeName);
      if (matchingCity) {
        pingByModelId(matchingCity.id, false, { durationMs: PING_DURATION_MS });
      } else {
        usePingStore.getState().addPing(nodeName, PING_DURATION_MS);
      }
    },
    [getAllCities]
  );

  const handleNodeLookAt = useCallback(
    (nodeName: string) => {
      const matchingCity = getAllCities().find((city) => city.name === nodeName);
      if (matchingCity) {
        lookAtEntity(matchingCity.id);
      }
    },
    [getAllCities, lookAtEntity]
  );

  const clearHighlighting = useCallback(() => {
    setLocalHighlightedNodeNames(new Set());
    removeAllHighlighting();
  }, []);

  const resetView = async () => {
    useCameraControlsStore.getState().resetCamera();
  };

  return {
    highlightedNodeNames,
    activePingNodeNames,
    handleNodeHighlight,
    handleNodePing,
    handleNodeLookAt,
    clearHighlighting,
    resetView,
  };
}
