import { createStore } from 'zustand/vanilla';

interface HighlightingState {
    hoveredOnHighlightedMesh: boolean;
}

export const useHighlightingStore = createStore<HighlightingState>(() => ({
    hoveredOnHighlightedMesh: false,
}));

