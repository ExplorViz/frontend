import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { getState, myPlayer, setState, useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';

// This component synchronizes the global popup list with the local popup list
export function CollaborationPopupSync() {
  const snapshotSelected = useSnapshotTokenStore(
    (state) => state.snapshotSelected
  );
  const [globalPopups] = useMultiplayerState('sharedPopups', {});
  const lastPinnedRefs = useRef<string[]>([]);

  useEffect(() => {
    if (snapshotSelected) {
      return;
    }

    const currentGlobal = globalPopups || {};

    Object.keys(currentGlobal).forEach((entityId) => {
      const isLocallyOpen = usePopupHandlerStore
        .getState()
        .popupData.find((p) => p.entityId === entityId);
      if (!isLocallyOpen) {
        usePopupHandlerStore.getState().addPopup({
          entityId: entityId,
          pinned: true,
          sharedBy: currentGlobal[entityId],
        });
      }
    });

    usePopupHandlerStore.getState().popupData.forEach((popup) => {
      if (popup.isPinned && currentGlobal[popup.entityId] === undefined) {
        usePopupHandlerStore.getState().removePopup(popup.entityId);
      }
    });
  }, [globalPopups, snapshotSelected]);

  useEffect(() => {
    if (snapshotSelected) {
      return;
    }

    const me = myPlayer();
    if (!me) {
      return;
    }

    const unsubscribe = usePopupHandlerStore.subscribe((state) => {
      const currentGlobal = { ...(getState('sharedPopups') || {}) };
      const currentSharedIds = state.popupData
        .filter((p) => p.sharedBy != null && p.sharedBy !== '')
        .map((p) => p.entityId);
      let hasChanges = false;

      currentSharedIds.forEach((id) => {
        if (currentGlobal[id] === undefined) {
          currentGlobal[id] = me.getState('name') || me.id;
          hasChanges = true;
        }
      });

      lastPinnedRefs.current.forEach((id) => {
        if (!currentSharedIds.includes(id) && currentGlobal[id] !== undefined) {
          delete currentGlobal[id];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setState('sharedPopups', currentGlobal);
      }

      lastPinnedRefs.current = currentSharedIds;
    });

    return () => unsubscribe();
  }, [snapshotSelected]);

  return null;
}
