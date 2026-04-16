import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';

// A data type to hold all arrays important for opening/closing components
type ComponentStructureState = {
    closed: string[];
    hiddenComps: string[];
    hiddenClasses: string[];
};

export default function CollaborationComponentSync() {
    // Get the global component state
    const [globalStructure, setGlobalStructure] = useMultiplayerState<ComponentStructureState>('componentStructure', {
        closed: [],
        hiddenComps: [],
        hiddenClasses: []
    });

    const localClosed = useVisualizationStore((state) => state.closedComponentIds);
    const localHiddenComps = useVisualizationStore((state) => state.hiddenComponentIds);
    const localHiddenClasses = useVisualizationStore((state) => state.hiddenClassIds);

    const lastSyncedStringRef = useRef<string>("");

    // Check for first render (to prevent resetting everything once a plaer joins)
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Get the current local state
        const localPayload = {
            closed: Array.from(localClosed).sort(),
            hiddenComps: Array.from(localHiddenComps).sort(),
            hiddenClasses: Array.from(localHiddenClasses).sort()
        };
        const localString = JSON.stringify(localPayload);

        // Get the current global state
        const globalString = JSON.stringify({
            closed: (globalStructure?.closed || []).sort(),
            hiddenComps: (globalStructure?.hiddenComps || []).sort(),
            hiddenClasses: (globalStructure?.hiddenClasses || []).sort()
        });

        // If this is the first render, overwrite local state with global one
        if (isFirstRender.current) {
            isFirstRender.current = false;

            if (globalString !== JSON.stringify({ closed: [], hiddenComps: [], hiddenClasses: [] })) {
                lastSyncedStringRef.current = globalString;
                useVisualizationStore.setState({
                    closedComponentIds: new Set(globalStructure?.closed || []),
                    hiddenComponentIds: new Set(globalStructure?.hiddenComps || []),
                    hiddenClassIds: new Set(globalStructure?.hiddenClasses || [])
                });
            } else {
                lastSyncedStringRef.current = localString;
            }
            return;
        }

        // If local and global stat are the same => Nothing changed
        if (localString === globalString) return;

        // If there has been a local change, update the global state
        if (localString !== lastSyncedStringRef.current) {
            lastSyncedStringRef.current = localString;
            setGlobalStructure(localPayload);
            return;
        }

        // If there has been a global change, update the local lists
        if (globalString !== lastSyncedStringRef.current) {
            lastSyncedStringRef.current = globalString;

            useVisualizationStore.setState({
                closedComponentIds: new Set(globalStructure?.closed || []),
                hiddenComponentIds: new Set(globalStructure?.hiddenComps || []),
                hiddenClassIds: new Set(globalStructure?.hiddenClasses || [])
            });
            return;
        }

    }, [localClosed, localHiddenComps, localHiddenClasses, globalStructure, setGlobalStructure]);

    return null;
}