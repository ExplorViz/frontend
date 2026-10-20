import {
  Comm,
  CommSummary,
  MetricRange,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { create } from 'zustand';

interface CommunicationState {
  allCommunication: CommSummary | null;
  communicationById: Map<string, Comm>;
  metrics: { [key: string]: MetricRange } | null;

  setCommunications: (allCommunications: CommSummary | null) => void;
}

export const useCommunicationStore = create<CommunicationState>((set) => ({
  allCommunication: null,
  communicationById: new Map(),
  metrics: null,

  setCommunications: (allCommunications: CommSummary | null) =>
    set({
      allCommunication: allCommunications,
      communicationById: new Map<string, Comm>(
        allCommunications?.communications.map(
          (comm) => [comm.id, comm] as const
        ) ?? []
      ),
      metrics: allCommunications?.metrics ?? null,
    }),
}));
