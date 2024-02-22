import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import FoundationMesh from 'some-react-lib/src/view-objects/3d/application/foundation-mesh';
import * as THREE from 'three';

export default function applySimpleHeatOnFoundation(
  foundationMesh: FoundationMesh,
  canvas: HTMLCanvasElement
) {
  const color = 'rgb(255, 255, 255)';

  foundationMesh.material = [];

  const sideMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color(color),
  });
  // @ts-ignore: ...
  for (let i = 1; i <= 6; i++)
    foundationMesh.material.push(sideMaterial.clone());

  // Edit upper side of foundation
  // @ts-ignore: ...
  const heatmapMaterial = foundationMesh
    .material[2] as THREE.MeshLambertMaterial;

  heatmapMaterial.emissiveMap = new THREE.CanvasTexture(canvas);
  heatmapMaterial.emissive = new THREE.Color('rgb(125, 125, 125)');
  heatmapMaterial.emissiveIntensity = 1;
  heatmapMaterial.needsUpdate = true;
}

export function computeHeatMapViewPos(
  foundationMesh: FoundationMesh,
  camera: THREE.Camera
) {
  // Create viewpoint from which the faces of the foundation are computed for each clazz.
  const viewPos = foundationMesh.position.clone();
  viewPos.y = Math.max(camera.position.z * 0.8, 100);

  foundationMesh.localToWorld(viewPos);

  return viewPos;
}

/**
 * Adds a line to visualize the vertical line from a clazz to the foundation mesh
 */
export function addHeatmapHelperLine(
  applicationObject3D: ApplicationObject3D,
  clazzPos: THREE.Vector3,
  worldIntersectionPoint: THREE.Vector3
) {
  const material1 = new THREE.LineBasicMaterial({ color: 0x808080 });
  const points = [];

  points.push(applicationObject3D.worldToLocal(clazzPos));
  points.push(worldIntersectionPoint);
  const geometry1 = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry1, material1);
  line.name = 'helperline';

  applicationObject3D.add(line);
}

/**
 * Removes the vertical lines which visualize position of a clazz on the foundation mesh
 */
export function removeHeatmapHelperLines(
  applicationObject3D: ApplicationObject3D
) {
  const applicationChildren: THREE.Object3D[] = [];

  // Remove helper lines if existend
  applicationObject3D.traverse((child) => {
    if (child.name === 'helperline') {
      applicationChildren.push(child);
    }
  });
  applicationChildren.forEach((child) => {
    applicationObject3D.remove(child);
  });
}
