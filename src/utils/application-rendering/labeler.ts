import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import {
  ExplorVizColors,
  useUserSettingsStore,
} from 'explorviz-frontend/src/stores/user-settings';
import {
  Application,
  isApplication,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getStoredSettings } from 'explorviz-frontend/src/utils/settings/local-storage-settings';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ComponentLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/component-label-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import MinimapLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/minimap-label-mesh';
import K8sMesh, {
  K8sDataModel,
} from 'explorviz-frontend/src/view-objects/3d/k8s/k8s-mesh';
import LabelMesh from 'explorviz-frontend/src/view-objects/3d/label-mesh';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import gsap from 'gsap';
import * as THREE from 'three';
import { Font } from 'three-stdlib'; // import { Font } from 'three/examples/jsm/loaders/FontLoader';

/**
 * Positions label of a given component mesh. This function is standalone and not part
 * of addComponentTextLabel because the position of a component label needs to be adapted
 * every time a component is opened or closed.
 *
 * @param boxMesh Mesh which is labeled
 */
export function positionBoxLabel(
  boxMesh: ComponentMesh | FoundationMesh | K8sMesh
) {
  const label = boxMesh.labelMesh;

  if (!label) {
    return;
  }
  // Align text with component parent
  label.rotation.x = -(Math.PI / 2);

  label.geometry.center();

  // Set y-position just above the box of the parent mesh
  label.position.y = boxMesh.geometry.parameters.height / 2 + 0.01;

  // TODO: The calculation of the z-position can still be off on tall boxes
  const boxDimensions = new THREE.Vector3();
  label.geometry.boundingBox?.getSize(boxDimensions);
  const parentScale = boxMesh!.scale;
  const parentAspectRatio = parentScale.x / parentScale.z;

  const zPosOfOpenBox =
    boxMesh.geometry.parameters.depth / 2 -
    (boxDimensions.y * parentAspectRatio) / 2;

  // Foundation is labeled like an opened component
  if (boxMesh instanceof FoundationMesh) {
    // Do not animate label on foundation since it is always opened
    label.position.z = zPosOfOpenBox;
  } else if (boxMesh.opened) {
    if (getStoredSettings().enableAnimations.value) {
      gsap.to(label.position, {
        duration: 0.25,
        z: zPosOfOpenBox,
      });
    } else {
      label.position.z = zPosOfOpenBox;
    }
  } else {
    if (getStoredSettings().enableAnimations.value) {
      gsap.to(label.position, {
        duration: 0.25,
        z: 0,
      });
    } else {
      label.position.z = 0;
    }
  }
}

export function positionBoxLabelWithData(
  label: ComponentLabelMesh,
  dataModel: Application | Package | K8sDataModel,
  boxLayout: BoxLayout
) {
  // Align text with component parent
  label.rotation.x = -(Math.PI / 2);

  label.geometry.center();

  const scaleX = boxLayout.width;
  const scaleZ = boxLayout.depth;

  // Set y-position just above the box of the parent mesh (0.5 since position is in center)
  label.position.y = 0.51;

  // TODO: The calculation of the z-position can still be off on tall boxes
  const boxDimensions = new THREE.Vector3();
  label.geometry.boundingBox?.getSize(boxDimensions);

  const parentAspectRatio = scaleX / scaleZ;

  const zPosOfOpenBox = 0.5 - (boxDimensions.y * parentAspectRatio) / 2;

  // Foundation is labeled like an opened component
  if (isApplication(dataModel)) {
    // Do not animate label on foundation since it is always opened
    label.position.z = zPosOfOpenBox;
    // } else if (boxMesh.opened) {
  } else if (true) {
    if (getStoredSettings().enableAnimations.value) {
      gsap.to(label.position, {
        duration: 0.25,
        z: zPosOfOpenBox,
      });
    } else {
      label.position.z = zPosOfOpenBox;
    }
  } else {
    if (getStoredSettings().enableAnimations.value) {
      gsap.to(label.position, {
        duration: 0.25,
        z: 0,
      });
    } else {
      label.position.z = 0;
    }
  }
}

