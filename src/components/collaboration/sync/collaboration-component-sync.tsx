import { usePlayroomConnectionStore } from 'explorviz-frontend/src/stores/collaboration/playroom-connection-store';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  deserializeClosedDistricts,
  serializeClosedDistricts,
} from 'explorviz-frontend/src/utils/city-rendering/district-close-state';
import { useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';

type DistrictStructureState = {
  closed: string[];
  hiddenDistricts: string[];
};

export default function CollaborationComponentSync() {
  const isConnected = usePlayroomConnectionStore((state) => state.isConnected);

  const [globalStructure, setGlobalStructure] =
    useMultiplayerState<DistrictStructureState>('componentStructure', {
      closed: [],
      hiddenDistricts: [],
    });

  const localClosed = useVisualizationStore((state) => state.closedDistrictIds);
  const localHiddenDistricts = useVisualizationStore(
    (state) => state.hiddenDistrictIds
  );

  const lastSyncedStringRef = useRef<string>('');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isConnected) {
      isFirstRender.current = true;
      return;
    }

    const localPayload = {
      closed: serializeClosedDistricts(localClosed || new Set()),
      hiddenDistricts: Array.from(localHiddenDistricts || []).sort(),
    };
    const localString = JSON.stringify(localPayload);

    const globalString = JSON.stringify({
      closed: (globalStructure?.closed || []).sort(),
      hiddenDistricts: (globalStructure?.hiddenDistricts || []).sort(),
    });

    if (isFirstRender.current) {
      isFirstRender.current = false;

      if (
        globalString !== JSON.stringify({ closed: [], hiddenDistricts: [] })
      ) {
        lastSyncedStringRef.current = globalString;
        useVisualizationStore.setState({
          closedDistrictIds: deserializeClosedDistricts(
            globalStructure?.closed || []
          ),
          hiddenDistrictIds: new Set(globalStructure?.hiddenDistricts || []),
        });
      } else {
        lastSyncedStringRef.current = localString;
      }
      return;
    }

    if (localString === globalString) return;

    if (localString !== lastSyncedStringRef.current) {
      lastSyncedStringRef.current = localString;
      setGlobalStructure(localPayload);
      return;
    }

    if (globalString !== lastSyncedStringRef.current && globalStructure) {
      lastSyncedStringRef.current = globalString;

      useVisualizationStore.setState({
        closedDistrictIds: deserializeClosedDistricts(
          globalStructure?.closed || []
        ),
        hiddenDistrictIds: new Set(globalStructure?.hiddenDistricts || []),
      });
      return;
    }
  }, [
    localClosed,
    localHiddenDistricts,
    globalStructure,
    setGlobalStructure,
    isConnected,
  ]);

  return null;
}
