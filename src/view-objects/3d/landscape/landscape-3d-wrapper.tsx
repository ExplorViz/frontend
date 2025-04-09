import { ThreeElements } from '@react-three/fiber';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export default function Landscape3dWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [landscape3D] = useState<Landscape3D>(new Landscape3D());

  useEffect(() => {
    useApplicationRendererStore.getState().setLandscape3D(landscape3D);
  }, []);

  return <primitive object={landscape3D}>{children}</primitive>;
}
