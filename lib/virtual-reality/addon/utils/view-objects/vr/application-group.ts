import * as THREE from 'three';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';

export default class ApplicationGroup extends THREE.Group {
  openedApps: Map<string, ApplicationObject3D>;

  grabbedApplications: Set<string> = new Set();

  constructor() {
    super();
    this.openedApps = new Map();
  }

  addApplication(application: ApplicationObject3D) {
    if (!this.hasApplication(application.dataModel.instanceId)) {
      this.add(application);
      this.openedApps.set(application.dataModel.instanceId, application);
    }
  }

  getApplication(id: string) {
    return this.openedApps.get(id);
  }

  hasApplication(id: string) {
    return this.openedApps.has(id);
  }

  removeApplicationById(id: string) {
    const application = this.openedApps.get(id);
    if (application) {
      this.openedApps.delete(id);
      this.grabbedApplications.delete(id);
      if (application.parent) {
        application.parent.remove(application);
      }
    }
  }

  attachApplicationTo(id: string, object: THREE.Object3D) {
    this.grabbedApplications.add(id);

    const application = this.getApplication(id);
    if (application) {
      this.remove(application);
      object.add(application);
    }
  }

  isApplicationGrabbed(id: string) {
    return this.grabbedApplications.has(id);
  }

  releaseApplication(id: string) {
    const application = this.getApplication(id);
    this.grabbedApplications.delete(id);
    if (application) {
      if (application.parent) {
        application.parent.remove(application);
      }
      this.add(application);
    }
  }

  releaseAllApplications() {
    this.grabbedApplications.forEach((id) => this.releaseApplication(id));
  }

  /**
   * Removes all applications.
   */
  clear() {
    this.releaseAllApplications();
    Array.from(this.openedApps.values()).forEach((application) => {
      this.remove(application);
      this.openedApps.delete(application.dataModel.instanceId);
      application.children.forEach((child) => {
        if (child instanceof BaseMesh) {
          child.disposeRecursively();
        }
      });
    });
    return this;
  }
}
