import { Object3DNode } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';

declare module '@react-three/fiber' {
  interface ThreeElements {
    instancedMesh2: Object3DNode<InstancedMesh2, typeof InstancedMesh2>;
  }
}
