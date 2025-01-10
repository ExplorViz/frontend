/* eslint-disable no-underscore-dangle */
/**
 * Adapted from: https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/XRControllerModelFactory.js
 */

import {
  Component,
  Constants as MotionControllerConstants,
  MotionController,
  VisualResponse,
} from '@webxr-input-profiles/motion-controllers';
import { Material, Mesh, Object3D } from 'three';

export type VisualResponseNodes = {
  visualResponse: VisualResponse;
  valueNode: THREE.Object3D;
  minNode?: THREE.Object3D;
  maxNode?: THREE.Object3D;
};

export type TouchPointNode = {
  component: Component;
  touchPointNode: THREE.Object3D;
};

export default class VrControllerModel extends Object3D {
  private _motionController!: MotionController | null;

  private _motionControllerPromise!: Promise<MotionController>;

  private _onMotionControllerConnect:
    | ((motionController: MotionController) => void)
    | null;

  private touchPointNodes: TouchPointNode[];

  private visualResponseNodes: VisualResponseNodes[];

  envMap: any;

  constructor() {
    super();
    this._motionController = null;
    this._onMotionControllerConnect = null;
    this._motionControllerPromise = new Promise((resolve) => {
      this._onMotionControllerConnect = resolve;
    });
    this.touchPointNodes = [];
    this.visualResponseNodes = [];
    this.envMap = null;
  }

  /**
   * Gets profile information for the connected motion controller.
   *
   * This property is `null` unless the 3D model of the controller has been
   * loaded.
   */
  get motionController(): MotionController | null {
    return this._motionController;
  }

  /**
   * Promise for {@link motionController}.
   *
   * The promise completes once the controller's 3D model has been loaded.
   * When the controller reconnects, a new promise is created.
   */
  get motionControllerPromise(): Promise<MotionController> {
    return this._motionControllerPromise;
  }

  onMotionControllerConnect(motionController: MotionController) {
    this._motionController = motionController;
    if (this._onMotionControllerConnect) {
      // The controller was disconnected: resolve current promise.
      this._onMotionControllerConnect(this._motionController);
      this._onMotionControllerConnect = null;
    } else {
      // The controller was not disconnected: replace promise.
      this._motionControllerPromise = Promise.resolve(motionController);
    }
  }

  onMotionControllerDisconnect() {
    this._motionController = null;
    this._motionControllerPromise = new Promise((resolve) => {
      this._onMotionControllerConnect = resolve;
    });
  }

  setEnvironmentMap(envMap: any) {
    if (this.envMap === envMap) {
      return this;
    }

    this.envMap = envMap;
    this.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof Material) {
        // @ts-ignore: ...
        child.material.envMap = this.envMap;
        child.material.needsUpdate = true;
      }
    });

    return this;
  }

  addTouchPointNode(node: TouchPointNode) {
    this.touchPointNodes.push(node);
  }

  addVisualResponseNodes(nodes: VisualResponseNodes) {
    this.visualResponseNodes.push(nodes);
  }

  /**
   * Polls data from the XRInputSource and updates the model's components to match
   * the real world data
   */
  updateMatrixWorld(force: boolean | undefined) {
    super.updateMatrixWorld.call(this, force);

    if (!this.motionController) return;

    // Cause the MotionController to poll the Gamepad for data
    this.motionController.updateFromGamepad();

    // Update the 3D model to reflect the button, thumbstick, and touchpad state.
    this.visualResponseNodes.forEach(
      ({
        visualResponse: { value, valueNodeProperty },
        minNode,
        maxNode,
        valueNode,
      }: VisualResponseNodes) => {
        // Calculate the new properties based on the weight supplied
        switch (valueNodeProperty) {
          case MotionControllerConstants.VisualResponseProperty.VISIBILITY:
            if (typeof value === 'boolean') valueNode.visible = value;
            break;
          case MotionControllerConstants.VisualResponseProperty.TRANSFORM:
            if (typeof value === 'number' && minNode && maxNode) {
              minNode.quaternion.slerpQuaternions(
                maxNode.quaternion,
                valueNode.quaternion,
                value
              );

              valueNode.position.lerpVectors(
                minNode.position,
                maxNode.position,
                value
              );
            }
            break;
          default:
            break;
        }
      }
    );
  }
}
