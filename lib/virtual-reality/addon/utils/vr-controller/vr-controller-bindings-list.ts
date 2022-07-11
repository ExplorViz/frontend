import { VRControllerCallbackFunctions } from '../vr-controller';
import VRControllerBindings from './vr-controller-bindings';

export default class VRControllerBindingsList {
  defaultBindings: VRControllerBindings;

  controllerBindings: VRControllerBindings[];

  constructor(
    defaultBindings: VRControllerBindings,
    controllerBindings: VRControllerBindings[],
  ) {
    this.defaultBindings = defaultBindings;
    this.controllerBindings = controllerBindings;
  }

  get currentBindings(): VRControllerBindings {
    if (this.controllerBindings.length === 0) return this.defaultBindings;
    return this.controllerBindings[this.controllerBindings.length - 1];
  }

  makeCallbacks(): VRControllerCallbackFunctions {
    return {
      thumbpadTouch: (controller, axes) => {
        if (this.currentBindings.thumbpad?.callbacks.onThumbpadTouch) {
          this.currentBindings.thumbpad.callbacks.onThumbpadTouch(controller, axes);
        }
      },
      thumbpadDown: (controller, axes) => {
        if (this.currentBindings.thumbpad?.callbacks.onThumbpadDown) {
          this.currentBindings.thumbpad.callbacks.onThumbpadDown(controller, axes);
        }
      },
      thumbpadPress: (controller, axes) => {
        if (this.currentBindings.thumbpad?.callbacks.onThumbpadPress) {
          this.currentBindings.thumbpad.callbacks.onThumbpadPress(controller, axes);
        }
      },
      thumbpadUp: (controller, axes) => {
        if (this.currentBindings.thumbpad?.callbacks.onThumbpadUp) {
          this.currentBindings.thumbpad.callbacks.onThumbpadUp(controller, axes);
        }
      },

      triggerDown: (controller) => {
        if (this.currentBindings.triggerButton?.callbacks.onButtonDown) {
          this.currentBindings.triggerButton.callbacks.onButtonDown(controller);
        }
      },
      triggerPress: (controller, value) => {
        if (this.currentBindings.triggerButton?.callbacks.onButtonPress) {
          this.currentBindings.triggerButton.callbacks.onButtonPress(controller, value);
        }
      },
      triggerUp: (controller) => {
        if (this.currentBindings.triggerButton?.callbacks.onButtonUp) {
          this.currentBindings.triggerButton.callbacks.onButtonUp(controller);
        }
      },

      gripDown: (controller) => {
        if (this.currentBindings.gripButton?.callbacks.onButtonDown) {
          this.currentBindings.gripButton.callbacks.onButtonDown(controller);
        }
      },
      gripPress: (controller) => {
        if (this.currentBindings.gripButton?.callbacks.onButtonPress) {
          this.currentBindings.gripButton.callbacks.onButtonPress(controller, undefined);
        }
      },
      gripUp: (controller) => {
        if (this.currentBindings.gripButton?.callbacks.onButtonUp) {
          this.currentBindings.gripButton.callbacks.onButtonUp(controller);
        }
      },

      menuUp: (controller) => {
        if (this.currentBindings.menuButton?.callbacks.onButtonDown) {
          this.currentBindings.menuButton.callbacks.onButtonDown(controller);
        }
      },
      menuPress: (controller) => {
        if (this.currentBindings.menuButton?.callbacks.onButtonPress) {
          this.currentBindings.menuButton.callbacks.onButtonPress(controller, undefined);
        }
      },
      menuDown: (controller) => {
        if (this.currentBindings.menuButton?.callbacks.onButtonUp) {
          this.currentBindings.menuButton.callbacks.onButtonUp(controller);
        }
      },

      bButtonUp: (controller) => {
        if (this.currentBindings.bButton?.callbacks.onButtonDown) {
          this.currentBindings.bButton.callbacks.onButtonDown(controller);
        }
      },
      bButtonPress: (controller) => {
        if (this.currentBindings.bButton?.callbacks.onButtonPress) {
          this.currentBindings.bButton.callbacks.onButtonPress(controller, undefined);
        }
      },
      bButtonDown: (controller) => {
        if (this.currentBindings.bButton?.callbacks.onButtonUp) {
          this.currentBindings.bButton.callbacks.onButtonUp(controller);
        }
      },
    };
  }
}
