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
import ApplicationR3F from 'explorviz-frontend/src/view-objects/3d/application/application-r3f';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function CanvasWrapper({
  landscapeData,
  landscape3D,
}: {
  landscapeData: LandscapeData | null;
  landscape3D: Landscape3D;
}) {
  const [layoutMap, setLayoutMap] = useState<Map<string, BoxLayout> | null>(
    null
  );

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

  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const { applicationModels, interAppCommunications } = useLandscapeDataWatcher(
    landscapeData,
    landscape3D
  );

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
      // Remove all component states that are not in the current landscape
      // TODO: Remove outdated component ids from visualization store

      const allClasses = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .map((app) => getAllClassesInApplication(app))
        .flat();
      const classIds = new Set(allClasses.map((clazz) => clazz.id));
      // Remove all class states that are not in the current landscape
      // TODO: Remove outdated class ids from visualization store
    }
  }, [landscapeData]);

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
    applicationLayoutAlgorithm,
    packageLayoutAlgorithm,
    applicationDistance,
    applicationAspectRatio,
    classFootprint,
    classWidthMetric,
    classWidthMetricMultiplier,
    classDepthMetric,
    classDepthMetricMultiplier,
    classMargin,
    appLabelMargin,
    appMargin,
    packageLabelMargin,
    packageMargin,
    openedComponentHeight,
    closedComponentHeight,
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
        position={[10, 10, 10]}
        fov={cameraFov}
        near={cameraNear}
        far={cameraFar}
        makeDefault
      />
      <LandscapeR3F
        layout={applicationModels[0]?.boxLayoutMap.get('landscape')}
      >
        {applicationModels.map((appModel) => (
          <ApplicationR3F
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
            />
          ))}
      </LandscapeR3F>
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
