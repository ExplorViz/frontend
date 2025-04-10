import { CameraControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import Application3dWrapper from 'explorviz-frontend/src/view-objects/3d/application/application-3d-wrapper';
import ClassCommunicationMeshWrapper from 'explorviz-frontend/src/view-objects/3d/application/class-communication-mesh-wrapper';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import Landscape3dWrapper from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d-wrapper';
import { useShallow } from 'zustand/react/shallow';

export default function CanvasWrapper({
  landscapeData,
  landscape3D,
}: {
  landscapeData: LandscapeData;
  landscape3D: Landscape3D;
}) {
  const userSettingsState = useUserSettingsStore(
    useShallow((state) => ({
      visualizationSettings: state.visualizationSettings,
      colors: state.colors,
    }))
  );

  const { applicationModels, interAppCommunications } = useLandscapeDataWatcher(
    landscapeData,
    landscape3D
  );

  return (
    <Canvas id="threejs-canvas" className={'webgl'}>
      <CameraControls
        dollySpeed={0.3}
        maxPolarAngle={0.5 * Math.PI}
        minDistance={1}
        maxDistance={100}
        smoothTime={0}
        mouseButtons={{
          left: 4, // SCREEN_PAN, see: https://github.com/yomotsu/camera-controls/blob/02e1e9b87a42d461e7142705e93861c81739bbd5/src/types.ts#L29
          middle: 0, // None
          wheel: 32, // Zoom
          right: 1, // Rotate
        }}
      />
      <PerspectiveCamera position={[10, 10, 10]} makeDefault />
      <Landscape3dWrapper>
        {applicationModels.map((appModel) => (
          <Application3dWrapper
            key={appModel.application.id}
            applicationData={appModel}
          />
        ))}
        {interAppCommunications.map((communication) => (
          <ClassCommunicationMeshWrapper
            key={communication.id}
            communicationModel={communication}
          />
        ))}
      </Landscape3dWrapper>
      <ambientLight />
      <spotLight
        name="SpotLight"
        intensity={0.5}
        distance={2000}
        position={[-200, 100, 100]}
        castShadow={userSettingsState.visualizationSettings.castShadows.value}
        angle={0.3}
        penumbra={0.2}
        decay={2}
      />
      <directionalLight
        name="DirectionalLight"
        intensity={0.55 * Math.PI}
        position={[-5, 5, 5]}
        castShadow={userSettingsState.visualizationSettings.castShadows.value}
      />
    </Canvas>
  );
}
