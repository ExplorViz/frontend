import { createStore } from 'zustand/vanilla';

interface TimestampState {
    timestamp: Map<string, number[]>;
}

export const useTimestampStore = createStore<TimestampState>(() => ({
    timestamp: new Map(),
}));