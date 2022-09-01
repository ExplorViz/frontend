import VRController from '../vr-controller';
import VRControllerLabelGroup from './vr-controller-label-group';
import VRControllerLabelMesh from './vr-controller-label-mesh';
import { VRControllerLabelPosition } from './vr-controller-label-positions';

type VRControllerButtonCallbacks<V> = {
  onButtonDown?(controller: VRController): void;
  onButtonPress?(controller: VRController, value: V): void;
  onButtonUp?(controller: VRController): void;
};

export default class VRControllerButtonBinding<V> {
  label: string;

  callbacks: VRControllerButtonCallbacks<V>;

  constructor(label: string, callbacks: VRControllerButtonCallbacks<V>) {
    this.label = label;
    this.callbacks = callbacks;
  }

  addLabel(
    group: VRControllerLabelGroup,
    position: VRControllerLabelPosition,
  ): void {
    group.add(new VRControllerLabelMesh(this.label, position));
  }
}
