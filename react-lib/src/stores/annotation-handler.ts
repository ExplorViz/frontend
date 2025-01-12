import { createStore } from 'zustand/vanilla';
// import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';

interface AnnotationHandlerState{
    // annotationData: AnnotationData[];
    // minimizedAnnotations: AnnotationData[];
    latestMousePosition: {timestamp: number, x: number, y: number};
    isShiftPressed: boolean;
}

export const useAnnotationHandlerStore= createStore<AnnotationHandlerState>(() => ({
    latestMousePosition: {timestamp: 0, x: 0, y: 0},
    isShiftPressed: false,
}));