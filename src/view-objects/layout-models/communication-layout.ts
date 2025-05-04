import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import * as THREE from 'three';

export default class CommunicationLayout {
  model: ClassCommunication | ComponentCommunication;

  startX: number = -5;

  startY: number = 0;

  startZ: number = -5;

  endX: number = -5;

  endY: number = 0;

  endZ: number = -5;

  lineThickness: number = 1;

  pointsFor3D: THREE.Vector3[] = [];

  constructor(model: ClassCommunication | ComponentCommunication) {
    this.model = model;
  }

  // Copy function
  copy(): CommunicationLayout {
    const copy = new CommunicationLayout(this.model);
    copy.model = this.model; // Assuming shallow copy is sufficient, otherwise you need to handle deep copy based on the actual structure of ClassCommunication or ComponentCommunication
    copy.startX = this.startX;
    copy.startY = this.startY;
    copy.startZ = this.startZ;
    copy.endX = this.endX;
    copy.endY = this.endY;
    copy.endZ = this.endZ;
    copy.lineThickness = this.lineThickness;
    copy.pointsFor3D = this.pointsFor3D.map(
      (point) => new THREE.Vector3(point.x, point.y, point.z)
    );
    return copy;
  }

  get startPoint() {
    return new THREE.Vector3(this.startX, this.startY, this.startZ);
  }

  set startPoint(start: THREE.Vector3) {
    this.startX = start.x;
    this.startY = start.y;
    this.startZ = start.z;
  }

  getMiddlePoint({ yOffset = 0 }) {
    const dir = this.endPoint.clone().sub(this.startPoint);
    const length = dir.length();
    const halfVector = dir.normalize().multiplyScalar(length * 0.5);
    const middlePoint = this.startPoint.clone().add(halfVector);
    middlePoint.setComponent(1, middlePoint.y + yOffset);

    return middlePoint;
  }

  get endPoint() {
    return new THREE.Vector3(this.endX, this.endY, this.endZ);
  }

  set endPoint(end: THREE.Vector3) {
    this.endX = end.x;
    this.endY = end.y;
    this.endZ = end.z;
  }

  getCurve({ yOffset = 0 }) {
    return new THREE.QuadraticBezierCurve3(
      this.startPoint,
      this.getMiddlePoint({ yOffset }),
      this.endPoint
    );
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
