import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import { Object3D } from 'three';

export default class K8sNodeObject3d extends Object3D {
  landscapeData: LandscapeData;

  constructor(landscapeData: LandscapeData) {
    super();
    this.landscapeData = landscapeData;
  }
}
