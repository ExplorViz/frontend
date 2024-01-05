// #region imports
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import { task } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import {
  HightlightComponentArgs,
  removeAllHighlightingFor,
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
import LinkRenderer from './link-renderer';
import ApplicationRepository from './repos/application-repository';
import FontRepository from './repos/font-repository';
import ToastMessage from './toast-message';
import UserSettings from './user-settings';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import {
  EntityMesh,
  isEntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { getSubPackagesOfPackage } from 'explorviz-frontend/utils/package-helpers';
import HighlightingService from './highlighting-service';
import { RenderMode, SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import Evented from '@ember/object/evented';
// #endregion imports

export default class ApplicationRenderer extends Service.extend(Evented) {
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

  private staticStructure?: StructureLandscapeData;
  private dynamicStructure?: StructureLandscapeData;
  private renderMode?: RenderMode;

  private openApplicationsMap: Map<string, ApplicationObject3D>;

  readonly appCommRendering: CommunicationRendering;

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

  getClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(
      applicationObjetc3D.getModelId()
    );
    return applicationData?.classCommunications || [];
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
      addApplicationArgs: AddApplicationArgs = {},
      selectedApplication?: string,
      selectedCommits?: Map<string, SelectedCommit[]>,
      staticStructure?: StructureLandscapeData,
      dynamicStructure?: StructureLandscapeData,
      previousRenderMode?: RenderMode,
      renderMode?: RenderMode 
    ) => {

      console.log("previous: ", previousRenderMode);
      console.log("now: ", renderMode);

      const applicationModel = applicationData.application;
      const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(
        applicationData.layoutData
      );

      const isOpen = this.isApplicationOpen(applicationModel.id);
      let applicationObject3D = this.getApplicationById(applicationModel.id);
      console.log("ApplicationModel Id: ", applicationModel.id);

      let layoutChanged = true;
      if (applicationObject3D) { 
        // Maps cannot be compared directly. Thus, we compare their size.
        layoutChanged =
          boxLayoutMap.size !== applicationObject3D.boxLayoutMap.size;

        applicationObject3D.boxLayoutMap = boxLayoutMap;
      } else {
        applicationObject3D = new VrApplicationObject3D(
          applicationData,
          boxLayoutMap
        );
        this.openApplicationsMap.set(applicationModel.id, applicationObject3D);
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
          this.userSettings.applicationColors
        );

        // Restore state of open packages and transparent components (packages and clazzes)
        EntityManipulation.restoreComponentState(
          applicationObject3D,
          applicationState.openComponents,
          applicationState.transparentComponents,
          this.highlightingService.opacity
        );

        // Add labels to application
        Labeler.addApplicationLabels(
          applicationObject3D,
          this.font,
          this.userSettings.applicationColors
        );
      }

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
      applicationState.highlightedComponents?.forEach(
        (highlightedComponent) => {
          this.highlightingService.highlightById(
            highlightedComponent.entityId,
            highlightedComponent.color
          );
        }
      );
      this.userSettings.applicationSettings.enableMultipleHighlighting.value =
        currentSetting;
      // ----------------------------------------

      // this.heatmapConf.updateActiveApplication(applicationObject3D);

      // commit comparison visualization
      if(selectedApplication && applicationObject3D.data.application.name === selectedApplication && selectedCommits?.get(selectedApplication)?.length == 2){
        this.visualizeCommitComparison(applicationObject3D, selectedCommits);
      }else if(selectedApplication && selectedCommits?.get(selectedApplication)?.length == 1){
        // remove existing comparison visualizations
        this.removeCommitComparisonVisualization(applicationObject3D);
      }

      applicationObject3D.resetRotation();



      if(previousRenderMode === undefined || previousRenderMode === RenderMode.STATIC_DYNAMIC){
        switch(renderMode){
          case RenderMode.STATIC_ONLY:
            this.hideVisualization(applicationObject3D, dynamicStructure);
            break;
          case RenderMode.DYNAMIC_ONLY:
            this.hideVisualization(applicationObject3D, staticStructure);
        }
      }else {
        switch(previousRenderMode){
          case RenderMode.DYNAMIC_ONLY:
            this.showVisualization(applicationObject3D, staticStructure)
            break;
          case RenderMode.STATIC_ONLY:
            this.showVisualization(applicationObject3D, dynamicStructure);
            break;
        }
      }


      return applicationObject3D;
    }
  );


  private visualizeCommitComparison(applicationObject3D: ApplicationObject3D, selectedCommits: Map<string, SelectedCommit[]>){
    //console.log("VISUALIZATION CommitComparison!");
  }


  private removeCommitComparisonVisualization(applicationObject3D: ApplicationObject3D){
    //console.log("VISUALIZATION CommitComparison REMOVE!");
  }

  // hideDynamicVisualization(dynamicStructure?: StructureLandscapeData) {
  //   console.log("hide dynamic visualization ", dynamicStructure);
  //   dynamicStructure?.nodes?.forEach(node => {
  //     node.applications.forEach(app => {
  //       const appObj = this.getApplicationById(app.id);
  //       appObj?.hideMeshes();
  //     });
  //   });
  // }

  // showDynamicVisualization(dynamicStructure?: StructureLandscapeData) {
  //   console.log("show dynamic visualization ", dynamicStructure);
  //   dynamicStructure?.nodes?.forEach(node => {
  //     node.applications.forEach(app => {
  //       const appObj = this.getApplicationById(app.id);
  //       appObj?.showMeshes();
  //     });
  //   });
  // }

  // hideStaticVisualization(staticStructure?: StructureLandscapeData) {
  //   console.log("hide static visualization ", staticStructure);
  //   staticStructure?.nodes?.forEach(node => {
  //     node.applications.forEach(app => {
  //       const appObj = this.getApplicationById(app.id);
  //       appObj?.hideMeshes();
  //     });
  //   });
  // }

  // showStaticVisualization(staticStructure?: StructureLandscapeData) {
  //   console.log("show static visualization ", staticStructure);
  //   staticStructure?.nodes?.forEach(node => {
  //     node.applications.forEach(app => {
  //       const appObj = this.getApplicationById(app.id);
  //       appObj?.showMeshes();
  //     });
  //   });
  // }



  private hideVisualization(applicationObject3D: ApplicationObject3D, structure?: StructureLandscapeData) {
    structure?.nodes.forEach(node => {
      const app = node.applications.find(a => a.id === applicationObject3D.data.application.id);
      if(app) {
        applicationObject3D.hideMeshes();
        applicationObject3D.getCommMeshes().forEach((commMesh) => {
          commMesh.hide();
        });
        this.linkRenderer.getAllLinks().forEach(externPipe => {
          if(externPipe.dataModel.communication.sourceApp.id === applicationObject3D.data.application.id
            || 
            externPipe.dataModel.communication.targetApp.id === applicationObject3D.data.application.id) {
              externPipe.hide();
            }
        });
      }
    });
  }

  private showVisualization(applicationObject3D: ApplicationObject3D, structure?: StructureLandscapeData) {
    structure?.nodes.forEach(node => {
      const app = node.applications.find(a => a.id === applicationObject3D.data.application.id);
      if(app) {
        applicationObject3D.showMeshes();
        applicationObject3D.getCommMeshes().forEach((commMesh) => {
          commMesh.show();
        });
        this.linkRenderer.getAllLinks().forEach(externPipe => {
          if(externPipe.dataModel.communication.sourceApp.id === applicationObject3D.data.application.id
            || 
            externPipe.dataModel.communication.targetApp.id === applicationObject3D.data.application.id) {
              externPipe.show();
            }
        });
      }
    });
  }

  /**
   * Triggers the 'renderSettingChanged' event for updating the landscape
   * @method renderSettingChanged
   */
  renderSettingChanged(renderMode: RenderMode) {
    this.trigger('renderSettingChanged', renderMode);
  }




  // #region @actions

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    this.appCommRendering.addCommunication(applicationObject3D);
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
      this.userSettings.applicationColors
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
    sendMessage = true
  ) {
    if (isEntityMesh(entity)) {
      this.highlightingService.highlight(entity, sendMessage, color);

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
    componentMesh: ComponentMesh,
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
    componentMesh: ComponentMesh,
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
      if (this.arSettings.renderCommunication) {
        this.appCommRendering.addCommunication(application);
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
      removeAllHighlightingFor(application);
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

    this.linkRenderer.getAllLinks().forEach((externLink) => {
      externLink.unhighlight();
      externLink.turnOpaque();
    });

    room.openApps.forEach(async (app) => {
      const applicationData = this.applicationRepo.getById(app.id);
      if (applicationData) {
        await this.addApplicationTask.perform(
          applicationData,
          this.roomSerializer.serializeToAddApplicationArgs(app)
        );
      }
    });

    if (room.highlightedExternCommunicationLinks) {
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

  cleanup() {
    this.openApplicationsMap.clear();
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
