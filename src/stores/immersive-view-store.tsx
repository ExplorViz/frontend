import * as THREE from 'three';
import { create } from 'zustand';

// This store is used to control the immersive view mode
// When you want to enter it, use the enter function, when you want to leave it, use the exit function.
// All other components using this always look at changes of the ID and the position to determine wether the system is currently
// in the immersive view mode or not (e.g. using the useEffect hook).

export interface MethodData {
    name: string;
    returnType: string;
    parameters: { name: string; type: string }[];
}

export interface VariableData {
    name: string;
    type: string;
}

export interface ImmersiveInfo {
    name: string;
    fqn: string;

    extends: string[];
    implements: string[];
    methods: MethodData[];
    variables: VariableData[];
}

interface ImmersiveViewState {
    activeMeshId: string | null;
    targetPosition: THREE.Vector3 | null;
    activeMetadata: ImmersiveInfo | null;

    enterImmersive: (id: string, target: THREE.Vector3, info?: ImmersiveInfo) => void;
    exitImmersive: () => void;
}

export const useImmersiveViewStore = create<ImmersiveViewState>((set) => ({
    activeMeshId: null,
    targetPosition: null,
    activeMetadata: null,

    enterImmersive: (id, target, info) =>
        set({
            activeMeshId: id,
            targetPosition: target,
            activeMetadata: info || null
        }),

    exitImmersive: () =>
        set({
            activeMeshId: null,
            targetPosition: null,
            activeMetadata: null
        }),
}));