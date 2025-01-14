import VRController from 'explorviz-frontend/utils/extended-reality/vr-controller';
import VRControllerLabelGroup from 'explorviz-frontend/utils/extended-reality/vr-controller/vr-controller-label-group';
import VRControllerLabelMesh from 'explorviz-frontend/utils/extended-reality/vr-controller/vr-controller-label-mesh';
import { VRControllerLabelPosition } from 'explorviz-frontend/utils/extended-reality/vr-controller/vr-controller-label-positions';

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
    position: VRControllerLabelPosition
  ): void {
    group.add(new VRControllerLabelMesh(this.label, position));
  }
}
