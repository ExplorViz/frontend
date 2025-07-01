import {
  AdaptiveDpr,
  AdaptiveEvents,
  CameraControls,
  PerspectiveCamera,
  Stats,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { getAllApplicationsInLandscape } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import ApplicationR3F from 'explorviz-frontend/src/view-objects/3d/application/application-r3f';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function CanvasWrapper({
  landscapeData,
  landscape3D,
}: {
  landscapeData: LandscapeData;
  landscape3D: Landscape3D;
}) {
  const {
    cameraNear,
    cameraFar,
    cameraFov,
    castShadows,
    sceneBackgroundColor,
    showFpsCounter,
  } = useUserSettingsStore(
    useShallow((state) => ({
      sceneBackgroundColor: state.visualizationSettings.backgroundColor.value,
      castShadows: state.visualizationSettings.castShadows.value,
      cameraNear: state.visualizationSettings.cameraNear.value,
      cameraFar: state.visualizationSettings.cameraFar.value,
      cameraFov: state.visualizationSettings.cameraFov.value,
      showFpsCounter: state.visualizationSettings.showFpsCounter.value,
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

  const {
    removeAllClassStates,
    componentData,
    classData,
    removeClassState,
    removeComponentState,
    removeAllComponentStates,
  } = useVisualizationStore(
    useShallow((state) => ({
      setClassState: state.actions.setClassState,
      getClassState: state.actions.getClassState,
      removeAllClassStates: state.actions.removeAllClassStates,
      setComponentState: state.actions.setComponentState,
      getComponentState: state.actions.getComponentState,
      removeComponentState: state.actions.removeComponentState,
      removeClassState: state.actions.removeClassState,
      componentData: state.componentData,
      classData: state.classData,
      removeAllComponentStates: state.actions.removeAllComponentStates,
    }))
  );

  const computeCommunicationLayout = useLinkRendererStore(
    (state) => state.computeCommunicationLayout
  );

  useEffect(() => {
    if (landscapeData) {
      const allPackages = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .map((app) => getAllPackagesInApplication(app))
        .flat();
      const packagesIds = new Set(allPackages.map((pkg) => pkg.id));
      // Remove all component states that are not in the current landscape
      Object.keys(componentData).forEach((componentId) => {
        if (!packagesIds.has(componentId)) {
          removeComponentState(componentId);
        }
      });
      const allClasses = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .map((app) => getAllClassesInApplication(app))
        .flat();
      const classIds = new Set(allClasses.map((clazz) => clazz.id));
      // Remove all component states that are not in the current landscape
      Object.keys(classData).forEach((classId) => {
        if (!classIds.has(classId)) {
          removeClassState(classId);
        }
      });
    }
  }, [landscapeData]);

  useEffect(() => {
    return () => {
      removeAllComponentStates();
      removeAllClassStates();
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
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
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
      <LandscapeR3F>
        {applicationModels.map((appModel) => (
          <ApplicationR3F
            key={appModel.application.id}
            applicationData={appModel}
          />
        ))}
        {interAppCommunications.map((communication) => (
          <CommunicationR3F
            key={communication.id}
            communicationModel={communication}
            communicationLayout={computeCommunicationLayout(
              communication,
              applicationModels
            )}
          />
        ))}
      </LandscapeR3F>
      <ambientLight />
      <spotLight
        name="SpotLight"
        intensity={0.5}
        distance={2000}
        position={[-200, 100, 100]}
        castShadow={castShadows}
        angle={0.3}
        penumbra={0.2}
        decay={2}
      />
      <directionalLight
        name="DirectionalLight"
        intensity={0.55 * Math.PI}
        position={[-5, 5, 5]}
        castShadow={castShadows}
      />
      {showFpsCounter && (
        <>
          <Stats showPanel={0} className="stats0" />
          <Stats showPanel={1} className="stats1" />
          <Stats showPanel={2} className="stats2" />
        </>
      )}
    </Canvas>
  );
}
