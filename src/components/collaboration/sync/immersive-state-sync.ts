import { myPlayer } from 'playroomkit';
import { useEffect } from 'react';
import { useImmersiveViewStore } from '../../../stores/immersive-view-store';

// This component syncs the current players state with immersive view
// (Write in the player state if and where the current player is in imersive view)
export default function ImmersiveStateSync() {
    const activeMeshId = useImmersiveViewStore((state) => state.activeMeshId);

    // As soon as the activeMeshId changes, update the player state
    useEffect(() => {
        const me = myPlayer();
        if (!me) return;
        me.setState('immersiveMeshId', activeMeshId || null);

    }, [activeMeshId]);

    return null;
}