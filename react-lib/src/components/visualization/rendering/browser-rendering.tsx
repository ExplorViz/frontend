import React, { useEffect, useRef, useState } from 'react';

import { useShallow } from 'zustand/react/shallow';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import { Position2D } from 'react-lib/src/hooks/interaction-modifier';
import { usePopupHandlerStore } from 'react-lib/src/stores/popup-handler';
import RenderingLoop from 'react-lib/src/rendering/application/rendering-loop';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useConfigurationStore } from 'react-lib/src/stores/configuration';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useLandscapeRestructureStore } from 'react-lib/src/stores/landscape-restructure';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import {
  moveCameraTo,
  updateColors,
} from 'react-lib/src/utils/application-rendering/entity-manipulation';
import {
  Span,
  Trace,
} from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { useSpectateUserStore } from 'react-lib/src/stores/collaboration/spectate-user';
import {
  EntityMesh,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import IdeWebsocket from 'react-lib/src/ide/ide-websocket';
import IdeCrossCommunication from 'react-lib/src/ide/ide-cross-communication';
import { removeAllHighlightingFor } from 'react-lib/src/utils/application-rendering/highlighting';
import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';
import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
import { useRoomSerializerStore } from 'react-lib/src/stores/collaboration/room-serializer';
import { useAnnotationHandlerStore } from 'react-lib/src/stores/annotation-handler';
import { SnapshotToken } from 'react-lib/src/stores/snapshot-token';
import { useAuthStore } from 'react-lib/src/stores/auth';
import GamepadControls from 'react-lib/src/utils/controls/gamepad/gamepad-controls';
import SemanticZoomManager from 'react-lib/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { ImmersiveView } from 'react-lib/src/rendering/application/immersive-view';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import { useMinimapStore } from 'react-lib/src/stores/minimap-service';
import Raycaster from 'react-lib/src/utils/raycaster';
import calculateHeatmap from 'react-lib/src/utils/calculate-heatmap';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import Landscape3D from 'react-lib/src/view-objects/3d/landscape/landscape-3d';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import LoadingIndicator from 'react-lib/src/components/visualization/rendering/loading-indicator.tsx';
import CollaborationOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener.tsx';
import VscodeExtensionOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings-opener.tsx';
import RestructureOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/restructure/restructure-opener.tsx';
import SettingsOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener.tsx';
import SnapshotOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener.tsx';
import TraceReplayerOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-opener.tsx';
import ApplicationSearchOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search-opener.tsx';
import EntityFilteringOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/entity-filtering-opener.tsx';
import HeatmapInfo from 'react-lib/src/components/heatmap/heatmap-info.tsx';
import VscodeExtensionSettings from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings.tsx';
import ApplicationSearch from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search.tsx';

interface BrowserRenderingProps {
  readonly id: string;
  readonly landscapeData: LandscapeData | null;
  readonly visualizationPaused: boolean;
  readonly isDisplayed: boolean;
  readonly snapshot: boolean | undefined | null;
  readonly snapshotReload: SnapshotToken | undefined | null;
  openSettingsSidebar(): void;
  toggleVisualizationUpdating(): void;
  switchToAR(): void;
}

// TODO: worker service???

export default function BrowserRendering({
  id,
  landscapeData,
  visualizationPaused,
  isDisplayed,
  snapshot,
  snapshotReload,
  openSettingsSidebar,
  toggleVisualizationUpdating,
  switchToAR,
}: BrowserRenderingProps) {
  // MARK: Stores

  const {
    getApplicationById,
    getOpenApplications,
    openAllComponentsOfAllApplications,
    toggleCommunicationRendering,
  } = useApplicationRendererStore(
    useShallow((state) => ({
      getApplicationById: state.getApplicationById,
      getOpenApplications: state.getOpenApplications,
      openAllComponentsOfAllApplications:
        state.openAllComponentsOfAllApplications,
      toggleCommunicationRendering: state.toggleCommunicationRendering,
    }))
  );

  const camera = useLocalUserStore((state) => state.defaultCamera);

  const { appSettings, colors, updateSetting } = useUserSettingsStore(
    useShallow((state) => ({
      appSettings: state.visualizationSettings,
      colors: state.colors,
      updateSetting: state.updateSetting,
    }))
  );

  const { isCommRendered, setSemanticZoomEnabled } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
      setSemanticZoomEnabled: state.setSemanticZoomEnabled,
    }))
  );

  const getScene = useSceneRepositoryStore((state) => state.getScene);

  const highlightingStoreActions = {
    highlightTrace: useHighlightingStore((state) => state.highlightTrace),
  };

  const {
    showInfoToastMessage,
    showSuccessToastMessage,
    showErrorToastMessage,
  } = useToastHandlerStore(
    useShallow((state) => ({
      showInfoToastMessage: state.showInfoToastMessage,
      showSuccessToastMessage: state.showSuccessToastMessage,
      showErrorToastMessage: state.showErrorToastMessage,
    }))
  );

  // MARK: State

  const [landscape3D, setLandscape3D] = useState<Landscape3D>(
    new Landscape3D()
  );
  const [updateLayout, setUpdateLayout] = useState<boolean>(false);
  const [scene, setScene] = useState<THREE.Scene>(getScene('browser', true));
  const [mousePosition, setMousePosition] = useState<Vector3>(
    new Vector3(0, 0, 0)
  );
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>('');

  // MARK: Refs

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  // TODO updatables (?)
  const tickCallbacks = useRef<TickCallback[]>([]);
  const renderingLoop = useRef<RenderingLoop | null>(null);
  const hoveredObject = useRef<EntityMesh | null>(null);
  const controls = useRef<MapControls | null>(null);
  const cameraControls = useRef<CameraControls | null>(null);
  const gamepadControls = useRef<GamepadControls | null>(null);
  const initDone = useRef<boolean>(false);
  const toggleForceAppearenceLayer = useRef<boolean>(false);
  const semanticZoomToggle = useRef<boolean>(false);
  const ideWebsocket = useRef<IdeWebsocket>(
    new IdeWebsocket(handleDoubleClickOnMeshIDEAPI, lookAtMesh)
  );
  const ideCrossCommunication = useRef<IdeCrossCommunication>(
    new IdeCrossCommunication(handleDoubleClickOnMeshIDEAPI, lookAtMesh)
  );

  // MARK: Variables

  const rightClickMenuItems = [
    { title: 'Reset View', action: resetView },
    {
      title: 'Open All Components',
      action: () => {
        if (
          appSettings.autoOpenCloseFeature.value == true &&
          appSettings.semanticZoomState.value == true
        ) {
          showErrorToastMessage(
            'Open All Components not useable when Semantic Zoom with auto open/close is enabled.'
          );
          return;
        }
        openAllComponentsOfAllApplications();
      },
    },
    {
      title: isCommRendered ? 'Hide Communication' : 'Add Communication',
      action: toggleCommunicationRendering,
    },
    { title: 'Enter AR', action: switchToAR },
  ];

  // MARK: Event handlers

  const getSelectedApplicationObject3D = () => {
    if (selectedApplicationId === '') {
      // TODO
      setSelectedApplicationId(getOpenApplications()[0].getModelId());
    }
    return getApplicationById(selectedApplicationId);
  };

  const getRaycastObjects = () => scene.children;

  const tick = async (delta: number) => {
    useCollaborationSessionStore
      .getState()
      .idToRemoteUser.forEach((remoteUser) => {
        remoteUser.update(delta); // TODO non-immutable update
      });
    if (initDone && useLinkRendererStore.getState()._flag) {
      useLinkRendererStore.getState().setFlag(false);
    }
  };

  const toggleSemanticZoom = () => {
    if (!SemanticZoomManager.instance.isEnabled) {
      SemanticZoomManager.instance.activate();
    } else {
      SemanticZoomManager.instance.deactivate();
    }
    updateSetting('semanticZoomState', SemanticZoomManager.instance.isEnabled);
    setSemanticZoomEnabled(SemanticZoomManager.instance.isEnabled);
  };

  const showSemanticZoomClusterCenters = () => {
    // Remove previous center points from scene
    const prevCenterPointList = scene.children.filter(
      (preCenterPoint) => preCenterPoint.name == 'centerPoints'
    );
    prevCenterPointList.forEach((preCenterPoint) => {
      scene.remove(preCenterPoint);
    });

    if (!SemanticZoomManager.instance.isEnabled) {
      return;
    }

    // Poll Center Vectors
    SemanticZoomManager.instance
      .getClusterCentroids()
      .forEach((centerPoint) => {
        // Create red material
        const xGroup = new THREE.Group();
        xGroup.name = 'centerPoints';
        const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // Create the first part of the "X" (a thin rectangle)
        const geometry = new THREE.BoxGeometry(0.1, 0.01, 0.01); // A long thin box
        const part1 = new THREE.Mesh(geometry, redMaterial);
        part1.rotation.z = Math.PI / 4; // Rotate 45 degrees

        // Create the second part of the "X"
        const part2 = new THREE.Mesh(geometry, redMaterial);
        part2.rotation.z = -Math.PI / 4; // Rotate -45 degrees

        // Add both parts to the scene
        xGroup.add(part1);
        xGroup.add(part2);

        // Set Position of X Group
        xGroup.position.copy(centerPoint);
        scene.add(xGroup);
      });
  };

  const highlightTrace = (trace: Trace, traceStep: string) => {
    const selectedObject3D = getSelectedApplicationObject3D();

    if (!landscapeData || !selectedObject3D) {
      return;
    }

    highlightingStoreActions.highlightTrace(
      trace,
      traceStep,
      selectedObject3D,
      landscapeData.structureLandscapeData
    );
  };

  const resetView = async () => {
    cameraControls.current!.resetCameraFocusOn(1.0, [landscape3D]);
  };

  // MARK: Effects

  useEffect(() => {
    scene.background = colors!.backgroundColor;

    useLocalUserStore
      .getState()
      .setDefaultCamera(new THREE.PerspectiveCamera());

    setSemanticZoomEnabled(SemanticZoomManager.instance.isEnabled);

    scene.add(landscape3D);
    tickCallbacks.current.push(
      { id: 'browser-rendering', callback: tick },
      { id: 'spectate-user', callback: useSpectateUserStore.getState().tick },
      { id: 'minimap', callback: useMinimapStore.getState().tick }
    );

    // TODO reset popupHandler state?

    ImmersiveView.instance.callbackOnEntering = () => {
      usePopupHandlerStore.getState().setDeactivated(true);
      usePopupHandlerStore.getState().clearPopups();
    };

    ImmersiveView.instance.callbackOnExit = () => {
      usePopupHandlerStore.getState().setDeactivated(false);
    };

    // Semantic Zoom Manager shows/removes all communication arrows due to high rendering time.
    // If the Semantic Zoom feature is enabled, all previously generated arrows are hidden.
    // After that, the manager decides on which level to show.
    // If it gets disabled, all previous arrows are restored.
    // All this is done by shifting layers.
    SemanticZoomManager.instance.registerActivationCallback((onOff) => {
      useLinkRendererStore
        .getState()
        .getAllLinks()
        .forEach((currentCommunicationMesh: ClazzCommunicationMesh) => {
          currentCommunicationMesh.getArrowMeshes().forEach((arrow) => {
            if (onOff) {
              arrow.layers.disableAll();
            } else {
              arrow.layers.set(0);
            }
          });
        });
      getOpenApplications().forEach((ap) => {
        ap.getCommMeshes().forEach((currentCommunicationMesh) => {
          currentCommunicationMesh.getArrowMeshes().forEach((arrow) => {
            if (onOff) {
              arrow.layers.disableAll();
            } else {
              arrow.layers.set(0);
            }
          });
        });
      });
    });
    // Loads the AutoOpenClose activation state from the settings.
    SemanticZoomManager.instance.toggleAutoOpenClose(
      appSettings.autoOpenCloseFeature.value
    );

    useApplicationRendererStore.getState().setLandscape3D(landscape3D);
  }, []);
}

type TickCallback = {
  id: string;
  callback: (delta?: number, frame?: XRFrame) => void;
};
