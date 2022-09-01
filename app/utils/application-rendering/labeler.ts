import * as THREE from 'three';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ClazzLabelMesh from 'explorviz-frontend/view-objects/3d/application/clazz-label-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ComponentLabelMesh from 'explorviz-frontend/view-objects/3d/application/component-label-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';

/**
 * Positions label of a given component mesh. This function is standalone and not part
 * of addComponentTextLabel because the position of a component label needs to be adapted
 * every time a component is opened or closed.
 *
 * @param boxMesh Mesh which is labeled
 */
export function positionBoxLabel(boxMesh: ComponentMesh | FoundationMesh) {
  const label = boxMesh.labelMesh;

  if (!label) { return; }

  const foundationOffset = label.minHeight;

  label.geometry.center();

  // Set y-position just above the box of the parent mesh
  label.position.y = boxMesh.geometry.parameters.height / 2 + 0.01;

  // Align text with component parent
  label.rotation.x = -(Math.PI / 2);
  label.rotation.z = -(Math.PI / 2);

  // Foundation is labeled like an opened component
  if (boxMesh instanceof FoundationMesh || boxMesh.opened) {
    // Position Label just above the bottom edge
    label.position.x = -boxMesh.geometry.parameters.width / 2 + foundationOffset / boxMesh.width;
  } else {
    label.position.x = 0;
  }
}

/**
 * Creates a label and adds it at a calculated position to the given
 * component or foundation mesh
 *
 * @param boxMesh The mesh which shall be labeled
 * @param font Desired font of the text
 * @param color Desired color of the text
 * @param minHeight Minimal height of font
 * @param minLength Minimal length (#letters) of text. More important than minHeight
 * @param scalar Allows to scale text size additionally
 */
export function addBoxTextLabel(boxMesh: ComponentMesh | FoundationMesh, font: THREE.Font,
  color: THREE.Color, minHeight = 1.5, minLength = 4, scalar = 1, replace = false) {
  if (boxMesh.labelMesh && !replace) return;
  const labelMesh = new ComponentLabelMesh(boxMesh, font, color, minHeight, minLength);
  labelMesh.computeLabel(boxMesh, boxMesh.dataModel.name, scalar);

  boxMesh.labelMesh = labelMesh;
  boxMesh.add(labelMesh);

  positionBoxLabel(boxMesh);
}

/**
 * Creates a label and adds it at a calculated position to the given clazz mesh
 *
 * @param clazzMesh The mesh which shall be labeled
 * @param font Desired font of the text
 * @param color Desired color of the text
 * @param size Size of text
 */
export function addClazzTextLabel(clazzMesh: ClazzMesh, font: THREE.Font,
  color: THREE.Color, size = 0.75, replace = false) {
  if (clazzMesh.labelMesh && !replace) return;

  const text = clazzMesh.dataModel.name;

  const labelMesh = new ClazzLabelMesh(font, text, color, size);
  clazzMesh.labelMesh = labelMesh;

  // Set label origin to center of clazz mesh
  labelMesh.geometry.center();
  // Set y-position just above the clazz mesh
  labelMesh.position.y = clazzMesh.geometry.parameters.height / 2 + 0.01;

  // Rotate text
  labelMesh.rotation.x = -(Math.PI / 2);
  labelMesh.rotation.z = -(Math.PI / 3);

  clazzMesh.add(labelMesh);
}
