import {
  AggregatedBuildingCommunication,
  CommunicationDto,
  MetricSummary,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import { create } from 'zustand';

interface CommunicationState {
  metrics: { [key: string]: MetricSummary } | null;
  communications: Map<string, CommunicationDto>;
  setCommunications: (
    aggregatedBuildingCommunication: AggregatedBuildingCommunication | null
  ) => void;
}

export const useCommunicationStore = create<CommunicationState>((set) => ({
  metrics: null,
  communications: new Map(),
  setCommunications: (allCommunications) => {
    const communicationsMap = new Map<string, CommunicationDto>();
    allCommunications?.communications.forEach((comm) => {
      communicationsMap.set(comm.id, comm);
    });

    set({
      metrics: allCommunications?.metrics ?? null,
      communications: communicationsMap,
    });
  },
}));
