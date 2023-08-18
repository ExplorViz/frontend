// #region imports
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import { task } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { restoreComponentState } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import {
  removeAllHighlighting,
  turnComponentAndAncestorsOpaque,
  turnComponentAndAncestorsTransparent,
} from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import ThreeForceGraph from 'three-forcegraph';
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
import { EntityMesh, isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { getSubPackagesOfPackage } from 'explorviz-frontend/utils/package-helpers';
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

  forceGraph!: ThreeForceGraph;

  private structureLandscapeData!: StructureLandscapeData;

  private openApplicationsMap: Map<string, ApplicationObject3D>;

  readonly appCommRendering: CommunicationRendering;

  // #endregion fields

  constructor(properties?: object) {
    super(properties);
    this.openApplicationsMap = new Map();
    this.appCommRendering = new CommunicationRendering(
      this.configuration,
      this.userSettings
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

  getApplicationInCurrentLandscapeById(id: string): Application | undefined {
    return getApplicationInLandscapeById(this.structureLandscapeData, id);
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
    const applicationData = this.applicationRepo.getById(
      applicationObjetc3D.getModelId()
    );
    return applicationData?.drawableClassCommunications;
  }

  getGraphPosition(mesh: THREE.Object3D) {
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    this.forceGraph.worldToLocal(worldPosition);
    return worldPosition;
  }

  getMeshById(meshId: string): BaseMesh | undefined {
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

  addApplicationTask = task(
    async (
      applicationData: ApplicationData,
      addApplicationArgs: AddApplicationArgs = {}
    ) => {
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
          boxLayoutMap
        );
      }

      const applicationState =
        Object.keys(addApplicationArgs).length === 0 && isOpen && layoutChanged
          ? this.roomSerializer.serializeToAddApplicationArgs(
              applicationObject3D
            )
          : addApplicationArgs;

      if (layoutChanged) {
        applicationObject3D.removeAllEntities();
        // Add new meshes to application
        EntityRendering.addFoundationAndChildrenToApplication(
          applicationObject3D,
          this.configuration.applicationColors
        );
      }

      // Restore state of open packages and transparent components (packages and clazzes)
      restoreComponentState(
        applicationObject3D,
        applicationState.openComponents,
        applicationState.transparentComponents,
        this.highlightingService.opacity
      );

      // Add labels to application
      Labeler.addApplicationLabels(
        applicationObject3D,
        this.font,
        this.configuration.applicationColors
      );

      this.addCommunication(applicationObject3D);

      // reset transparency of inner communication links

      applicationObject3D.getCommMeshes().forEach((commMesh) => {
        if (applicationState.transparentComponents?.has(commMesh.getModelId()))
          commMesh.turnTransparent(this.highlightingService.opacity);
      });

      // reset highlights -------------------

      const currentSetting =
        this.userSettings.applicationSettings.allowMultipleSelection.value;
      this.userSettings.applicationSettings.allowMultipleSelection.value = true; // so resetting multiple highlights within one application won't reset them
      applicationState.highlightedComponents?.forEach(
        (highlightedComponent) => {
          this.highlightingService.hightlightComponentLocallyByTypeAndId(
            applicationObject3D!,
            highlightedComponent
          );
        }
      );
      this.userSettings.applicationSettings.allowMultipleSelection.value =
        currentSetting;
      // ----------------------------------------

      this.openApplicationsMap.set(applicationModel.id, applicationObject3D);

      // this.heatmapConf.updateActiveApplication(applicationObject3D);

      applicationObject3D.resetRotation();

      return applicationObject3D;
    }
  );

  // #region @actions

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(
      applicationObject3D.getModelId()
    );
    const drawableClassCommunications =
      applicationData?.drawableClassCommunications;

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
    applicationObject3D: ApplicationObject3D,
    sendMessage: boolean
  ) {
    // Render communication
    if (
      this.localUser.visualizationMode !== 'ar' ||
      this.arSettings.renderCommunication
    ) {
      this.addCommunication(applicationObject3D);
    }
    // Update highlighting
    if (!this.appSettings.keepHighlightingOnOpenOrClose.value) {
      removeAllHighlighting(applicationObject3D);
    }
    // Update labels
    Labeler.addApplicationLabels(
      applicationObject3D,
      this.font,
      this.configuration.applicationColors
    );
    // Update links
    this.updateLinks?.();
    this.highlightingService.updateHighlighting(sendMessage); // needs to be after update links
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
          .allowMultipleSelection.value; // TODO: Refactor all this including the call chain
      if (isMultiSelected) {
        this.configuration.userSettings.applicationSettings.allowMultipleSelection.value =
          isMultiSelected;
      }

      this.configuration.userSettings.applicationSettings.allowMultipleSelection.value =
        oldValue || isMultiSelected;
      this.highlightingService.highlight(entity, sendMessage, color);

      if (isMultiSelected) {
        this.configuration.userSettings.applicationSettings.allowMultipleSelection.value =
          oldValue;
      }

      this.updateApplicationObject3DAfterUpdate(
        applicationObject3D,
        sendMessage
      );
    }
  }

  @action
  highlightExternLink(mesh: EntityMesh, sendMessage: boolean, color?: THREE.Color){
    if(mesh instanceof ClazzCommunicationMesh)
      this.highlightingService.highlight(mesh, sendMessage, color);
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

    this.updateApplicationObject3DAfterUpdate(applicationObject3D, true);
  }

  // #endregion @actions

  // #region utility methods

  openAllComponents(
    applicationObject3D: ApplicationObject3D,
    sendMessage = true
  ) {
    this.openAllComponentsLocally(applicationObject3D, sendMessage);
  }

  toggleComponentLocally(
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D,
    sendMessage: boolean
  ) {
    EntityManipulation.toggleComponentMeshState(
      componentMesh,
      applicationObject3D
    );
    this.updateApplicationObject3DAfterUpdate(applicationObject3D, sendMessage);
  }

  toggleComponent(
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D,
    sendMessage: boolean
  ) {
    this.toggleComponentLocally(
      componentMesh,
      applicationObject3D,
      sendMessage
    );

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

  openAllComponentsLocally(
    applicationObject3D: ApplicationObject3D,
    sendMessage: boolean
  ) {
    EntityManipulation.openAllComponents(applicationObject3D, this.sender);

    this.updateApplicationObject3DAfterUpdate(applicationObject3D, sendMessage);
  }

  closeAllComponentsLocally(
    applicationObject3D: ApplicationObject3D,
    sendMessage: boolean
  ) {
    EntityManipulation.closeAllComponents(applicationObject3D);
    this.updateApplicationObject3DAfterUpdate(applicationObject3D, sendMessage);
    // TODO update highlighting
  }

  closeAllComponents(
    applicationObject3D: ApplicationObject3D,
    sendMessage: boolean
  ) {
    this.closeAllComponentsLocally(applicationObject3D, sendMessage);

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

  forEachOpenApplication(forEachFunction: (app: ApplicationObject3D) => void) {
    this.getOpenApplications().forEach((application) => {
      forEachFunction.call(this, application);
    });
  }

  restoreFromSerialization(room: SerializedVrRoom) {
    this.forEachOpenApplication(this.removeApplicationLocally);

    room.openApps.forEach(async (app) => {
      const applicationData = this.applicationRepo.getById(app.id);
      if (applicationData) {
        await this.addApplicationTask.perform(
          applicationData,
          this.roomSerializer.serializeToAddApplicationArgs(app)
        );


        // TODO: room.transparentExternCommunicationLinks so we can keep the arrows on the pipes transparent after each landscape tick in collaboration mode
        // reset highlighted extern links and implicated opaqueness
        if (room.highlightedExternCommunicationLinks) {
          room.highlightedExternCommunicationLinks.forEach((externLink) => {
            const linkMesh = this.linkRenderer.getLinkById(externLink.entityId);
            if (linkMesh) {
              const targetApp =
                linkMesh.dataModel.drawableClassCommus.firstObject?.targetApp;
              const targetClass =
                linkMesh.dataModel.drawableClassCommus.firstObject?.targetClass;
              const sourceApp =
                linkMesh.dataModel.drawableClassCommus.firstObject?.sourceApp;
              const sourceClass =
                linkMesh.dataModel.drawableClassCommus.firstObject?.sourceClass;

              if (targetApp && targetClass && sourceApp && sourceClass) {
                const target = this.getApplicationById(targetApp.id);
                const source = this.getApplicationById(sourceApp.id);

                target?.getBoxMeshbyModelId(targetClass.id)?.turnOpaque();
                source?.getBoxMeshbyModelId(sourceClass.id)?.turnOpaque();

                // actually the code isn't needed
                // if (target)
                //   turnComponentAndAncestorsOpaque(
                //     targetClass.parent,
                //     target,
                //     new Set(),
                //     //this.highlightingService.opacity
                //   );

                // if (source)
                //   turnComponentAndAncestorsOpaque(
                //     sourceClass.parent,
                //     source,
                //     new Set(),
                //     //this.highlightingService.opacity
                //   );
              }
              this.highlightingService.highlight(
                linkMesh,
                false,
                new THREE.Color().fromArray(externLink.color)
              );
              
            }
          });
        }
      }
    });
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
