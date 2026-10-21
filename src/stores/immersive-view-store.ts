import { FileDetailedDto } from 'explorviz-frontend/src/utils/landscape-schemes/file-detailed-data';
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

export function buildFallbackImmersiveInfo(building: {
  name: string;
  fqn?: string;
}): ImmersiveInfo {
  return {
    name: building.name,
    fqn: building.fqn ?? building.name,
    extends: [],
    implements: [],
    methods: [],
    variables: [],
  };
}

interface ImmersiveViewState {
  activeMeshId: string | null;
  targetPosition: THREE.Vector3 | null;
  activeMetadata: ImmersiveInfo | null;
  fileDetailedData: FileDetailedDto | null;
  /** True after the enter animation; keeps CameraControls props in immersive mode across re-renders. */
  cameraLocked: boolean;
  /**
   * Building whose label should follow immersive height (stays set during
   * restore after exit so the label can animate down with the building).
   */
  immersiveLabelBuildingId: string | null;
  /** Target height for that label (grown while inside, normal height while restoring). */
  immersiveBuildingHeight: number | null;

  enterImmersive: (
    id: string,
    target: THREE.Vector3,
    info?: ImmersiveInfo,
    detailedData?: FileDetailedDto
  ) => void;
  exitImmersive: () => void;
  setCameraLocked: (locked: boolean) => void;
  setImmersiveBuildingHeight: (
    buildingId: string | null,
    height: number | null
  ) => void;
}

export const useImmersiveViewStore = create<ImmersiveViewState>((set) => ({
  activeMeshId: null,
  targetPosition: null,
  activeMetadata: null,
  fileDetailedData: null,
  cameraLocked: false,
  immersiveLabelBuildingId: null,
  immersiveBuildingHeight: null,

  enterImmersive: (id, target, info, detailedData) =>
    set({
      activeMeshId: id,
      targetPosition: target,
      activeMetadata: info || null,
      fileDetailedData: detailedData || null,
      cameraLocked: false,
      // Keep prior label follow until grow sets the new height; avoid clearing
      // mid-restore if re-entering quickly.
      immersiveLabelBuildingId: id,
    }),

  exitImmersive: () =>
    set({
      activeMeshId: null,
      targetPosition: null,
      activeMetadata: null,
      fileDetailedData: null,
      cameraLocked: false,
      // Do not clear immersiveLabelBuildingId / immersiveBuildingHeight —
      // the building restore animation drives the label back down.
    }),

  setCameraLocked: (locked) => set({ cameraLocked: locked }),
  setImmersiveBuildingHeight: (buildingId, height) =>
    set({
      immersiveLabelBuildingId: buildingId,
      immersiveBuildingHeight: height,
    }),
}));
