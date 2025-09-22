import { CameraControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import layoutLandscape from 'explorviz-frontend/src/utils/elk-layouter';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { getApplicationsFromNodes } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getAllApplicationsInLandscape } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { AnimatedPing } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import CodeCity from 'explorviz-frontend/src/view-objects/3d/application/code-city';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useRef, useState } from 'react';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';

import { useShallow } from 'zustand/react/shallow';

export default function CanvasWrapper({
  landscapeData,
}: {
  landscapeData: LandscapeData | null;
}) {
  const [layoutMap, setLayoutMap] = useState<Map<string, BoxLayout> | null>(
    null
  );

  const directionalLightRef = useRef(null);

  const INITIAL_CAMERA_POSITION: [x: number, y: number, z: number] = [
    10, 10, 10,
  ];

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
    classFootprint,
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
      classMargin: state.visualizationSettings.classMargin.value,
      classWidthMetric: state.visualizationSettings.classWidthMetric.value,
      classWidthMetricMultiplier:
        state.visualizationSettings.classWidthMultiplier.value,
      classDepthMetric: state.visualizationSettings.classDepthMetric.value,
      classDepthMetricMultiplier:
        state.visualizationSettings.classDepthMultiplier.value,
      closedComponentHeight: state.visualizationSettings.closedComponentHeight,
      colors: state.colors,
      openedComponentHeight: state.visualizationSettings.openedComponentHeight,
      packageLabelMargin: state.visualizationSettings.packageLabelMargin,
      packageMargin: state.visualizationSettings.packageMargin,
      sceneBackgroundColor: state.visualizationSettings.backgroundColor.value,
      showAxesHelper: state.visualizationSettings.showAxesHelper.value,
      showFpsCounter: state.visualizationSettings.showFpsCounter.value,
      showLightHelper: state.visualizationSettings.showLightHelper.value,
      visualizationSettings: state.visualizationSettings,
    }))
  );

  const resetCamera = () => {
    moveCameraTo(INITIAL_CAMERA_POSITION, [0, 0, 0]);
  };

  const moveCameraTo = (
    position: [x: number, y: number, z: number],
    target: [x: number, y: number, z: number] = [0, 0, 0],
    enableTransition = true
  ) => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.moveTo(
        position[0],
        position[1],
        position[2],
        enableTransition
      );
      cameraControlsRef.current.setTarget(
        target[0],
        target[1],
        target[2],
        enableTransition
      );
    }
  };

  const cameraControlsRef = useRef<CameraControls>(null);

  // Camera reset listener
  useEffect(() => {
    const handleMoveCamera = ({
      position,
      target,
      enableTransition,
    }: {
      position: [x: number, y: number, z: number];
      target?: [x: number, y: number, z: number];
      enableTransition?: boolean;
    }) => {
      moveCameraTo(position, target, enableTransition);
    };

    eventEmitter.on('reset_camera', resetCamera);
    eventEmitter.on('move_camera', handleMoveCamera);

    return () => {
      eventEmitter.off('reset_camera', resetCamera);
      eventEmitter.off('move_camera', handleMoveCamera);
    };
  }, [cameraControlsRef.current]);

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

  const { closedComponentIds, resetVisualizationState } = useVisualizationStore(
    useShallow((state) => ({
      closedComponentIds: state.closedComponentIds,
      resetVisualizationState: state.actions.resetVisualizationState,
    }))
  );

  const computeCommunicationLayout = useLinkRendererStore(
    (state) => state.computeCommunicationLayout
  );

  useEffect(() => {
    if (landscapeData) {
      // Use layout of landscape data watcher
      setLayoutMap(null);
      const allPackages = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .map((app) => getAllPackagesInApplication(app))
        .flat();
      const packagesIds = new Set(allPackages.map((pkg) => pkg.id));

      const allClasses = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .map((app) => getAllClassesInApplication(app))
        .flat();
      const classIds = new Set(allClasses.map((clazz) => clazz.id));

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
      getApplicationsFromNodes(landscapeData.structureLandscapeData.nodes)
    );
    setLayoutMap(layoutMap);
  };

  useEffect(() => {
    updateLayout();
  }, [
    appLabelMargin,
    applicationAspectRatio,
    applicationDistance,
    applicationLayoutAlgorithm,
    appMargin,
    classDepthMetric,
    classDepthMetricMultiplier,
    classFootprint,
    classMargin,
    classWidthMetric,
    classWidthMetricMultiplier,
    closedComponentHeight,
    openedComponentHeight,
    packageLabelMargin,
    packageLayoutAlgorithm,
    packageMargin,
  ]);

  useEffect(() => {
    return () => {
      resetVisualizationState();
    };
  }, []);

  return (
    <Canvas
      id="threejs-canvas"
      className={'webgl'}
      gl={{ powerPreference: 'high-performance' }}
      style={{ background: sceneBackgroundColor }}
      onMouseMove={popupHandlerActions.handleMouseMove}
    >
      <CameraControls
        ref={cameraControlsRef}
        dollySpeed={0.3}
        draggingSmoothTime={0.05}
        maxDistance={250}
        maxPolarAngle={0.5 * Math.PI}
        makeDefault
        minDistance={1}
        mouseButtons={{
          left: 4, // SCREEN_PAN, see: https://github.com/yomotsu/camera-controls/blob/02e1e9b87a42d461e7142705e93861c81739bbd5/src/types.ts#L29
          middle: 0, // None
          wheel: 16, // Dolly
          right: 1, // Rotate
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
                layoutMap || applicationModels[0].boxLayoutMap,
                closedComponentIds
              )}
            />
          ))}
      </LandscapeR3F>
      <AnimatedPing color="#00e5ff" />
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
    </Canvas>
  );
}
