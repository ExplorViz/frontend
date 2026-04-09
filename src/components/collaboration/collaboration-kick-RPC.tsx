import { usePlayroomConnectionStore } from 'explorviz-frontend/src/stores/collaboration/playroom-connection-store';
import { RPC, myPlayer } from 'playroomkit';
import { useEffect } from 'react';

// This component registers the kick RPC. It gets called when the current user gets kicked from a room
export function CollaborationKickRPC() {
    useEffect(() => {
        const me = myPlayer();
        if (!me) return;

        RPC.register('kick_player', async (targetId: string) => {
            const currentPlayer = myPlayer();

            if (currentPlayer && currentPlayer.id === targetId) {
                alert("The host kicked you from the current room.");
                usePlayroomConnectionStore.getState().disconnect();
            }
        });
    }, []);

    return null;
}