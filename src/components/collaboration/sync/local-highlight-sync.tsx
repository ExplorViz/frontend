import { useLocalHighlightStore } from "explorviz-frontend/src/stores/collaboration/local-highlight-store";
import { useRemoteHighlightingStore } from "explorviz-frontend/src/stores/collaboration/remote-highlighting-store";
import { useVisualizationStore } from "explorviz-frontend/src/stores/visualization-store";
import { myPlayer } from "playroomkit";
import { useEffect, useRef } from "react";

// This component functions as a middle ware: It combines the local and remote highlights into a single list that is read by the renderer
export default function LocalHighlightSync() {
    const me = myPlayer();
    const localHighlights = useLocalHighlightStore((state) => state.localHighlightedIds);
    const remoteHighlights = useRemoteHighlightingStore((state) => state.remoteHighlights);

    const lastCombinedRef = useRef<string>("");

    useEffect(() => {
        let combinedSet: Set<string>;

        if (me) {
            combinedSet = localHighlights.union(new Set(remoteHighlights.keys()));
        } else {
            combinedSet = localHighlights;
        }

        // Only override the 3D city when there actually has been a change
        const currentString = Array.from(combinedSet).sort().join(',');

        if (lastCombinedRef.current !== currentString) {
            lastCombinedRef.current = currentString;
            useVisualizationStore.setState({ highlightedEntityIds: combinedSet });
        }

    }, [localHighlights, remoteHighlights, me]);

    return null;
}