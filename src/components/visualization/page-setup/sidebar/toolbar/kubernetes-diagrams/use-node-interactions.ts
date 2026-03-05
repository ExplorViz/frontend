import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { usePingStore } from 'explorviz-frontend/src/stores/ping-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { removeAllHighlighting } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import { useCallback, useMemo, useState } from 'react';

const PING_DURATION_MS = 3000;

/**
 * Manages all highlighting and ping interactions for nodes in the kubernetes diagram.
 *
 * Highlighting merges two sources:
 * - localHighlightedNodeNames: nodes highlighted directly in the diagram sidebar
 * - highlightedEntityIds from the visualization store: nodes highlighted on the 3D canvas
 *
 * A click on a node that has a matching canvas application toggles the shared store highlight.
 * A click on a node with no canvas match toggles the local (sidebar-only) highlight.
 */
export function useNodeInteractions() {
  const getAllApplications = useModelStore((state) => state.getAllApplications);
  const lookAtEntity = useCameraControlsStore((state) => state.lookAtEntity);
  const highlightedEntityIds = useVisualizationStore(
    (state) => state.highlightedEntityIds
  );
  const setHighlightedEntityId = useVisualizationStore(
    (state) => state.actions.setHighlightedEntityId
  );
  const activePingNodeNames = usePingStore((state) => state.activePingNodeNames);

  const [localHighlightedNodeNames, setLocalHighlightedNodeNames] = useState<Set<string>>(
    () => new Set()
  );

  const highlightedNodeNames = useMemo(() => {
    const names = new Set<string>(localHighlightedNodeNames);
    for (const app of getAllApplications()) {
      if (highlightedEntityIds.has(app.id)) {
        names.add(app.name);
      }
    }
    return names;
  }, [getAllApplications, highlightedEntityIds, localHighlightedNodeNames]);

  const handleNodeHighlight = useCallback(
    (nodeName: string) => {
      const matchingApp = getAllApplications().find((app) => app.name === nodeName);
      if (matchingApp) {
        setHighlightedEntityId(matchingApp.id, !highlightedEntityIds.has(matchingApp.id));
      } else {
        setLocalHighlightedNodeNames((prev) => {
          const next = new Set(prev);
          next.has(nodeName) ? next.delete(nodeName) : next.add(nodeName);
          return next;
        });
      }
    },
    [getAllApplications, highlightedEntityIds, setHighlightedEntityId]
  );

  const handleNodePing = useCallback(
    (nodeName: string) => {
      const matchingApp = getAllApplications().find((app) => app.name === nodeName);
      if (matchingApp) {
        pingByModelId(matchingApp.id, false, { durationMs: PING_DURATION_MS });
      } else {
        usePingStore.getState().addPing(nodeName, PING_DURATION_MS);
      }
    },
    [getAllApplications]
  );

  const handleNodeLookAt = useCallback(
    (nodeName: string) => {
      const matchingApp = getAllApplications().find((app) => app.name === nodeName);
      if (matchingApp) {
        lookAtEntity(matchingApp.id);
      }
    },
    [getAllApplications, lookAtEntity]
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
