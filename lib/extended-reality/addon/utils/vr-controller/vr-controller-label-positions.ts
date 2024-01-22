import * as THREE from 'three';
import VRController from '../vr-controller';

export enum VRControllerLabelOffsetDirection {
  LEFT = -1,
  RIGHT = 1,
}

export type VRControllerLabelPosition = {
  buttonPosition: THREE.Vector3;
  offsetDirection: VRControllerLabelOffsetDirection;
};

export type VRControllerThumbpadLabelPositions = {
  positionUp?: VRControllerLabelPosition;
  positionRight?: VRControllerLabelPosition;
  positionDown?: VRControllerLabelPosition;
  positionLeft?: VRControllerLabelPosition;
};

export type VRControllerLabelPositions = {
  thumbpad: VRControllerThumbpadLabelPositions;
  triggerButton?: VRControllerLabelPosition;
  gripButton?: VRControllerLabelPosition;
  menuButton?: VRControllerLabelPosition;
  bButton?: VRControllerLabelPosition;
};

export function getVRControllerLabelPositions(
  controller: VRController | null
): VRControllerLabelPositions | null {
  // Wait until the input profile of the controller model is fully loaded.
  const motionController = controller?.controllerModel.motionController;
  if (!controller || !motionController) return null;

  // Since the layout description is not exposed by the TypeScript interface,
  // we have to remove the type first.
  // const controllerNodeName = (motionController as any).layoutDescription
  // .rootNodeName;

  // Make sure that the controller model has been loaded and its position is
  // up to date.
  // if (!controller.controllerModel.getObjectByName(controllerNodeName)) return null;
  controller.controllerModel.updateMatrixWorld(true);

  // Gets the position of mesh in the controller model. We cannot use the
  // motion controller API directly here, because the menu button is reserved.
  // Instead, this code relies on naming conventions. The name of a mesh is
  // usually `<rootNodeName>_<visualResponse>_<value|min|max>` where
  // `<rootNodeName>` is the name of the component with dashes replaced
  // by underscores. Accessing the 3D object this way is equivalent to
  // accessing the `valueNode`, `minNode` or `maxNode`, respectively, of
  // `motionController.components[componentName].visualResponses[visualResponse]`.
  const meshPosition = (
    componentName: string,
    visualResponseName: string,
    nodeName: string
  ): THREE.Vector3 | undefined => {
    const rootNodeName = componentName.replace(/-/g, '_');
    const meshName = `${rootNodeName}_${visualResponseName}_${nodeName}`;
    const mesh = controller.controllerModel.getObjectByName(meshName);
    if (mesh) {
      const position = new THREE.Vector3();
      mesh.getWorldPosition(position);
      return controller.controllerModel.worldToLocal(position);
    }
    return undefined;
  };

  // Gets the positions of the outermost points of the thumbpad
  const thumbpadPosition = (
    ...componentNames: string[]
  ): VRControllerThumbpadLabelPositions => {
    for (let i = 0; i < componentNames.length; i++) {
      const componentName = componentNames[i];
      const up = meshPosition(componentName, 'yaxis', 'min');
      const right = meshPosition(componentName, 'xaxis', 'max');
      const down = meshPosition(componentName, 'yaxis', 'max');
      const left = meshPosition(componentName, 'xaxis', 'min');
      if (up && right && down && left) {
        return {
          positionUp: {
            buttonPosition: up,
            offsetDirection: VRControllerLabelOffsetDirection.LEFT,
          },
          positionRight: {
            buttonPosition: right,
            offsetDirection: VRControllerLabelOffsetDirection.RIGHT,
          },
          positionDown: {
            buttonPosition: down,
            offsetDirection: VRControllerLabelOffsetDirection.LEFT,
          },
          positionLeft: {
            buttonPosition: left,
            offsetDirection: VRControllerLabelOffsetDirection.LEFT,
          },
        };
      }
    }
    return {};
  };

  // Gets the position of the value node of the first existing component
  // with one of the given names of the motion controller.
  const buttonPosition = (
    ...componentNames: string[]
  ): VRControllerLabelPosition | undefined => {
    for (let i = 0; i < componentNames.length; i++) {
      const componentName = componentNames[i];
      const position = meshPosition(componentName, 'pressed', 'value');
      if (position) {
        return {
          buttonPosition: position,
          offsetDirection: VRControllerLabelOffsetDirection.RIGHT,
        };
      }
    }
    return undefined;
  };

  return {
    thumbpad: thumbpadPosition('xr-standard-thumbstick'),
    triggerButton: buttonPosition('xr-standard-trigger'),
    gripButton: buttonPosition('xr-standard-squeeze'),
    menuButton: buttonPosition('x-button', 'a-button'),
    bButton: buttonPosition('y-button', 'b-button'),
  };
}
