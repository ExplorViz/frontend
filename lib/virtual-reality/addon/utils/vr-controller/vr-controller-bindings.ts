import VRControllerButtonBinding from './vr-controller-button-binding';
import VRControllerLabelGroup from './vr-controller-label-group';
import { VRControllerLabelPositions } from './vr-controller-label-positions';
import VRControllerThumbpadBinding from './vr-controller-thumbpad-binding';

export default class VRControllerBindings {
  thumbpad?: VRControllerThumbpadBinding;

  triggerButton?: VRControllerButtonBinding<number>;

  gripButton?: VRControllerButtonBinding<undefined>;

  menuButton?: VRControllerButtonBinding<undefined>;

  bButton?: VRControllerButtonBinding<undefined>;

  constructor({
    thumbpad,
    triggerButton,
    gripButton,
    menuButton,
    bButton,
  }: {
    thumbpad?: VRControllerThumbpadBinding;
    triggerButton?: VRControllerButtonBinding<number>;
    gripButton?: VRControllerButtonBinding<undefined>;
    menuButton?: VRControllerButtonBinding<undefined>;
    bButton?: VRControllerButtonBinding<undefined>;
  }) {
    this.thumbpad = thumbpad;
    this.triggerButton = triggerButton;
    this.gripButton = gripButton;
    this.menuButton = menuButton;
    this.bButton = bButton;
  }

  addLabels(
    group: VRControllerLabelGroup,
    positions: VRControllerLabelPositions,
  ): void {
    this.thumbpad?.addLabels(group, positions.thumbpad);
    if (positions.triggerButton) this.triggerButton?.addLabel(group, positions.triggerButton);
    if (positions.gripButton) this.gripButton?.addLabel(group, positions.gripButton);
    if (positions.menuButton) this.menuButton?.addLabel(group, positions.menuButton);
    if (positions.bButton) this.bButton?.addLabel(group, positions.bButton);
  }
}
