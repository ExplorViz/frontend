import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';

// A data type to hold all arrays important for opening/closing districts
type DistrictStructureState = {
    closed: string[];
    hiddenDistricts: string[];
    hiddenBuildings: string[];
};

export default function CollaborationComponentSync() {
    // Get the global component state
    const [globalStructure, setGlobalStructure] = useMultiplayerState<DistrictStructureState>('componentStructure', {
        closed: [],
        hiddenDistricts: [],
        hiddenBuildings: []
    });

    const localClosed = useVisualizationStore((state) => state.closedDistrictIds);
    const localHiddenDistricts = useVisualizationStore((state) => state.hiddenDistrictIds);
    const localHiddenBuildings = useVisualizationStore((state) => state.hiddenBuildingIds);

    const lastSyncedStringRef = useRef<string>("");

    // Check for first render (to prevent resetting everything once a player joins)
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Get the current local state
        const localPayload = {
            closed: Array.from(localClosed || []).sort(),
            hiddenDistricts: Array.from(localHiddenDistricts || []).sort(),
            hiddenBuildings: Array.from(localHiddenBuildings || []).sort()
        };
        const localString = JSON.stringify(localPayload);

        // Get the current global state
        const globalString = JSON.stringify({
            closed: (globalStructure?.closed || []).sort(),
            hiddenDistricts: (globalStructure?.hiddenDistricts || []).sort(),
            hiddenBuildings: (globalStructure?.hiddenBuildings || []).sort()
        });

        // If this is the first render, overwrite local state with global one
        if (isFirstRender.current) {
            isFirstRender.current = false;

            if (globalString !== JSON.stringify({ closed: [], hiddenDistricts: [], hiddenBuildings: [] })) {
                lastSyncedStringRef.current = globalString;
                useVisualizationStore.setState({
                    closedDistrictIds: new Set(globalStructure?.closed || []),
                    hiddenDistrictIds: new Set(globalStructure?.hiddenDistricts || []),
                    hiddenBuildingIds: new Set(globalStructure?.hiddenBuildings || [])
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
                closedDistrictIds: new Set(globalStructure?.closed || []),
                hiddenDistrictIds: new Set(globalStructure?.hiddenDistricts || []),
                hiddenBuildingIds: new Set(globalStructure?.hiddenBuildings || [])
            });
            return;
        }

    }, [localClosed, localHiddenDistricts, localHiddenBuildings, globalStructure, setGlobalStructure]);

    return null;
}