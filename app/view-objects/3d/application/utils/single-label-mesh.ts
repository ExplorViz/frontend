import * as THREE from 'three';
import type { LabelLayoutData } from 'workers/landscape-data-worker/label-generator';
import { createLabelMaterial } from './label-material';

export function createSingleLabelMesh(
  texture: THREE.Texture,
  layout: LabelLayoutData,
  color: THREE.Color
): THREE.Mesh {
  const planeGeometry = new THREE.PlaneGeometry(1, layout.aspectRatio);

  const attribute = new THREE.BufferAttribute(
    new Float32Array(
      repeatArray(
        [layout.width, layout.height, layout.bottom],
        planeGeometry.attributes.position.count
      )
    ),
    3
  );
  attribute.needsUpdate = true;
  planeGeometry.setAttribute('labelLayoutData', attribute);

  const material = createLabelMaterial(texture, color);

  const mesh = new THREE.Mesh(planeGeometry, material);

  mesh.userData = {
    raycastInvisible: true,
  };
  mesh.name = 'SingleLabelMesh';

  console.log('foundation label', layout);

  return mesh;
}

/**
 * Creates a new array which contains the specified number of copies of the original array:
 * repeatArray([a, b], 3) = [a, b, a, b, a, b]
 */
function repeatArray<T>(arr: T[], copies: number): T[] {
  return Array.from({ length: copies }, () => arr).flat();
}
