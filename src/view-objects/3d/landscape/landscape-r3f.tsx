import { useThree } from '@react-three/fiber';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { triggerRestartablePing } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

const MOUSE_MIDDLE_BUTTON = 1;

export default function LandscapeR3F({
  layout,
  children,
}: {
  layout: BoxLayout | undefined;
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const {
    scalar,
    rotationX,
    rotationY,
    rotationZ,
    positionX,
    positionY,
    positionZ,
    raycastEnabled,
    raycastFirstHit,
    raycastNear,
    raycastFar,
  } = useUserSettingsStore(
    useShallow((state) => ({
      scalar: state.visualizationSettings.landscapeScalar.value,
      rotationX: state.visualizationSettings.landscapeRotationX.value,
      rotationY: state.visualizationSettings.landscapeRotationY.value,
      rotationZ: state.visualizationSettings.landscapeRotationZ.value,
      positionX: state.visualizationSettings.landscapePositionX.value,
      positionY: state.visualizationSettings.landscapePositionY.value,
      positionZ: state.visualizationSettings.landscapePositionZ.value,
      raycastEnabled: state.visualizationSettings.raycastEnabled.value,
      raycastFirstHit: state.visualizationSettings.raycastFirstHit.value,
      raycastNear: state.visualizationSettings.raycastNear.value,
      raycastFar: state.visualizationSettings.raycastFar.value,
    }))
  );

  useEffect(() => {
    if (layout) {
      setPosition(
        new THREE.Vector3(
          (-layout.width * scalar) / 2 + positionX,
          positionY,
          (-layout.depth * scalar) / 2 + positionZ
        )
      );
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
          triggerRestartablePing(pingedPoint);
        }
      }}
    >
      {children}
    </group>
  );
}
