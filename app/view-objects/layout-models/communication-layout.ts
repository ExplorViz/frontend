import * as THREE from 'three';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';

export default class CommunicationLayout {
  model: DrawableClassCommunication;

  startX: number = -5;

  startY: number = 0;

  startZ: number = -5;

  endX: number = -5;

  endY: number = 0;

  endZ: number = -5;

  lineThickness: number = 1;

  pointsFor3D: THREE.Vector3[] = [];

  constructor(model: DrawableClassCommunication) {
    this.model = model;
  }

  get startPoint() {
    return new THREE.Vector3(this.startX, this.startY, this.startZ);
  }

  set startPoint(start: THREE.Vector3) {
    this.startX = start.x;
    this.startY = start.y;
    this.startZ = start.z;
  }

  get endPoint() {
    return new THREE.Vector3(this.endX, this.endY, this.endZ);
  }

  set endPoint(end: THREE.Vector3) {
    this.endX = end.x;
    this.endY = end.y;
    this.endZ = end.z;
  }

  equals(obj?: CommunicationLayout) {
    return (
      obj &&
      this.startX === obj.startX &&
      this.startY === obj.startY &&
      this.startZ === obj.startZ &&
      this.endX === obj.endX &&
      this.endY === obj.endY &&
      this.endZ === obj.endZ &&
      this.lineThickness === obj.lineThickness
    );
  }
}
