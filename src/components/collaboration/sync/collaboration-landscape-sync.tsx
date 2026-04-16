import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { isHost, useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';

export default function CollaborationLandscapeSync() {
    const localToken = useLandscapeTokenStore((state) => state.token);
    const setTokenByValue = useLandscapeTokenStore((state) => state.setTokenByValue);
    const [globalTokenValue, setGlobalTokenValue] = useMultiplayerState<string | null>('globalLandscapeToken', null);
    const lastGlobalRef = useRef<string | null>(null);

    // When host: Notify everyone else that the landscape has been changed
    useEffect(() => {
        if (!isHost()) return;

        const currentLocalValue = localToken?.value || null;

        if (currentLocalValue && currentLocalValue !== globalTokenValue) {
            setGlobalTokenValue(currentLocalValue);
        }
    }, [localToken, globalTokenValue, setGlobalTokenValue]);

    // When not host: Listen on host to change landscape
    useEffect(() => {
        if (isHost()) return;

        if (globalTokenValue && globalTokenValue !== lastGlobalRef.current) {
            lastGlobalRef.current = globalTokenValue as string;

            setTokenByValue(globalTokenValue as string);
        }
    }, [globalTokenValue, setTokenByValue]);

    return null;
}