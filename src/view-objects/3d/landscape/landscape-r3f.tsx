import { useThree } from '@react-three/fiber';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getLandscapeCenterPosition } from 'explorviz-frontend/src/utils/layout-helper';
import { pingPosition } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

const MOUSE_MIDDLE_BUTTON = 1;

export default function LandscapeR3F({
  layout,
  children,
}: {
  layout: BoxLayout | undefined;
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const settings = useUserSettingsStore.getState().visualizationSettings;
  const scalar = settings.landscapeScalar.value;
  const [positionX, positionY, positionZ] = [
    settings.landscapePositionX.value,
    settings.landscapePositionY.value,
    settings.landscapePositionZ.value,
  ];
  const [rotationX, rotationY, rotationZ] = [
    settings.landscapeRotationX.value,
    settings.landscapeRotationY.value,
    settings.landscapeRotationZ.value,
  ];
  const raycastEnabled = settings.raycastEnabled.value;
  const raycastFirstHit = settings.raycastFirstHit.value;
  const raycastNear = settings.raycastNear.value;
  const raycastFar = settings.raycastFar.value;

  useEffect(() => {
    if (layout) {
      setPosition(getLandscapeCenterPosition());
    }
  }, [layout, scalar, positionX, positionY, positionZ]);

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

  return (
    <group
      position={position}
      scale={scalar}
      rotation={[rotationX, rotationY, rotationZ]}
      onPointerDown={(e) => {
        if (e.button == MOUSE_MIDDLE_BUTTON) {
          e.stopPropagation();
          let pingedPoint = e.point.clone();
          // Positioning of instanced meshes works differently
          if (e.object.type === 'InstancedMesh2') {
            pingedPoint = e.object.localToWorld(pingedPoint);
          }
          pingPosition(pingedPoint);
        }
      }}
    >
      {children}
    </group>
  );
}
