import { createStore } from 'zustand/vanilla';
// import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
export type VisualizationMode = 'runtime' | 'evolution';

interface RenderingServiceState{
    previousMethodHashes: string[];
    // currentRuntimeLandscapeData: Map<string, LandscapeData>;
    // _timelineDataObjectHandler: TimelineDataObjectHandler | null;
    // _landscapeData: LandscapeData | null;
    _visualizationPaused: boolean;
    _visualizationMode: VisualizationMode;
    _userInitiatedStaticDynamicCombination: boolean;
}

export const useRenderingServiceStore= createStore<RenderingServiceState>(() => ({
    previousMethodHashes: [],
    _visualizationPaused: false,
    _visualizationMode: 'runtime',
    _userInitiatedStaticDynamicCombination: false,
}));