import { Magnify } from '@malte-hansen/magnify-r3f';
import { CameraControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import type { XRStore } from '@react-three/xr';
import {
  createXRStore,
  IfInSessionMode,
  TeleportTarget,
  XR,
  XROrigin,
} from '@react-three/xr';
import { CollaborationKickRPC } from 'explorviz-frontend/src/components/collaboration/collaboration-kick-RPC';
import { CollaborationAnnotationSync } from 'explorviz-frontend/src/components/collaboration/sync/collaboration-annotation-sync';
import CollaborationCameraSync from 'explorviz-frontend/src/components/collaboration/sync/collaboration-camera-sync';
import CollaborationComponentSync from 'explorviz-frontend/src/components/collaboration/sync/collaboration-component-sync';
import CollaborationHighlightingSync from 'explorviz-frontend/src/components/collaboration/sync/collaboration-highlighting-sync';
import { PlayroomPlayersProvider } from 'explorviz-frontend/src/components/collaboration/playroom-players-context';
import CollaborationLandscapeSync from 'explorviz-frontend/src/components/collaboration/sync/collaboration-landscape-sync';
import CollaborationPingSync from 'explorviz-frontend/src/components/collaboration/sync/collaboration-ping-sync';
import { CollaborationPopupSync } from 'explorviz-frontend/src/components/collaboration/sync/collaboration-popup-sync';
import ImmersiveStateSync from 'explorviz-frontend/src/components/collaboration/sync/immersive-state-sync';
import LocalHighlightSync from 'explorviz-frontend/src/components/collaboration/sync/local-highlight-sync';
import SpectateStatusSync from 'explorviz-frontend/src/components/collaboration/sync/spectate-status-sync';
import PlayroomWrapper from 'explorviz-frontend/src/components/collaboration/visualization/rendering/playroom-wrapper';
import SnapshotCameraRestore from 'explorviz-frontend/src/components/visualization/rendering/snapshot-camera-restore';
import SpectateCameraController from 'explorviz-frontend/src/components/visualization/rendering/spectate-camera-controller';
import RemoteImmersiveIndicators from 'explorviz-frontend/src/components/visualization/rendering/remote-immersive-indicators';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import {
  CLICK_PREVENTION_DEFAULTS,
  maxPointerDriftDuringDelay,
} from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { emitContextMenuFromWorld } from 'explorviz-frontend/src/utils/context-menu-bridge';
import { contextMenuPickAt } from 'explorviz-frontend/src/utils/context-menu-world-pick';
import {
  INITIAL_CAMERA_POSITION,
  useCameraControls,
} from 'explorviz-frontend/src/stores/camera-controls-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { calculateAggregatedCommunications } from 'explorviz-frontend/src/utils/city-rendering/communication-computer';
import ControllerMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus-r3f/controller-menu';
import {
  isBuilding,
  isCity,
  isDistrict,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import layoutLandscape from 'explorviz-frontend/src/utils/layout/elk-layouter';
import AutoDistrictOpenerR3F from 'explorviz-frontend/src/view-objects/3d/auto-district-opener-r3f';
import { AnimatedPing } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import CodeCity from 'explorviz-frontend/src/view-objects/3d/city/code-city';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/city/communication-r3f';
import globalBundlingService from 'explorviz-frontend/src/view-objects/3d/city/global-bundling-service';
import { HAPSystemManager } from 'explorviz-frontend/src/view-objects/3d/city/hap-system-manager';
import ImmersiveSphere from 'explorviz-frontend/src/view-objects/3d/city/immersive-sphere';
import ImmersiveInterface from 'explorviz-frontend/src/view-objects/3d/city/ImmersiveInterface';
import TraceReplayOverlayR3F from 'explorviz-frontend/src/view-objects/3d/city/trace-replay-overlay-r3f';
import ClusterCentroidsR3F from 'explorviz-frontend/src/view-objects/3d/cluster-centroids-r3f';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import {
  type MouseEvent as ReactMouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import ContextMenuWorldPickRegister from './context-menu-world-pick-register';
import HotkeyHandler from './hotkey-handler';
import ImmersiveCameraHandler from './immersive-view-camrea-handler';
import MinimapView from './minimap-view';

/**
 * Helper component to configure the main camera's layers.
 * Must be placed inside the Canvas to access the R3F state.
 */
function CameraLayerHandler() {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    // The main camera should be able to see all labels
    camera.layers.enableAll();
  }, [camera]);

  return null;
}

export default function CanvasWrapper({
  landscapeData,
  xrStore,
}: {
  landscapeData: LandscapeData | null;
  xrStore?: XRStore | undefined;
}) {
  const layoutMap = useLayoutStore((state) => state.fullLayoutMap);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const floorTexture = useLoader(
    THREE.TextureLoader,
    'extended-reality/images/materials/floor.jpg'
  );
  floorTexture.repeat.set(200, 200);
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;

  const hapSystemManager = HAPSystemManager.getInstance();

  const directionalLightRef = useRef(null);

  const {
    cityLayoutAlgorithm,
    districtLayoutAlgorithm,
    cityLabelMargin,
    cityAspectRatio,
    cityDistance,
    cityMargin,
    cameraFar,
    cameraFov,
    cameraNear,
    castShadows,
    districtLabelPlacement,
    buildingFootprint,
    buildingLayoutAlgorithm,
    buildingWidthMetric,
    buildingMetricMapping,
    buildingWidthMultiplier,
    buildingDepthMetric,
    buildingDepthMultiplier,
    buildingMargin,
    closedDistrictHeight,
    openedDistrictHeight,
    enableClustering,
    autoOpenCloseDistricts,
    districtLabelMargin,
    districtMargin,
    sceneBackgroundColor,
    showAxesHelper,
    showFpsCounter,
    showLightHelper,
    spiralCenterOffset,
    spiralGap,
    leftMouseButtonAction,
    middleMouseButtonAction,
    mouseWheelAction,
    rightMouseButtonAction,
    isMagnifierActive,
    magnifierZoom,
    magnifierExponent,
    magnifierRadius,
    magnifierOutlineColor,
    magnifierOutlineThickness,
    magnifierAntialias,
  } = useUserSettingsStore(
    useShallow((state) => ({
      cityLayoutAlgorithm:
        state.visualizationSettings.cityLayoutAlgorithm.value,
      districtLayoutAlgorithm:
        state.visualizationSettings.districtLayoutAlgorithm.value,
      cityLabelMargin: state.visualizationSettings.cityLabelMargin,
      cityAspectRatio: state.visualizationSettings.cityAspectRatio,
      cityDistance: state.visualizationSettings.cityDistance,
      cityMargin: state.visualizationSettings.cityMargin,
      cameraFar: state.visualizationSettings.cameraFar.value,
      cameraFov: state.visualizationSettings.cameraFov.value,
      cameraNear: state.visualizationSettings.cameraNear.value,
      castShadows: state.visualizationSettings.castShadows.value,
      buildingFootprint: state.visualizationSettings.buildingFootprint,
      buildingLayoutAlgorithm:
        state.visualizationSettings.buildingLayoutAlgorithm.value,
      buildingMargin: state.visualizationSettings.buildingMargin.value,
      buildingWidthMetric:
        state.visualizationSettings.buildingWidthMetric.value,
      buildingMetricMapping:
        state.visualizationSettings.buildingMetricMapping.value,
      buildingWidthMultiplier:
        state.visualizationSettings.buildingWidthMultiplier.value,
      buildingDepthMetric:
        state.visualizationSettings.buildingDepthMetric.value,
      buildingDepthMultiplier:
        state.visualizationSettings.buildingDepthMultiplier.value,
      closedDistrictHeight: state.visualizationSettings.closedDistrictHeight,
      districtLabelPlacement:
        state.visualizationSettings.districtLabelPlacement.value,
      colors: state.colors,
      openedDistrictHeight: state.visualizationSettings.openedDistrictHeight,
      enableClustering: state.visualizationSettings.enableClustering.value,
      autoOpenCloseDistricts:
        state.visualizationSettings.autoOpenCloseDistricts.value,
      districtLabelMargin: state.visualizationSettings.districtLabelMargin,
      districtMargin: state.visualizationSettings.districtMargin,
      sceneBackgroundColor: state.visualizationSettings.backgroundColor.value,
      showAxesHelper: state.visualizationSettings.showAxesHelper.value,
      showFpsCounter: state.visualizationSettings.showFpsCounter.value,
      showLightHelper: state.visualizationSettings.showLightHelper.value,
      spiralCenterOffset: state.visualizationSettings.spiralCenterOffset.value,
      spiralGap: state.visualizationSettings.spiralGap.value,
      leftMouseButtonAction:
        state.visualizationSettings.leftMouseButtonAction.value,
      mouseWheelAction: state.visualizationSettings.mouseWheelAction.value,
      rightMouseButtonAction:
        state.visualizationSettings.rightMouseButtonAction.value,
      middleMouseButtonAction:
        state.visualizationSettings.middleMouseButtonAction.value,
      isMagnifierActive: state.visualizationSettings.isMagnifierActive.value,
      magnifierZoom: state.visualizationSettings.magnifierZoom.value,
      magnifierExponent: state.visualizationSettings.magnifierExponent.value,
      magnifierRadius: state.visualizationSettings.magnifierRadius.value,
      magnifierOutlineColor:
        state.visualizationSettings.magnifierOutlineColor.value,
      magnifierOutlineThickness:
        state.visualizationSettings.magnifierOutlineThickness.value,
      magnifierAntialias: state.visualizationSettings.magnifierAntialias.value,
      visualizationSettings: state.visualizationSettings,
    }))
  );

  const { removedDistrictIds, closedDistrictIds } = useVisualizationStore(
    useShallow((state) => ({
      removedDistrictIds: state.removedDistrictIds,
      closedDistrictIds: state.closedDistrictIds,
    }))
  );

  const allApplications = useMemo(() => {
    return useModelStore
      .getState()
      .getAllCities()
      .filter((city) => !removedDistrictIds.has(city.id));
  }, [removedDistrictIds]);

  const getHAPPosition = useCallback(
    (element: any): THREE.Vector3 => {
      if (!layoutMap || !layoutMap.has(element.id)) {
        return new THREE.Vector3(0, 0, 0);
      }

      const layout = layoutMap.get(element.id)!;
      const level = isCity(element) ? 2 : isDistrict(element) ? 1 : 0;

      // Following the pattern from layout-helper.ts:getLandscapePositionOfModel
      // but without landscapeScalar since we're rendering inside the scaled landscape group

      if (isCity(element)) {
        // For cities: use position + (width/2, 0, depth/2) as center
        const modelPosition = new THREE.Vector3(
          layout.position.x + layout.width / 2,
          layout.position.y + level * 20,
          layout.position.z + layout.depth / 2
        );
        return modelPosition;
      }

      // For districts/buildings: use parent city as base offset
      const parentCityId = element.parentCityId;
      if (!parentCityId || !layoutMap.has(parentCityId)) {
        // Fallback: use layout center
        return new THREE.Vector3(
          layout.center.x,
          layout.position.y + level * 20,
          layout.center.z
        );
      }
      const cityLayout = layoutMap.get(parentCityId)!;

      // For districts/buildings: cityPosition + modelCenter
      const cityPosition = cityLayout.position.clone();
      const modelPosition = layout.center.clone();

      return new THREE.Vector3(
        cityPosition.x + modelPosition.x,
        modelPosition.y + level * 20,
        cityPosition.z + modelPosition.z
      );
    },
    [layoutMap]
  );

  const getLevel = useCallback((element: any): number => {
    if (isCity(element)) return 2;
    if (isDistrict(element)) return 1;
    if (isBuilding(element)) return 0;
    return 0;
  }, []);

  // Build HAP tree with optimized debouncing
  useEffect(() => {
    if (!layoutMap || allApplications.length === 0) {
      return;
    }

    // Use requestAnimationFrame to defer HAP tree building
    // This prevents blocking the main thread during initial render
    const handle = requestAnimationFrame(() => {
      hapSystemManager.buildLandscapeHAPTree(
        allApplications,
        getHAPPosition,
        getLevel
      );
    });

    return () => cancelAnimationFrame(handle);
  }, [layoutMap, allApplications, getHAPPosition, getLevel, hapSystemManager]);

  const cameraControlsRef = useRef<CameraControls>(null!);

  // Initialize camera controls store
  useCameraControls(cameraControlsRef);

  // Function to map setting values to camera controls mouse button constants
  const getMouseMapping = (action: string): number => {
    switch (action) {
      case 'NONE':
        return 0; // None
      case 'ROTATE':
        return 1; // ROTATE
      case 'TRUCK':
        return 2; // TRUCK
      case 'SCREEN_PAN':
        return 4; // SCREEN_PAN
      case 'OFFSET':
        return 8; // SCREEN_PAN
      case 'DOLLY':
        return 16; // DOLLY
      case 'ZOOM':
        return 32; // ZOOM
      default:
        return 0; // None
    }
  };

  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  useLandscapeDataWatcher(landscapeData);

  const { resetVisualizationState } = useVisualizationStore(
    useShallow((state) => ({
      resetVisualizationState: state.actions.resetVisualizationState,
    }))
  );

  const [position, setPosition] = useState(new THREE.Vector3());

  const { buildingCommunications, aggregatedCommunications } = useModelStore(
    useShallow((state) => ({
      buildingCommunications: state.buildingCommunications,
      aggregatedCommunications: state.aggregatedCommunications,
    }))
  );

  const allAggregatedCommunications = useMemo(
    () => Object.values(aggregatedCommunications),
    [aggregatedCommunications]
  );

  useEffect(() => {
    calculateAggregatedCommunications();
  }, [buildingCommunications, closedDistrictIds]);

  useEffect(() => {
    if (landscapeData) {
      // Reset edge bundling state when the landscape changes so stale edges
      // from a previous session do not prevent new edges from being registered.
      globalBundlingService.reset();

      // Clear all HAP systems so they are rebuilt fresh for the new landscape.
      hapSystemManager.clearAllHAPSystems();

      const allDistricts = useModelStore
        .getState()
        .getAllDistricts()
        .filter((district) => !removedDistrictIds.has(district.id));
      const districtIds = new Set(allDistricts.map((district) => district.id));

      const allBuildings = useModelStore
        .getState()
        .getAllBuildings()
        .filter((building) => !removedDistrictIds.has(building.id));
      const buildingIds = new Set(allBuildings.map((building) => building.id));

      const communicationIds = new Set(
        Object.values(buildingCommunications).map((comm) => comm.id)
      );

      const entityIds = new Set([
        ...districtIds,
        ...buildingIds,
        ...communicationIds,
      ]);

      // Remove all ids that are no longer part of the landscape
      useVisualizationStore.getState().actions.filterEntityIds(entityIds);
    }
  }, [landscapeData, buildingCommunications, removedDistrictIds, hapSystemManager]);

  const updateLayout = useCallback(async () => {
    if (!landscapeData) return;

    const layoutMap = await layoutLandscape(
      landscapeData.flatLandscapeData,
      removedDistrictIds
    );
    useLayoutStore.getState().updateLayouts(layoutMap);
  }, [landscapeData, removedDistrictIds]);

  useEffect(() => {
    updateLayout();
  }, [
    districtLabelPlacement,
    cityLabelMargin,
    cityAspectRatio,
    cityDistance,
    cityLayoutAlgorithm,
    cityMargin,
    buildingDepthMetric,
    buildingDepthMultiplier,
    buildingFootprint,
    buildingLayoutAlgorithm,
    buildingMargin,
    buildingWidthMetric,
    buildingMetricMapping,
    buildingWidthMultiplier,
    closedDistrictHeight,
    openedDistrictHeight,
    districtLabelMargin,
    districtLayoutAlgorithm,
    districtMargin,
    removedDistrictIds,
    spiralCenterOffset,
    spiralGap,
    updateLayout,
  ]);

  useEffect(() => {
    return () => {
      resetVisualizationState();
    };
  }, [resetVisualizationState]);

  const minimapEnabled = useUserSettingsStore(
    (state) => state.visualizationSettings.isMinimapEnabled.value
  );

  const { rightClickDelayMs, allowedDelta } = CLICK_PREVENTION_DEFAULTS;
  const emptyContextMenuTimeoutRef = useRef<number | null>(null);
  const emptyContextMenuDriftCleanupRef = useRef<(() => void) | null>(null);

  const clearPendingEmptyContextMenu = useCallback(() => {
    if (emptyContextMenuTimeoutRef.current !== null) {
      clearTimeout(emptyContextMenuTimeoutRef.current);
      emptyContextMenuTimeoutRef.current = null;
    }
    emptyContextMenuDriftCleanupRef.current?.();
    emptyContextMenuDriftCleanupRef.current = null;
  }, []);

  useEffect(() => () => clearPendingEmptyContextMenu(), [clearPendingEmptyContextMenu]);

  const onCanvasContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const hit = contextMenuPickAt(e.clientX, e.clientY);
      if (hit.kind !== 'empty') {
        return;
      }

      clearPendingEmptyContextMenu();
      e.preventDefault();

      const { cleanup, getMaxDistance } = maxPointerDriftDuringDelay(e.nativeEvent);
      emptyContextMenuDriftCleanupRef.current = cleanup;

      emptyContextMenuTimeoutRef.current = window.setTimeout(() => {
        emptyContextMenuTimeoutRef.current = null;
        cleanup();
        emptyContextMenuDriftCleanupRef.current = null;
        if (getMaxDistance() >= allowedDelta) {
          return;
        }
        emitContextMenuFromWorld(hit, e.nativeEvent);
      }, rightClickDelayMs);
    },
    [
      allowedDelta,
      clearPendingEmptyContextMenu,
      rightClickDelayMs,
    ]
  );

  return (
    <>
      <HotkeyHandler />
      <PlayroomWrapper>
        <Canvas
          id="three-js-canvas"
          className={'webgl'}
          gl={{
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
          }}
          style={{ background: sceneBackgroundColor }}
          onContextMenu={onCanvasContextMenu}
          onMouseMove={(e) => {
            if (isMagnifierActive) {
              setMousePos({
                x: e.clientX,
                y: window.innerHeight - e.clientY,
              });
            }
          }}
        >
          <PlayroomPlayersProvider>
          <ContextMenuWorldPickRegister />
          <ImmersiveCameraHandler
            controlsRef={cameraControlsRef}
          ></ImmersiveCameraHandler>
          {xrStore ? null : (
            <>
              <CameraControls
                ref={cameraControlsRef}
                dollySpeed={0.3}
                draggingSmoothTime={0.05}
                maxDistance={250}
                maxPolarAngle={0.5 * Math.PI}
                makeDefault
                minDistance={1}
                mouseButtons={{
                  left: getMouseMapping(leftMouseButtonAction) as any,
                  middle: getMouseMapping(middleMouseButtonAction) as any,
                  wheel: getMouseMapping(mouseWheelAction) as any,
                  right: getMouseMapping(rightMouseButtonAction) as any,
                }}
                smoothTime={0.5}
              />
              <PerspectiveCamera
                position={INITIAL_CAMERA_POSITION}
                fov={cameraFov}
                near={cameraNear}
                far={cameraFar}
                makeDefault
              />
              {/* Insert Layer Handler here inside the Canvas */}
              <CameraLayerHandler />
              <SnapshotCameraRestore />

              {minimapEnabled && (
                <MinimapView
                  mainCameraControls={cameraControlsRef}
                  landscapeData={landscapeData}
                />
              )}
              {isMagnifierActive && (
                <Magnify
                  position={mousePos}
                  zoom={magnifierZoom}
                  exp={magnifierExponent}
                  radius={magnifierRadius}
                  outlineColor={parseInt(
                    magnifierOutlineColor.replace('#', ''),
                    16
                  )}
                  outlineThickness={magnifierOutlineThickness}
                  antialias={magnifierAntialias}
                />
              )}
              <SpectateCameraController />
              <CollaborationCameraSync />
            </>
          )}
          <XR store={xrStore || createXRStore({ offerSession: false })}>
            <IfInSessionMode allow={['immersive-ar', 'immersive-vr']}>
              <XROrigin position={position}>
                <ControllerMenu handedness="left" />
                <ControllerMenu handedness="right" />
              </XROrigin>
              <TeleportTarget onTeleport={setPosition}>
                <Suspense>
                  <mesh
                    name="floor"
                    position={[0, -0.1, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <planeGeometry attach="geometry" args={[200, 200]} />
                    <meshBasicMaterial attach="material" map={floorTexture} />
                  </mesh>
                </Suspense>
              </TeleportTarget>
            </IfInSessionMode>
            <LandscapeR3F>
              {useModelStore
                .getState()
                .getAllCities()
                .map((city) => (
                  <CodeCity key={city.id} cityId={city.id} />
                ))}
              {isCommRendered &&
                layoutMap &&
                allAggregatedCommunications.map((communication) => (
                  <CommunicationR3F
                    key={communication.id}
                    communicationModel={communication}
                    applicationElement={useModelStore.getState().getCityForModel(
                      communication.sourceEntity.id
                    )}
                    layoutMap={layoutMap}
                  />
                ))}
            </LandscapeR3F>
            <RemoteImmersiveIndicators />
            {enableClustering && <ClusterCentroidsR3F />}
            {enableClustering && autoOpenCloseDistricts && (
              <AutoDistrictOpenerR3F />
            )}
            <AnimatedPing />
            <TraceReplayOverlayR3F />
            <ambientLight />
            <directionalLight
              name="DirectionalLight"
              ref={directionalLightRef}
              intensity={2}
              position={[5, 10, -20]}
              castShadow={castShadows}
            />
            {showLightHelper && directionalLightRef.current && (
              <directionalLightHelper
                args={[directionalLightRef.current, 2, 0x0000ff]}
              />
            )}
            {showFpsCounter && (
              <>
                <Stats showPanel={0} className="stats0" />
                <Stats showPanel={1} className="stats1" />
                <Stats showPanel={2} className="stats2" />
              </>
            )}
            {showAxesHelper && <axesHelper args={[5]} />}
          </XR>
          <ImmersiveSphere></ImmersiveSphere>
          <ImmersiveInterface />
          <ImmersiveStateSync />
          <CollaborationHighlightingSync />
          <LocalHighlightSync />
          <SpectateStatusSync />
          <CollaborationLandscapeSync />
          <CollaborationComponentSync />
          <CollaborationPingSync />
          <CollaborationKickRPC />
          <CollaborationPopupSync />
          <CollaborationAnnotationSync />
          </PlayroomPlayersProvider>
        </Canvas>
      </PlayroomWrapper>
    </>
  );
}
