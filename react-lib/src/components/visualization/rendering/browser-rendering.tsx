import React, { useRef, useState } from 'react';

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

export default function BrowserRendering({}: BrowserRenderingProps) {
  // MARK: Stores

  const getOpenApplications = useApplicationRendererStore(
    (state) => state.getOpenApplications
  );

  // MARK: State

  const [landscape3D, setLandscape3D] = useState<Landscape3D | null>(null);
  const [updateLayout, setUpdateLayout] = useState<boolean>(false);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
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
}

type TickCallback = {
  id: string;
  callback: (delta: number, frame?: XRFrame) => void;
};
