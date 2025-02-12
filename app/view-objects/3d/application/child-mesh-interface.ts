import * as THREE from 'three';

export interface ChildMesh {
  get dimensions(): THREE.Vector3;
  get position(): THREE.Vector3;
}
