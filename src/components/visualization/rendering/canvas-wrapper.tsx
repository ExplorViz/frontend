import { CameraControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import ApplicationR3F from 'explorviz-frontend/src/view-objects/3d/application/application-r3f';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import { useShallow } from 'zustand/react/shallow';

export default function CanvasWrapper({
  landscapeData,
  landscape3D,
}: {
  landscapeData: LandscapeData;
  landscape3D: Landscape3D;
}) {
  const { castShadows, sceneBackgroundColor } = useUserSettingsStore(
    useShallow((state) => ({
      sceneBackgroundColor: state.visualizationSettings.backgroundColor.value,
      castShadows: state.visualizationSettings.castShadows.value,
    }))
  );

  const { applicationModels, interAppCommunications } = useLandscapeDataWatcher(
    landscapeData,
    landscape3D
  );

  return (
    <Canvas
      id="threejs-canvas"
      className={'webgl'}
      gl={{ preserveDrawingBuffer: true }}
      // onCreated={(state) => {
      //   state.setEvents({
      //     filter: (intersections) =>
      //       intersections.filter((i) => i.object.visible),
      //   });
      // }}
      style={{ background: sceneBackgroundColor }}
    >
      <CameraControls
        dollySpeed={0.3}
        draggingSmoothTime={0.05}
        maxDistance={100}
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
      <PerspectiveCamera position={[10, 10, 10]} makeDefault />
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
    </Canvas>
  );
}
