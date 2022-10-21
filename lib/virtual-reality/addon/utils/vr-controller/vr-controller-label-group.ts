import * as THREE from 'three';
import VRController from '../vr-controller';
import VRControllerBindings from './vr-controller-bindings';
import VRControllerBindingsList from './vr-controller-bindings-list';
import { getVRControllerLabelPositions } from './vr-controller-label-positions';

export default class VRControllerLabelGroup extends THREE.Group {
  static get visibilitySetting(): boolean {
    return (
      window.localStorage.getItem('explorviz.vr.labels.visible') !== 'false'
    );
  }

  static set visibilitySetting(visible: boolean) {
    window.localStorage.setItem(
      'explorviz.vr.labels.visible',
      visible.toString()
    );
  }

  controllerBindings: VRControllerBindingsList;

  lastControllerBindings: VRControllerBindings | null;

  constructor(controllerBindings: VRControllerBindingsList) {
    super();
    this.controllerBindings = controllerBindings;
    this.lastControllerBindings = null;
    this.visible = VRControllerLabelGroup.visibilitySetting;
  }

  updateLabels() {
    // Test whether the controller bindings or motion controller changed
    // since the last update.
    const bindings = this.controllerBindings.currentBindings;
    if (bindings !== this.lastControllerBindings) {
      // Remove all existing labels.
      this.remove(...this.children);

      // Add new meshes for the labels of the current bindings.
      const controller = VRController.findController(this);
      const positions = getVRControllerLabelPositions(controller);
      if (positions) {
        bindings.addLabels(this, positions);
        this.lastControllerBindings = bindings;
      } else {
        this.lastControllerBindings = null;
      }
    }
  }
}