export function addApplicationLabels(
  application: ApplicationObject3D,
  font: Font,
  colors: ExplorVizColors,
  labelAll: boolean = false
) {
  /**
   * Adds labels to all box meshes of a given application
   */
  const { foundationTextColor } = colors;
  application.getBoxMeshes().forEach((mesh) => {
    // Labeling is time-consuming. Thus, label only visible meshes incrementally
    // as opposed to labeling all meshes up front (as done in application-rendering).
    if (labelAll || mesh.visible) {
      if (mesh instanceof FoundationMesh) {
        addBoxTextLabel(mesh, font, foundationTextColor);
        addMinimapTextLabel(mesh, font, foundationTextColor);
      }
    }
  });
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
export function addBoxTextLabel(
  boxMesh: ComponentMesh | FoundationMesh | K8sMesh,
  font: Font,
  color: THREE.Color,
  minHeight = 1.5,
  minLength = 4
) {
  if (boxMesh.labelMesh) return;
  const labelMesh = new ComponentLabelMesh(
    boxMesh,
    font,
    color,
    minHeight,
    minLength
  );
  labelMesh.computeLabel(boxMesh, boxMesh.dataModel.name);

  boxMesh.labelMesh = labelMesh;
  boxMesh.add(labelMesh);

  positionBoxLabel(boxMesh);

  return labelMesh;
}

export function getBoxLabel(
  boxMesh: ComponentMesh | FoundationMesh | K8sMesh,
  font: Font,
  color: THREE.Color,
  minHeight = 1.5,
  minLength = 4
) {
  if (boxMesh.labelMesh) return;
  const labelMesh = new ComponentLabelMesh(
    boxMesh,
    font,
    color,
    minHeight,
    minLength
  );
  labelMesh.computeLabel(boxMesh, boxMesh.dataModel.name);

  boxMesh.labelMesh = labelMesh;
  positionBoxLabel(boxMesh);

  return labelMesh;
}

export function getBoxLabelWithData(
  boxMesh: ComponentMesh | FoundationMesh | K8sMesh,
  font: Font,
  color: THREE.Color,
  minHeight = 1.5,
  minLength = 4
) {
  const labelMesh = new ComponentLabelMesh(
    boxMesh,
    font,
    color,
    minHeight,
    minLength
  );
  labelMesh.computeLabelWithData(boxMesh.dataModel, boxMesh.layout);

  positionBoxLabelWithData(labelMesh, boxMesh.dataModel, boxMesh.layout);

  return labelMesh;
}

export function positionClassLabel(
  labelMesh: LabelMesh,
  parentMesh: THREE.Mesh
) {
  if (!(parentMesh.geometry instanceof THREE.BoxGeometry)) return;
  // Set label origin to center of clazz mesh
  labelMesh.geometry.center();

  const offset =
    useUserSettingsStore.getState().visualizationSettings.classLabelOffset
      .value;

  // Set y-position just above the clazz mesh
  labelMesh.position.y = parentMesh.geometry.parameters.height / 2 + offset;

  // Rotate text
  labelMesh.rotation.x = -(Math.PI / 2);

  const rotation =
    useUserSettingsStore.getState().visualizationSettings.classLabelOrientation
      .value;
  labelMesh.rotation.z = rotation;
}

/**
 * Adds a label to a foundation mesh for the minimap
 * @param foundationMesh The mesh which shall be labeled
 * @param font The font of the text
 * @param color The color of the text
 * @param size The size of the text
 * @param heigth The height of the text
 */
export function addMinimapTextLabel(
  foundationMesh: FoundationMesh,
  font: Font,
  color: THREE.Color,
  size = 0.1,
  heigth = 100
) {
  const text = foundationMesh.dataModel.name;

  const minimapLabelMesh = new MinimapLabelMesh(font, text, color, size);
  minimapLabelMesh.computeLabel(text, size);
  foundationMesh.minimapLabelMesh = minimapLabelMesh;

  minimapLabelMesh.geometry.center();
  minimapLabelMesh.position.y = heigth;

  // Rotate text
  minimapLabelMesh.rotation.x = -(Math.PI / 2);
  // minimapLabelMesh.rotation.z = -(Math.PI / 2);

  minimapLabelMesh.layers.set(SceneLayers.MinimapLabel);

  foundationMesh.add(minimapLabelMesh);
}

export function updateBoxTextLabel(
  boxMesh: ComponentMesh | FoundationMesh,
  font: Font,
  color: THREE.Color,
  label: string,
  minHeight = 1.5,
  minLength = 4
) {
  const labelMesh = new ComponentLabelMesh(
    boxMesh,
    font,
    color,
    minHeight,
    minLength
  );

  boxMesh.remove(boxMesh.labelMesh!);

  labelMesh.computeLabel(boxMesh, boxMesh.dataModel.name + label);

  boxMesh.labelMesh = labelMesh;
  boxMesh.add(labelMesh);

  positionBoxLabel(boxMesh);
}
