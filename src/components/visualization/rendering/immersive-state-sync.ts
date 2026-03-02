import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useWebSocketStore } from 'explorviz-frontend/src/stores/collaboration/web-socket';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { IMMERSIVE_VIEW_UPDATE_EVENT, ImmersiveViewUpdateMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/immersive-view-update';
import { useEffect, useRef } from 'react';

// This component sends a message to the collaboration service whenever immersive view is entered or closed
// This component is not visible!
export default function ImmersiveStateSync() {
    const activeMeshId = useImmersiveViewStore((state) => state.activeMeshId);
    const isOnline = useCollaborationSessionStore((state) => state.isOnline);

    const previousMeshIdRef = useRef<string | null>(null);

    // Execute this code whenever something changes with the immersive mode
    useEffect(() => {
        if (!isOnline()) return;

        const webSocket = useWebSocketStore.getState();

        // Entering immserive mode
        if (activeMeshId && activeMeshId !== previousMeshIdRef.current) {
            webSocket.send<ImmersiveViewUpdateMessage>(IMMERSIVE_VIEW_UPDATE_EVENT, {
                event: IMMERSIVE_VIEW_UPDATE_EVENT,
                classId: activeMeshId,
                didEnterView: true,
            });
            previousMeshIdRef.current = activeMeshId;
        }

        // Closing immerisve mode
        else if (!activeMeshId && previousMeshIdRef.current) {
            webSocket.send<ImmersiveViewUpdateMessage>(IMMERSIVE_VIEW_UPDATE_EVENT, {
                event: IMMERSIVE_VIEW_UPDATE_EVENT,
                classId: previousMeshIdRef.current,
                didEnterView: false,
            });
            previousMeshIdRef.current = null;
        }

    }, [activeMeshId, isOnline]);

    return null;
}