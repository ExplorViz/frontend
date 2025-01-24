import { GrabbableObject } from 'explorviz-frontend/utils/extended-reality/view-objects/interfaces/grabbable-object';
import * as THREE from 'three';
import LandscapeModel from './landscape-model';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';

export default class Landscape3D
  extends THREE.Group
  implements GrabbableObject
{
  dataModel = new LandscapeModel(
    {
      landscapeToken: 'unset',
      nodes: [],
      k8sNodes: [],
    },
    [],
    new BoxLayout()
  );

  constructor() {
    super();
    const scalar = 0.01;
    this.scale.set(scalar, scalar, scalar);
  }

  getModelId() {
    return this.dataModel.id;
  }

  getGrabId() {
    return this.getModelId();
  }

  canBeIntersected() {
    return true;
  }
}
