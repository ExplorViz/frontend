import { useRemoteHighlightingStore } from 'explorviz-frontend/src/stores/collaboration/remote-highlighting-store';
import { myPlayer, usePlayersList } from 'playroomkit';
import { useEffect } from 'react';

// This component is responsible to synchronizte highlighted entities of other users in the current room

export default function CollaborationHighlightingSync() {
    const players = usePlayersList(true);
    const me = myPlayer();
    const setRemoteHighlights = useRemoteHighlightingStore((state) => state.setRemoteHighlights);

    // Whenever a player is changing its state (or a new player joins), recompute the list of remote highlights
    // By completely recomputing the list, all highlights of a user that disconnects are delted automatically
    useEffect(() => {
        const newHighlights = new Map<string, { userId: string, color: string }>();

        players.forEach((player) => {
            // Ignore the own highlights. Those are saved in a seperate store
            if (me && player.id === me.id) return;

            const highlights = player.getState('highlightedEntities');
            const profile = player.getProfile();

            if (Array.isArray(highlights)) {
                highlights.forEach((entityId) => {
                    if (typeof entityId === 'string') {
                        newHighlights.set(entityId, {
                            userId: player.id,
                            color: profile.color.hexString
                        });
                    }
                });
            }
        });

        setRemoteHighlights(newHighlights);

    }, [players, me, setRemoteHighlights]);

    // this component is only resonsible for synchronization, so ther is no UI for it.
    return null;
}