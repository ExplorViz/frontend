import * as THREE from 'three';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ClazzLabelMesh from 'explorviz-frontend/view-objects/3d/application/clazz-label-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ComponentLabelMesh from 'explorviz-frontend/view-objects/3d/application/component-label-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { ApplicationColors } from 'explorviz-frontend/services/configuration';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import { Package } from '../landscape-schemes/structure-data';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';

/**
 * Positions label of a given component mesh. This function is standalone and not part
 * of addComponentTextLabel because the position of a component label needs to be adapted
 * every time a component is opened or closed.
 *
 * @param boxMesh Mesh which is labeled
 */
export function positionBoxLabel(boxMesh: ComponentMesh | FoundationMesh) {
  const label = boxMesh.labelMesh;

  if (!label) {
    return;
  }

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
    label.position.x =
      -boxMesh.geometry.parameters.width / 2 + foundationOffset / boxMesh.width;
  } else {
    label.position.x = 0;
  }
}

export function addApplicationLabels(
  application: ApplicationObject3D,
  font: Font,
  colors: ApplicationColors,
  labelAll: boolean = false
) {
  performance.mark('addApplicationLabels-start');
  /**
   * Adds labels to all box meshes of a given application
   */
  const { clazzTextColor, componentTextColor, foundationTextColor } = colors;

  application.getBoxMeshes().forEach((mesh) => {
    // Labeling is time-consuming. Thus, label only visible meshes incrementally
    // as opposed to labeling all meshes up front (as done in application-rendering).
    if (labelAll || mesh.visible) {
      if (mesh instanceof ClazzMesh) {
        addClazzTextLabel(mesh, font, clazzTextColor);
      } else if (mesh instanceof FoundationMesh) {
        addBoxTextLabel(mesh, font, foundationTextColor);
      }
    }
  });
  for (const component of application.getOpenedComponents()) {
    const layout = application.getBoxLayout(component.id)!;
    addComponentLabel(component, layout, font, componentTextColor, application);
  }
  performance.mark('addApplicationLabels-end');
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
function addBoxTextLabel(
  boxMesh: ComponentMesh | FoundationMesh,
  font: Font,
  color: THREE.Color,
  minHeight = 1.5,
  minLength = 4,
  scalar = 1,
  replace = false
) {
  if (boxMesh.labelMesh && !replace) return;
  const labelMesh = new ComponentLabelMesh(
    boxMesh,
    font,
    color,
    minHeight,
    minLength
  );
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
function addClazzTextLabel(
  clazzMesh: ClazzMesh,
  font: Font,
  color: THREE.Color,
  size = 0.75,
  replace = false
) {
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

const componentTextMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.99,
});

function addComponentLabel(
  component: Package,
  layout: BoxLayout,
  font: Font,
  color: THREE.Color,
  application: ApplicationObject3D
): void {
  const parentAspectRatio = layout.width / layout.depth;

  // Adjust desired text size with possible scaling
  const textSize = 2.0 * parentAspectRatio;
  // Text should look like it is written on the parent's box (no height required)
  const textHeight = 0.0;

  const text = component.name;

  // if (text === 'springframework') {
  //   debugger;
  // }

  const geometry = new TextGeometry(text, {
    font,
    size: textSize,
    height: textHeight,
    curveSegments: 1,
  });

  componentTextMaterial.color = color;

  const textDimensions = computeBoxSize(geometry);
  const textWidth = textDimensions.x;

  let scaleFactor = 1;

  // Handle too long labels, expect labels to be (at most) 90% the width of the parent's mesh
  const desiredWidth = layout.depth * 0.9; // TODO: width?
  if (textWidth > desiredWidth) {
    scaleFactor = desiredWidth / textWidth;
    geometry.scale(scaleFactor, scaleFactor, scaleFactor);
  }

  geometry.center();
  const textMesh = new THREE.Mesh(geometry, componentTextMaterial);

  // Set y-position just above the box of the parent mesh
  textMesh.position.y = 0.5 * layout.height + 0.01;

  // Align text with component parent
  textMesh.rotation.x = -(Math.PI / 2);
  textMesh.rotation.z = -(Math.PI / 2);

  const foundationOffset = 1.5;
  textMesh.position.x = -0.5 * layout.width + foundationOffset / layout.width;

  textMesh.position.y += layout.center.y;

  application.add(textMesh);
  console.log('added label', text, textMesh.position);
}

/**
 * Updates bounding box of geometry and returns respective dimensions
 */
function computeBoxSize(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const boxDimensions = new THREE.Vector3();
  geometry.boundingBox?.getSize(boxDimensions);
  return boxDimensions;
}
