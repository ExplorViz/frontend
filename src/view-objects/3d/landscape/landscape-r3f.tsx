import { useThree } from '@react-three/fiber';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function LandscapeR3F({
  layout,
  children,
}: {
  layout: BoxLayout;
  children: React.ReactNode;
}) {
  const [landscape3D] = useState<Landscape3D>(new Landscape3D());

  const { scalar, raycastEnabled, raycastFirstHit, raycastNear, raycastFar } =
    useUserSettingsStore(
      useShallow((state) => ({
        scalar: state.visualizationSettings.landscapeScalar.value,
        raycastEnabled: state.visualizationSettings.raycastEnabled.value,
        raycastFirstHit: state.visualizationSettings.raycastFirstHit.value,
        raycastNear: state.visualizationSettings.raycastNear.value,
        raycastFar: state.visualizationSettings.raycastFar.value,
      }))
    );

  const raycaster = useThree((state) => state.raycaster);

  useEffect(() => {
    raycaster.near = raycastNear;
    raycaster.far = raycastFar;
    raycaster.firstHitOnly = raycastFirstHit;
    if (raycastEnabled) {
      raycaster.layers.enableAll();
    } else {
      raycaster.layers.disableAll();
    }
  }, [raycastEnabled, raycastFirstHit, raycastNear, raycastFar]);

  useEffect(() => {
    useApplicationRendererStore.getState().setLandscape3D(landscape3D);
  }, []);

  return (
    <group
      position={[(-layout.width * scalar) / 2, 0, (-layout.depth * scalar) / 2]}
      scale={scalar}
    >
      {children}
    </group>
  );
}
