import { CameraControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas, useLoader } from '@react-three/fiber';
import type { XRStore } from '@react-three/xr';
import { IfInSessionMode, XR, TeleportTarget, XROrigin } from '@react-three/xr';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import {
  INITIAL_CAMERA_POSITION,
  useCameraControls,
} from 'explorviz-frontend/src/stores/camera-controls-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import { computeCommunicationLayout } from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import layoutLandscape from 'explorviz-frontend/src/utils/elk-layouter';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { getApplicationsFromNodes } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getAllApplicationsInLandscape } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { AnimatedPing } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import CodeCity from 'explorviz-frontend/src/view-objects/3d/application/code-city';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import TraceReplayOverlayR3F from 'explorviz-frontend/src/view-objects/3d/application/trace-replay-overlay-r3f';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import CollaborationCameraSync from './collaboration-camera-sync';
import SpectateCameraController from './spectate-camera-controller';
import ControllerMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus-r3f/controller-vr-menu';

export default function CanvasWrapper({
  landscapeData,
  store,
}: {
  landscapeData: LandscapeData | null;
  store: XRStore;
}) {
  const [layoutMap, setLayoutMap] = useState<Map<string, BoxLayout> | null>(
    null
  );

  const floorTexture = useLoader(
    THREE.TextureLoader,
    'extended-reality/images/materials/floor.jpg'
  );
  floorTexture.repeat.set(200, 200);
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;

  const directionalLightRef = useRef(null);

  const {
    applicationLayoutAlgorithm,
    packageLayoutAlgorithm,
    appLabelMargin,
    applicationAspectRatio,
    applicationDistance,
    appMargin,
    cameraFar,
    cameraFov,
    cameraNear,
    castShadows,
    componentLabelPlacement,
    classFootprint,
    classLayoutAlgorithm,
    classWidthMetric,
    classWidthMetricMultiplier,
    classDepthMetric,
    classDepthMetricMultiplier,
    classMargin,
    closedComponentHeight,
    openedComponentHeight,
    packageLabelMargin,
    packageMargin,
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
  } = useUserSettingsStore(
    useShallow((state) => ({
      applicationLayoutAlgorithm:
        state.visualizationSettings.applicationLayoutAlgorithm.value,
      packageLayoutAlgorithm:
        state.visualizationSettings.packageLayoutAlgorithm.value,
      appLabelMargin: state.visualizationSettings.appLabelMargin,
      applicationAspectRatio:
        state.visualizationSettings.applicationAspectRatio,
      applicationDistance: state.visualizationSettings.applicationDistance,
      appMargin: state.visualizationSettings.appMargin,
      cameraFar: state.visualizationSettings.cameraFar.value,
      cameraFov: state.visualizationSettings.cameraFov.value,
      cameraNear: state.visualizationSettings.cameraNear.value,
      castShadows: state.visualizationSettings.castShadows.value,
      classFootprint: state.visualizationSettings.classFootprint,
      classLayoutAlgorithm:
        state.visualizationSettings.classLayoutAlgorithm.value,
      classMargin: state.visualizationSettings.classMargin.value,
      classWidthMetric: state.visualizationSettings.classWidthMetric.value,
      classWidthMetricMultiplier:
        state.visualizationSettings.classWidthMultiplier.value,
      classDepthMetric: state.visualizationSettings.classDepthMetric.value,
      classDepthMetricMultiplier:
        state.visualizationSettings.classDepthMultiplier.value,
      closedComponentHeight: state.visualizationSettings.closedComponentHeight,
      componentLabelPlacement:
        state.visualizationSettings.componentLabelPlacement.value,
      colors: state.colors,
      openedComponentHeight: state.visualizationSettings.openedComponentHeight,
      packageLabelMargin: state.visualizationSettings.packageLabelMargin,
      packageMargin: state.visualizationSettings.packageMargin,
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
      visualizationSettings: state.visualizationSettings,
    }))
  );

  const { removedComponentIds } = useVisualizationStore();

  const cameraControlsRef = useRef<CameraControls>(null);

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

  const { applicationModels, interAppCommunications } =
    useLandscapeDataWatcher(landscapeData);

  const popupHandlerActions = usePopupHandlerStore(
    useShallow((state) => ({
      handleMouseMove: state.handleMouseMove,
    }))
  );

  const { resetVisualizationState } = useVisualizationStore(
    useShallow((state) => ({
      resetVisualizationState: state.actions.resetVisualizationState,
    }))
  );

  const [position, setPosition] = useState(new THREE.Vector3());

  useEffect(() => {
    if (landscapeData) {
      // Use layout of landscape data watcher
      setLayoutMap(null);
      const allPackages = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .filter((app) => !removedComponentIds.has(app.id))
        .map((app) => getAllPackagesInApplication(app))
        .flat()
        .filter((pkg) => !removedComponentIds.has(pkg.id));
      const packagesIds = new Set(allPackages.map((pkg) => pkg.id));

      const allClasses = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .filter((app) => !removedComponentIds.has(app.id))
        .map((app) => getAllClassesInApplication(app))
        .flat()
        .filter((classModel) => !removedComponentIds.has(classModel.id));
      const classIds = new Set(allClasses.map((classModel) => classModel.id));

      const communicationIds = new Set(
        interAppCommunications.map((comm) => comm.id)
      );

      const entityIds = new Set([
        ...packagesIds,
        ...classIds,
        ...communicationIds,
      ]);

      // Remove all ids that are no longer part of the landscape
      useVisualizationStore.getState().actions.filterEntityIds(entityIds);
    }
  }, [landscapeData, interAppCommunications]);

  const updateLayout = async () => {
    if (!landscapeData) return;

    const layoutMap = await layoutLandscape(
      landscapeData.structureLandscapeData.k8sNodes!,
      getApplicationsFromNodes(
        landscapeData.structureLandscapeData.nodes
      ).filter((app) => !removedComponentIds.has(app.id)),
      useVisualizationStore.getState().removedComponentIds ?? new Set<string>()
    );
    setLayoutMap(layoutMap);
  };

  useEffect(() => {
    updateLayout();
  }, [
    componentLabelPlacement,
    appLabelMargin,
    applicationAspectRatio,
    applicationDistance,
    applicationLayoutAlgorithm,
    appMargin,
    classDepthMetric,
    classDepthMetricMultiplier,
    classFootprint,
    classLayoutAlgorithm,
    classMargin,
    classWidthMetric,
    classWidthMetricMultiplier,
    closedComponentHeight,
    openedComponentHeight,
    packageLabelMargin,
    packageLayoutAlgorithm,
    packageMargin,
    removedComponentIds,
    spiralCenterOffset,
    spiralGap,
  ]);

  useEffect(() => {
    return () => {
      resetVisualizationState();
    };
  }, []);

  return (
    <>
      <Canvas
        id="three-js-canvas"
        className={'webgl'}
        gl={{ powerPreference: 'high-performance' }}
        style={{ background: sceneBackgroundColor }}
        onMouseMove={popupHandlerActions.handleMouseMove}
      >
        <XR store={store}>
          <IfInSessionMode deny={['immersive-ar', 'immersive-vr']}>
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
              // makeDefault // TODO
            />
            <SpectateCameraController />
            <CollaborationCameraSync />
          </IfInSessionMode>
          <IfInSessionMode allow={['immersive-ar', 'immersive-vr']}>
            <XROrigin position={position} />
            <TeleportTarget onTeleport={setPosition}>
              <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry attach="geometry" args={[200, 200]} />
                <meshBasicMaterial attach="material" map={floorTexture} />
              </mesh>
            </TeleportTarget>
            <ControllerMenu handedness='left'/>
            <ControllerMenu handedness='right'/>
          </IfInSessionMode>
          <LandscapeR3F
            layout={applicationModels[0]?.boxLayoutMap.get('landscape')}
          >
            {applicationModels.map((appModel) => (
              <CodeCity
                key={appModel.application.id}
                applicationData={appModel}
                layoutMap={layoutMap || appModel.boxLayoutMap}
              />
            ))}
            {isCommRendered &&
              interAppCommunications.map((communication) => (
                <CommunicationR3F
                  key={communication.id}
                  communicationModel={communication}
                  communicationLayout={computeCommunicationLayout(
                    communication,
                    applicationModels,
                    layoutMap || applicationModels[0].boxLayoutMap
                  )}
                  applicationElement={communication.sourceApp}
                  layoutMap={layoutMap || applicationModels[0].boxLayoutMap}
                />
              ))}
          </LandscapeR3F>
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
      </Canvas>
    </>
  );
}
