import {
  Comm,
  CommSummary,
  MetricRange,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { create } from 'zustand';

interface CommunicationState {
  communications: Map<string, Comm>;
  metrics: { [key: string]: MetricRange } | null;
  setCommunications: (
    aggregatedBuildingCommunication: CommSummary | null
  ) => void;
}

export const useCommunicationStore = create<CommunicationState>((set) => ({
  communications: new Map(),
  metrics: null,
  setCommunications: (allCommunications) => {
    const communicationsMap = new Map<string, Comm>();
    allCommunications?.communications.forEach((comm) => {
      communicationsMap.set(comm.id, comm);
    });

    set({
      metrics: allCommunications?.metrics ?? null,
      communications: communicationsMap,
    });
  },
}));
