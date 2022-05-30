import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import { task } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { openComponentMesh, restoreComponentState } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import { removeHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import { Application, Class, Package, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import THREE from 'three';
import ArSettings from 'virtual-reality/services/ar-settings';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import WebSocketService from 'virtual-reality/services/web-socket';
import VrApplicationObject3D from 'virtual-reality/utils/view-objects/application/vr-application-object-3d';
import { SerializedVrRoom, SerialzedApp } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import Configuration from './configuration';
import HighlightingService, { HightlightComponentArgs } from './highlighting-service';
import ApplicationRepository from './repos/application-repository';
import FontRepository from './repos/font-repository';
import ToastMessage from './toast-message';
import UserSettings from './user-settings';

export type LayoutData = {
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
};

export type AddApplicationArgs = {
  position?: THREE.Vector3;
  quaternion?: THREE.Quaternion;
  scale?: THREE.Vector3;
  openComponents?: Set<string>;
  highlightedComponents?: HightlightComponentArgs[];
};

function serializedRoomToAddApplicationArgs(app: SerialzedApp) {
  return {
    position: new THREE.Vector3(...app.position),
    quaternion: new THREE.Quaternion(...app.quaternion),
    scale: new THREE.Vector3(...app.scale),
    openComponents: new Set(app.openComponents),
    highlightedComponents: app.highlightedComponents.map(
      (highlightedComponent) => ({
        entityType: highlightedComponent.entityType,
        entityId: highlightedComponent.entityId,
        // color: this.remoteUsers.lookupRemoteUserById(
        //     highlightedComponent.userId,
        // )?.color,
      }),
    ),
  };
}

export default class ApplicationRenderer extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  debug = debugLogger('ApplicationRendering');

  @service('local-user')
  localUser!: LocalUser;

  @service('configuration')
  configuration!: Configuration;

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('repos/font-repository')
  fontRepo!: FontRepository;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service('toast-message')
  toastMessage!: ToastMessage;

  private structureLandscapeData!: StructureLandscapeData;

  private openApplicationsMap: Map<string, ApplicationObject3D>;

  readonly appCommRendering: CommunicationRendering;

  @tracked
  updatables: any[] = [];

  initCallback?: (applicationObject3D: ApplicationObject3D) => void;

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  get font() {
    return this.fontRepo.font;
  }

  constructor(properties?: object) {
    super(properties);
    this.openApplicationsMap = new Map();
    this.appCommRendering = new CommunicationRendering(this.configuration,
      this.userSettings);
  }

  resetAndAddToScene(updateables: any[]) {
    this.initCallback = undefined;
    this.updatables = updateables;
    this.openApplicationsMap.clear();
  }

  get openApplicationIds() {
    return Array.from(this.openApplicationsMap.keys());
  }

  get openApplications() {
    return Array.from(this.openApplicationsMap.values());
  }
  /**
   * Adds labels to all box meshes of a given application
   */
  addLabels(applicationObject3D: ApplicationObject3D, font: THREE.Font, labelAll: boolean = false) {
    const {
      clazzTextColor,
      componentTextColor,
      foundationTextColor,
    } = this.configuration.applicationColors;

    applicationObject3D.getBoxMeshes().forEach((mesh) => {
      // Labeling is time-consuming. Thus, label only visible meshes incrementally
      // as opposed to labeling all meshes up front (as done in application-rendering).
      if (labelAll || mesh.visible) {
        if (mesh instanceof ClazzMesh) {
          Labeler.addClazzTextLabel(
            mesh,
            font,
            clazzTextColor,
          );
        } else if (mesh instanceof ComponentMesh) {
          Labeler.addBoxTextLabel(
            mesh,
            font,
            componentTextColor,
          );
        } else if (mesh instanceof FoundationMesh) {
          Labeler.addBoxTextLabel(
            mesh,
            font,
            foundationTextColor,
          );
        }
      }
    });
  }

  removeApplicationLocally(applicationId: string) {
    const application = this.getApplicationById(applicationId);
    if (application) {
      this.openApplicationsMap.delete(application.dataModel.id);
      application.parent?.remove(application);
      application.children.forEach((child) => {
        if (child instanceof BaseMesh) {
          child.disposeRecursively();
        }
      });
    }
  }

  private saveApplicationState(applicationObject3D: ApplicationObject3D): AddApplicationArgs {
    const serializedApp = this.roomSerializer.serializeApplication(applicationObject3D);
    return serializedRoomToAddApplicationArgs(serializedApp);
  }

  @task *
    addApplicationTask(
      applicationData: ApplicationData,
      addApplicationArgs: AddApplicationArgs = {},
  ) {
    const applicationModel = applicationData.application;
    const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(applicationData.layoutData);

    const isOpen = this.isApplicationOpen(applicationModel.id);
    let applicationObject3D = this.getApplicationById(applicationModel.id);

    let layoutChanged = true;
    if (applicationObject3D) {
      layoutChanged = JSON.stringify(boxLayoutMap) !== JSON.stringify(applicationObject3D.boxLayoutMap)
      // if (layoutChanged) {
      applicationObject3D.dataModel = applicationModel;
      applicationObject3D.boxLayoutMap = boxLayoutMap;
      // }
    } else {
      applicationObject3D = new VrApplicationObject3D(
        applicationModel,
        boxLayoutMap,
      );
    }

    const applicationState = Object.keys(addApplicationArgs).length === 0 && isOpen && layoutChanged
      ? this.saveApplicationState(applicationObject3D) : addApplicationArgs;

    if (layoutChanged) {
      this.cleanUpApplication(applicationObject3D);

      // Add new meshes to application
      EntityRendering.addFoundationAndChildrenToApplication(
        applicationObject3D,
        this.configuration.applicationColors,
      );
    }

    // Restore state of components highlighting
    restoreComponentState(applicationObject3D, applicationState.openComponents);
    this.addLabels(applicationObject3D, this.font, false);

    this.addCommunication(applicationObject3D);

    applicationState.highlightedComponents?.forEach((highlightedComponent) => {
      this.highlightingService.hightlightComponentLocallyByTypeAndId(
        applicationObject3D!,
        highlightedComponent,
      );
    });
    this.highlightingService.updateHighlighting(applicationObject3D);

    this.openApplicationsMap.set(
      applicationModel.id,
      applicationObject3D,
    );
    // this.heatmapConf.updateActiveApplication(applicationObject3D);

    applicationObject3D.resetRotation();

    return applicationObject3D;
  }

  private cleanUpApplication(applicationObject3D: ApplicationObject3D) {
    applicationObject3D.removeAllEntities();
    removeHighlighting(applicationObject3D);
  }

  updateOrCreateApplication(application: Application, layoutMap: Map<string, LayoutData>) {
    // Converting plain JSON layout data due to worker limitations
    const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(layoutMap);
    const applicationObject3D = this.getApplicationById(application.id);
    if (applicationObject3D) {
      applicationObject3D.dataModel = application;

      applicationObject3D.boxLayoutMap = boxLayoutMap;
      return applicationObject3D;
    }
    return new VrApplicationObject3D(
      application,
      boxLayoutMap,
    );
  }

  @action
  addCommunicationForAllApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      this.addCommunication(applicationObject3D);
    });
    this.updateLinks?.();
  }

  @action
  removeCommunicationForAllApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      applicationObject3D.removeAllCommunication();

      // Remove highlighting if highlighted communication is no longer visible
      if (applicationObject3D.highlightedEntity instanceof ClazzCommunicationMesh) {
        removeHighlighting(applicationObject3D);
      }
    });
  }

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(applicationObject3D.dataModel.id);
    const drawableClassCommunications = applicationData?.drawableClassCommunications;
    if (drawableClassCommunications) {
      this.appCommRendering.addCommunication(
        applicationObject3D,
        drawableClassCommunications,
      );
    }
  }

  @action
  updateApplicationObject3DAfterUpdate(applicationObject3D: ApplicationObject3D) {
    if (this.localUser.visualizationMode !== 'ar' || this.arSettings.renderCommunication) {
      this.addCommunication(applicationObject3D);
    }
    if (!this.appSettings.keepHighlightingOnOpenOrClose.value) {
      removeHighlighting(applicationObject3D);
    } else {
      this.highlightingService.updateHighlighting(applicationObject3D);
    }
    this.addLabels(applicationObject3D, this.font, false);
    this.updateLinks?.();
  }

  updateLinks?: () => void;

  getDrawableClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(applicationObjetc3D.dataModel.id);
    return applicationData?.drawableClassCommunications;
  }

  getApplicationInCurrentLandscapeById(id: string): Application | undefined {
    return getApplicationInLandscapeById(this.structureLandscapeData, id);
  }

  getApplicationById(id: string): ApplicationObject3D | undefined {
    return this.openApplicationsMap.get(id);
  }

  getOpenApplications(): ApplicationObject3D[] {
    return Array.from(this.openApplicationsMap.values());
  }

  isApplicationOpen(id: string): boolean {
    return this.openApplicationsMap.has(id);
  }

  getCommunicationMeshById(id: string) {
    const openApplications = this.getOpenApplications();
    for (let i = 0; i < openApplications.length; i++) {
      const application = openApplications[i];
      const mesh = application.getCommMeshByModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  getBoxMeshByModelId(id: string) {
    const openApplications = this.getOpenApplications();
    for (let i = 0; i < openApplications.length; i++) {
      const application = openApplications[i];
      const mesh = application.getBoxMeshbyModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  toggleComponent(
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D,
  ) {
    this.toggleComponentLocally(componentMesh, applicationObject3D);
    this.sender.sendComponentUpdate(
      applicationObject3D.dataModel.id,
      componentMesh.dataModel.id,
      componentMesh.opened,
      false,
    );
  }

  toggleComponentLocally(
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D,
  ) {
    EntityManipulation.toggleComponentMeshState(
      componentMesh,
      applicationObject3D,
    );
    this.addLabels(applicationObject3D, this.font, false);
    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  closeAllComponents(applicationObject3D: ApplicationObject3D) {
    this.closeAllComponentsLocally(applicationObject3D);
    this.sender.sendComponentUpdate(
      applicationObject3D.dataModel.id,
      '',
      false,
      true,
    );
  }

  closeAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.closeAllComponents(applicationObject3D);

    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  openAllComponents(applicationObject3D: ApplicationObject3D) {
    this.openAllComponentsLocally(applicationObject3D);
    this.sender.sendComponentUpdate(
      applicationObject3D.dataModel.id,
      '',
      true,
      true,
    );
  }

  @action
  openAllComponentsOfAllApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      this.openAllComponents(applicationObject3D);
    });
  }

  openAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.openAllComponents(applicationObject3D);
    this.addLabels(applicationObject3D, this.font, false);

    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  updateCommunication() {
    this.getOpenApplications().forEach((application) => {
      const drawableComm = this.getDrawableClassCommunications(
        application,
      )!;

      if (this.arSettings.renderCommunication) {
        this.appCommRendering.addCommunication(application, drawableComm);
      } else {
        application.removeAllCommunication();
      }
    });
  }

  cleanUpApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      applicationObject3D.removeAllEntities();
      removeHighlighting(applicationObject3D);
      this.removeApplicationLocally(applicationObject3D.dataModel.id);
    });
  }

  /**
   * Toggles the visualization of communication lines.
   */
  @action
  toggleCommunicationRendering() {
    this.configuration.isCommRendered = !this.configuration.isCommRendered;
    if (this.configuration.isCommRendered) {
      this.addCommunicationForAllApplications();
    } else {
      this.removeCommunicationForAllApplications();
    }
  }

  /**
   * Highlights a given component or clazz
   *
   * @param entity Component or clazz which shall be highlighted
   */
  @action
  highlightModel(entity: Package | Class, applicationId: string) {
    const applicationObject3D = this.getApplicationById(applicationId);
    if (!applicationObject3D) {
      return;
    }
    this.highlightingService.highlightModel(entity, applicationObject3D);
  }

  /**
   * Opens all parents / components of a given component or clazz.
   * Adds communication and restores highlighting.
   *
   * @param entity Component or Clazz of which the mesh parents shall be opened
   */
  @action
  openParents(entity: Package | Class, applicationId: string) {
    const applicationObject3D = this.getApplicationById(applicationId);
    if (!applicationObject3D) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-shadow
    function getAllAncestorComponents(entity: Package | Class): Package[] {
      // if (isClass(entity)) {
      //  return getAllAncestorComponents(entity.parent);
      // }

      if (entity.parent === undefined) {
        return [];
      }

      return [entity.parent, ...getAllAncestorComponents(entity.parent)];
    }

    const ancestors = getAllAncestorComponents(entity);
    ancestors.forEach((anc) => {
      const ancestorMesh = applicationObject3D.getBoxMeshbyModelId(anc.id);
      if (ancestorMesh instanceof ComponentMesh) {
        openComponentMesh(ancestorMesh, applicationObject3D);
      }
    });
    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  restore(room: SerializedVrRoom) {
    this.cleanUpApplications();
    room.openApps.forEach((app) => {
      const applicationData = this.applicationRepo.getById(app.id);
      if (applicationData) {
        perform(
          this.addApplicationTask,
          applicationData,
          serializedRoomToAddApplicationArgs(app),
        );
      }
    });
  }

  getMeshById(meshId: string) {
    return this.getBoxMeshByModelId(meshId) || this.getCommunicationMeshById(meshId);
  }

  static convertToBoxLayoutMap(layoutedApplication: Map<string, LayoutData>) {
    const boxLayoutMap: Map<string, BoxLayout> = new Map();

    layoutedApplication.forEach((value, key) => {
      const boxLayout = new BoxLayout();
      boxLayout.positionX = value.positionX;
      boxLayout.positionY = value.positionY;
      boxLayout.positionZ = value.positionZ;
      boxLayout.width = value.width;
      boxLayout.height = value.height;
      boxLayout.depth = value.depth;
      boxLayoutMap.set(key, boxLayout);
    });

    return boxLayoutMap;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'application-renderer': ApplicationRenderer;
  }
}
