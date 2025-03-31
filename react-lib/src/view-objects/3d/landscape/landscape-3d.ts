import * as THREE from 'three';
import LandscapeModel from './landscape-model';
import { GrabbableObject } from 'explorviz-frontend/src/utils/extended-reality/view-objects/interfaces/grabbable-object';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import K8sMesh from 'explorviz-frontend/src/view-objects/3d/k8s/k8s-mesh';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import SemanticZoomManager from '../application/utils/semantic-zoom-manager';

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

  // Landscape3D directly contains apps, k8s boxes and communication between apps
  app3Ds: Map<string, ApplicationObject3D> = new Map();
  k8sMeshes: Map<string, K8sMesh> = new Map();
  interAppComms: Map<string, ClazzCommunicationMesh> = new Map();

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

  addApplication(app3D: ApplicationObject3D) {
    this.add(app3D);
    this.app3Ds.set(app3D.getModelId(), app3D);
  }

  getApplicationById(appId: string) {
    return this.app3Ds.get(appId);
  }

  getAllApp3Ds() {
    return Array.from(this.app3Ds.values());
  }

  removeApp3D(app3D: ApplicationObject3D) {
    this.remove(app3D);
    app3D.removeAll();
    this.app3Ds.delete(app3D.getModelId());
  }

  addK8sMesh(k8sMesh: K8sMesh) {
    this.add(k8sMesh);
    this.k8sMeshes.set(k8sMesh.getModelId(), k8sMesh);
  }

  getK8sMeshById(k8sId: string) {
    return this.k8sMeshes.get(k8sId);
  }

  getAllK8sMeshes() {
    return Array.from(this.k8sMeshes.values());
  }

  removeK8sMesh(k8sMesh: K8sMesh) {
    this.remove(k8sMesh);
    k8sMesh.disposeRecursively(SemanticZoomManager);
    this.k8sMeshes.delete(k8sMesh.getModelId());
  }

  addCommunication(commMesh: ClazzCommunicationMesh) {
    this.interAppComms.set(commMesh.getModelId(), commMesh);
    this.add(commMesh);
  }

  getCommunicationById(id: string) {
    return this.interAppComms.get(id);
  }

  getAllInterAppCommunications() {
    return Array.from(this.interAppComms.values());
  }

  removeCommunication(commMesh: ClazzCommunicationMesh) {
    this.remove(commMesh);
    this.interAppComms.delete(commMesh.getModelId());
    commMesh.disposeRecursively(SemanticZoomManager);
  }

  removeAll() {
    this.getAllApp3Ds().forEach((app3D) => {
      this.removeApp3D(app3D);
    });

    this.getAllK8sMeshes().forEach((k8sMesh) => {
      this.removeK8sMesh(k8sMesh);
    });

    this.getAllInterAppCommunications().forEach((comm) => {
      this.removeCommunication(comm);
    });
  }

  center(layout: BoxLayout | undefined) {
    if (!layout) return;

    this.position.x = (-layout.width * this.scale.x) / 2;
    this.position.z = (-layout.depth * this.scale.z) / 2;
  }

  layoutLandscape(boxLayoutMap: Map<string, BoxLayout>) {
    this.dataModel.boxLayout = boxLayoutMap.get(this.getModelId())!;

    this.center(this.dataModel.boxLayout);

    this.app3Ds.forEach((app3D) => {
      app3D.updateLayout(boxLayoutMap);
    });

    this.k8sMeshes.forEach((k8sMesh) => {
      k8sMesh.updateLayout(boxLayoutMap.get(k8sMesh.getModelId()));
    });
  }
}
