// #region imports
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { removeAllHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import ArSettings from 'virtual-reality/services/ar-settings';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import VrApplicationObject3D from 'virtual-reality/utils/view-objects/application/vr-application-object-3d';
import { SerializedVrRoom } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import Configuration from './configuration';
import HighlightingService, {
  HightlightComponentArgs,
} from './highlighting-service';
import LinkRenderer from './link-renderer';
import ApplicationRepository from './repos/application-repository';
import FontRepository from './repos/font-repository';
import ToastMessage from './toast-message';
import UserSettings from './user-settings';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import type Owner from '@ember/owner';
import {
  EntityMesh,
  isEntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { getSubPackagesOfPackage } from 'explorviz-frontend/utils/package-helpers';
import type FakeInstanceMesh from 'explorviz-frontend/view-objects/3d/application/fake-mesh';
// #endregion imports

export default class ApplicationRenderer extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  // #region fields

  debug = debugLogger('ApplicationRendering');

  @service('local-user')
  localUser!: LocalUser;

  @service('configuration')
  configuration!: Configuration;

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('repos/font-repository')
  fontRepo!: FontRepository;

  @service('virtual-reality@vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service('toast-message')
  toastMessage!: ToastMessage;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  private openApplicationsMap: Map<string, ApplicationObject3D>;

  private readonly appCommRendering: CommunicationRendering;

  // #endregion fields

  constructor(properties?: object) {
    super(properties);
    this.openApplicationsMap = new Map();
    this.appCommRendering = new CommunicationRendering(
      this.configuration,
      this.userSettings,
      this.localUser
    );
  }

  // #region getters

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  get font() {
    return this.fontRepo.font;
  }

  get openApplications() {
    return Array.from(this.openApplicationsMap.values());
  }

  get openApplicationIds() {
    return Array.from(this.openApplicationsMap.keys());
  }

  getApplicationById(id: string): ApplicationObject3D | undefined {
    return this.openApplicationsMap.get(id);
  }

  getBoxMeshByModelId(id: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getBoxMeshbyModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  getCommunicationMeshById(id: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getCommMeshByModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  getDrawableClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    return applicationObjetc3D.data.drawableClassCommunications;
  }

  getGraphPosition(mesh: THREE.Object3D) {
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    this.forceGraph.graph.worldToLocal(worldPosition);
    return worldPosition;
  }

  getMeshById(meshId: string): BaseMesh | FakeInstanceMesh | undefined {
    return (
      this.getBoxMeshByModelId(meshId) ||
      this.getCommunicationMeshById(meshId) ||
      this.linkRenderer.getLinkById(meshId)
    );
  }

  /**
   * Returns application id of the application which contains the mesh with the given id, if existend. Else undefined.
   *
   * @param id The mesh's id to lookup
   */
  getApplicationIdByMeshId(meshId: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getMeshById(meshId);
      if (mesh) return application.getModelId();
    }
    return undefined;
  }

  getOpenApplications(): ApplicationObject3D[] {
    return Array.from(this.openApplicationsMap.values());
  }

  isApplicationOpen(id: string): boolean {
    return this.openApplicationsMap.has(id);
  }

  // #endregion getters

  addApplication(
    applicationData: ApplicationData,
    addApplicationArgs: AddApplicationArgs = {}
  ) {
    const applicationModel = applicationData.application;
    const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(
      applicationData.layoutData
    );

    const isOpen = this.isApplicationOpen(applicationModel.id);
    let applicationObject3D = this.getApplicationById(applicationModel.id);

    let layoutChanged = true;
    if (applicationObject3D) {
      layoutChanged = boxLayoutMap !== applicationObject3D.boxLayoutMap;

      applicationObject3D.boxLayoutMap = boxLayoutMap;
    } else {
      applicationObject3D = new VrApplicationObject3D(
        applicationData,
        boxLayoutMap,
        this.configuration.applicationColors,
        addApplicationArgs.openComponents
      );
    }

    const applicationState =
      Object.keys(addApplicationArgs).length === 0 && isOpen && layoutChanged
        ? this.roomSerializer.serializeToAddApplicationArgs(applicationObject3D)
        : addApplicationArgs;

    if (layoutChanged) {
      applicationObject3D.updateModel(
        this.configuration.applicationColors,
        applicationState.openComponents
      );
    }

    this.addCommunication(applicationObject3D);

    // Add labels to application
    performance.mark('addApplicationLabels-start');
    Labeler.addApplicationLabels(
      applicationObject3D,
      this.font,
      this.configuration.applicationColors
    );
    performance.mark('addApplicationLabels-end');

    this.addCommunication(applicationObject3D);

    // reset transparency of inner communication links
    applicationObject3D.getCommMeshes().forEach((commMesh) => {
      if (applicationState.transparentComponents?.has(commMesh.getModelId()))
        commMesh.turnTransparent(this.highlightingService.opacity);
    });

    // reset transparency of extern communication links

    applicationState.transparentComponents?.forEach((id) => {
      const externLinkMesh = this.linkRenderer.getLinkById(id);
      if (externLinkMesh) {
        externLinkMesh.turnTransparent(this.highlightingService.opacity);
      }
    });

    // reset highlights -------------------

    const currentSetting =
      this.userSettings.applicationSettings.enableMultipleHighlighting.value;
    this.userSettings.applicationSettings.enableMultipleHighlighting.value =
      true; // so resetting multiple highlights within one application won't reset them
    applicationState.highlightedComponents?.forEach((highlightedComponent) => {
      this.highlightingService.hightlightComponentLocallyByTypeAndId(
        applicationObject3D!,
        highlightedComponent
      );
    });
    this.userSettings.applicationSettings.enableMultipleHighlighting.value =
      currentSetting;
    // ----------------------------------------

    this.openApplicationsMap.set(applicationModel.id, applicationObject3D);

    // this.heatmapConf.updateActiveApplication(applicationObject3D);

    applicationObject3D.resetRotation();

    // delete all extern comminication links so we can replace them with the current ones later on
    //applicationObject3D.drawableClassCommSet.clear();
    return applicationObject3D;
  }

  createForceGraph(owner: Owner): ForceGraph {
    this.forceGraph = new ForceGraph(owner, 0.02);
    return this.forceGraph;
  }

  // #region @actions

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    const applicationData = applicationObject3D.data;

    const drawableClassCommunications =
      applicationData.drawableClassCommunications;

    if (drawableClassCommunications) {
      this.appCommRendering.addCommunication(
        applicationObject3D,
        drawableClassCommunications
      );
    }
  }

  @action
  addCommunicationForAllApplications() {
    this.forEachOpenApplication(this.addCommunication);
    this.updateLinks?.();
  }

  @action
  removeCommunicationForAllApplications() {
    this.forEachOpenApplication(this.removeCommunication);
  }

  @action
  updateApplicationObject3DAfterUpdate(
    applicationObject3D: ApplicationObject3D
  ) {
    // Render communication
    if (
      this.localUser.visualizationMode !== 'ar' ||
      this.arSettings.renderCommunication
    ) {
      this.addCommunication(applicationObject3D);
    }

    // Update labels
    Labeler.addApplicationLabels(
      applicationObject3D,
      this.font,
      this.configuration.applicationColors
    );
    // Update links
    this.updateLinks?.();
    // Update highlighting
    this.highlightingService.updateHighlighting(); // needs to be after update links
  }

  updateLinks?: () => void;

  @action
  openAllComponentsOfAllApplications() {
    this.forEachOpenApplication(this.openAllComponents);
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
    this.updateLinks?.();
  }

  /**
   * Highlights a given component or clazz
   *
   * @param entity Component, communication link or clazz which shall be highlighted
   * @param applicationObject3D Application which contains the entity
   */

  @action
  highlight(
    entity: any,
    applicationObject3D: ApplicationObject3D,
    color?: THREE.Color,
    isMultiSelected = false,
    sendMessage = true
  ) {
    if (isEntityMesh(entity)) {
      const oldValue =
        this.configuration.userSettings.applicationSettings
          .enableMultipleHighlighting.value; // TODO: Refactor all this including the call chain
      if (isMultiSelected) {
        this.configuration.userSettings.applicationSettings.enableMultipleHighlighting.value =
          isMultiSelected;
      }

      this.configuration.userSettings.applicationSettings.enableMultipleHighlighting.value =
        oldValue || isMultiSelected;
      this.highlightingService.highlight(entity, sendMessage, color);

      if (isMultiSelected) {
        this.configuration.userSettings.applicationSettings.enableMultipleHighlighting.value =
          oldValue;
      }

      this.updateApplicationObject3DAfterUpdate(applicationObject3D);
    }
  }

  @action
  highlightExternLink(
    mesh: EntityMesh,
    sendMessage: boolean,
    color?: THREE.Color
  ) {
    if (mesh instanceof ClazzCommunicationMesh) {
      this.highlightingService.highlight(mesh, sendMessage, color);
      //this.updateLinks?.();
      this.highlightingService.updateHighlighting();
    }
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

    EntityManipulation.openComponentsByList(
      EntityManipulation.getAllAncestorComponents(entity),
      applicationObject3D
    );

    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  // #endregion @actions

  // #region utility methods

  openAllComponents(applicationObject3D: ApplicationObject3D) {
    this.openAllComponentsLocally(applicationObject3D);
  }

  toggleComponentLocally(
    componentMesh: ComponentMesh | FakeInstanceMesh<Package>,
    applicationObject3D: ApplicationObject3D
  ) {
    EntityManipulation.toggleComponentMeshState(
      componentMesh,
      applicationObject3D,
      this.appSettings.keepHighlightingOnOpenOrClose.value
    );
    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  toggleComponent(
    componentMesh: ComponentMesh | FakeInstanceMesh<Package>,
    applicationObject3D: ApplicationObject3D
  ) {
    this.toggleComponentLocally(componentMesh, applicationObject3D);

    this.sender.sendComponentUpdate(
      applicationObject3D.getModelId(),
      componentMesh.getModelId(),
      componentMesh.opened,
      false
    );

    if (!componentMesh.opened) {
      // let the backend know that the subpackages are closed too
      const subPackages = getSubPackagesOfPackage(componentMesh.dataModel);
      subPackages.forEach((subPackage) => {
        this.sender.sendComponentUpdate(
          applicationObject3D.getModelId(),
          subPackage.id,
          false,
          false,
          false // needed so that the backend doesn't forward this message
        );
      });
    }
  }

  openAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.openAllComponents(applicationObject3D, this.sender);

    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  closeAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.closeAllComponents(
      applicationObject3D,
      this.appSettings.keepHighlightingOnOpenOrClose.value
    );
    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  closeAllComponents(applicationObject3D: ApplicationObject3D) {
    this.closeAllComponentsLocally(applicationObject3D);

    this.sender.sendComponentUpdate(
      applicationObject3D.getModelId(),
      '',
      false,
      true
    );
  }

  updateCommunication() {
    this.getOpenApplications().forEach((application) => {
      const drawableComm = this.getDrawableClassCommunications(application)!;

      if (this.arSettings.renderCommunication) {
        this.appCommRendering.addCommunication(application, drawableComm);
      } else {
        application.removeAllCommunication();
      }
    });
  }

  removeApplicationLocally(application: ApplicationObject3D) {
    application.parent?.remove(application);
    application.removeAllEntities();
    this.openApplicationsMap.delete(application.getModelId());
  }

  removeApplicationLocallyById(applicationId: string) {
    const application = this.getApplicationById(applicationId);
    application && this.removeApplicationLocally(application);
  }

  removeCommunication(application: ApplicationObject3D) {
    if (application.highlightedEntity instanceof ClazzCommunicationMesh) {
      removeAllHighlighting(application);
    }

    application.removeAllCommunication();
  }

  private forEachOpenApplication(
    forEachFunction: (app: ApplicationObject3D) => void
  ) {
    this.getOpenApplications().forEach((application) => {
      forEachFunction.call(this, application);
    });
  }

  restoreFromSerialization(room: SerializedVrRoom) {
    this.forEachOpenApplication(this.removeApplicationLocally);

    this.linkRenderer.getAllLinks().forEach((externLink) => {
      externLink.unhighlight();
      externLink.turnOpaque();
    });

    room.openApps.forEach(async (app) => {
      const applicationData = this.applicationRepo.getById(app.id);
      if (applicationData) {
        this.addApplication(
          applicationData,
          this.roomSerializer.serializeToAddApplicationArgs(app)
        );
      }
    });

    if (room.highlightedExternCommunicationLinks) {
      // Can we delete this? I forgot why I wrote this...
      // room.openApps.forEach((app) => {
      //   const appObj = this.getApplicationById(app.id);
      //   if (appObj) {
      //     appObj.drawableClassCommSet.clear();
      //   }
      // });

      room.highlightedExternCommunicationLinks.forEach((externLink) => {
        const linkMesh = this.linkRenderer.getLinkById(externLink.entityId);
        if (linkMesh) {
          this.highlightExternLink(
            linkMesh,
            false,
            new THREE.Color().fromArray(externLink.color)
          );
          linkMesh.highlight();
        }
      });
    }
    this.highlightingService.updateHighlighting();
  }

  static convertToBoxLayoutMap(layoutedApplication: Map<string, LayoutData>) {
    const boxLayoutMap: Map<string, BoxLayout> = new Map();

    layoutedApplication.forEach((value, key) => {
      const boxLayout = BoxLayout.fromLayoutData(value);
      boxLayoutMap.set(key, boxLayout);
    });

    return boxLayoutMap;
  }

  // #endregion utility methods
}

// #region typescript types
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
  transparentComponents?: Set<string>;
  openComponents?: Set<string>;
  highlightedComponents?: HightlightComponentArgs[];
};
// #endregion typescript types

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'application-renderer': ApplicationRenderer;
  }
}
