import { createStore } from "zustand/vanilla";

interface TimestampPollingState {
  timer: NodeJS.Timeout | null;
}

export const useTimestampPollingStore = createStore<TimestampPollingState>(
  () => ({
    timer: null,
  })
);
