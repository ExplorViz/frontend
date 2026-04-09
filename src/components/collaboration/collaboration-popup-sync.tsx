import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { getState, myPlayer, setState, useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';

// This component snychronizes the global popup list with the local popup list
export function CollaborationPopupSync() {
    const [globalPopups] = useMultiplayerState('sharedPopups', {});
    // Safe the curently opened popups (locally)
    const lastPinnedRefs = useRef<string[]>([]);

    // Observe the global popups list
    useEffect(() => {
        const currentGlobal = globalPopups || {};

        // Open the new popups locally
        Object.keys(currentGlobal).forEach((entityId) => {
            const isLocallyOpen = usePopupHandlerStore.getState().popupData.find((p) => p.entityId === entityId);
            if (!isLocallyOpen) {
                usePopupHandlerStore.getState().addPopup({
                    entityId: entityId,
                    pinned: true,
                    sharedBy: currentGlobal[entityId],
                });
            }
        });

        // close popups that has been closed
        usePopupHandlerStore.getState().popupData.forEach((popup) => {
            if (popup.isPinned && currentGlobal[popup.entityId] === undefined) {
                usePopupHandlerStore.getState().removePopup(popup.entityId);
            }
        });
    }, [globalPopups]);

    // Use this effect whenever a popup is opened/closed locally
    useEffect(() => {
        const me = myPlayer();
        if (!me) return;

        // Listen to the ocal popup handler
        const unsubscribe = usePopupHandlerStore.subscribe((state) => {
            const currentGlobal = { ...(getState('sharedPopups') || {}) };
            const currentPinnedIds = state.popupData.filter(p => p.isPinned).map(p => p.entityId);
            let hasChanges = false;

            // Did the user opened somethiong locally? Or did the change occured because of someone else in the room
            currentPinnedIds.forEach(id => {
                if (currentGlobal[id] === undefined) {
                    currentGlobal[id] = me.getState('name') || me.id;
                    hasChanges = true;
                }
            });

            // Did the user closed somethiong locally? Or did the change occured because of someone else in the room
            lastPinnedRefs.current.forEach(id => {
                if (!currentPinnedIds.includes(id) && currentGlobal[id] !== undefined) {
                    delete currentGlobal[id];
                    hasChanges = true;
                }
            });

            // If there has been changes (locally), then upload them
            if (hasChanges) {
                setState('sharedPopups', currentGlobal);
            }

            lastPinnedRefs.current = currentPinnedIds;
        });

        return () => unsubscribe();
    }, []);

    return null;
}