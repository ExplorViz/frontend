// #region imports
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaboration/services/local-user';
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
import ArSettings from 'extended-reality/services/ar-settings';
import VrApplicationObject3D from 'extended-reality/utils/view-objects/application/vr-application-object-3d';
import Configuration from './configuration';
import LinkRenderer from './link-renderer';
import ApplicationRepository from './repos/application-repository';
import FontRepository from './repos/font-repository';
import UserSettings from './user-settings';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { getSubPackagesOfPackage } from 'explorviz-frontend/utils/package-helpers';
import HighlightingService from './highlighting-service';
import MessageSender from 'collaboration/services/message-sender';
import RoomSerializer from 'collaboration/services/room-serializer';
import { SerializedRoom } from 'collaboration/utils/web-socket-messages/types/serialized-room';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import Texturer from 'explorviz-frontend/utils/application-rendering/texturer';
import EvolutionDataRepository from './repos/evolution-data-repository';
import { CommitComparison } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { getClassInApplicationById } from 'explorviz-frontend/utils/restructure-helper';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';
// #endregion imports

export default class ApplicationRenderer extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  // #region fields

  debug = debugLogger('ApplicationRendering');

  @service('repos/evolution-data-repository')
  evolutionDataRepository!: EvolutionDataRepository;

  @service('local-user')
  localUser!: LocalUser;

  @service('configuration')
  configuration!: Configuration;

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('message-sender')
  private sender!: MessageSender;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('repos/font-repository')
  fontRepo!: FontRepository;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  forceGraph!: ThreeForceGraph;

  private structureLandscapeData!: StructureLandscapeData;

  private openApplicationsMap: Map<string, ApplicationObject3D>;

  private texturer: Texturer = new Texturer();

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
          this.highlightingService.toggleHighlightById(
            highlightedComponent.entityId,
            highlightedComponent.color
          );
        }
      );
      this.userSettings.applicationSettings.enableMultipleHighlighting.value =
        currentSetting;
      // ----------------------------------------

      // this.heatmapConf.updateActiveApplication(applicationObject3D);

      const commitComparison =
        this.evolutionDataRepository.getCommitComparisonByAppName(
          applicationModel.name
        );

      if (commitComparison) {
        this.visualizeCommitComparisonPackagesAndClasses(
          applicationData,
          applicationObject3D,
          commitComparison
        );
      } else {
        // remove existing comparison visualizations
        this.removeCommitComparisonVisualization(applicationObject3D);
      }

      applicationObject3D.resetRotation();

      return applicationObject3D;
    }
  );

  // #region @actions

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    this.appCommRendering.addCommunication(
      applicationObject3D,
      this.userSettings.applicationSettings
    );
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
   * Opens all parents / components of a given component or clazz.
   * Adds communication and restores highlighting.
   *
   * @param entity Component or Clazz of which the mesh parents shall be opened
   */
  @action
  openParents(entity: Package | Class | EntityMesh, applicationId: string) {
    let entityModel = entity;

    if (!entity) {
      return;
    }

    // do not re-calculate if mesh is already visible
    if (isEntityMesh(entityModel)) {
      if (entityModel.visible) {
        return;
      } else {
        entityModel = (entity as EntityMesh).dataModel as Package | Class;
      }
    }

    const applicationObject3D = this.getApplicationById(applicationId);
    if (!applicationObject3D) {
      return;
    }

    EntityManipulation.openComponentsByList(
      EntityManipulation.getAllAncestorComponents(entityModel),
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
        this.appCommRendering.addCommunication(
          application,
          this.userSettings.applicationSettings
        );
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

  restoreFromSerialization(room: SerializedRoom) {
    this.cleanup();

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
          this.highlightingService.highlight(linkMesh, {
            sendMessage: false,
            remoteColor: new THREE.Color().fromArray(externLink.color),
          });
        }
      });
    }
    this.highlightingService.updateHighlighting();
  }

  private visualizeCommitComparisonPackagesAndClasses(
    applicationData: ApplicationData,
    applicationObject3D: ApplicationObject3D,
    commitComparison: CommitComparison
  ) {
    this.visualizeAddedPackagesAndClasses(
      applicationData,
      applicationObject3D,
      commitComparison
    );
    this.visualizeDeletedPackagesAndClasses(
      applicationData,
      applicationObject3D,
      commitComparison
    );
    this.visualizeModifiedPackagesAndClasses(applicationData, commitComparison);
  }

  private findModelIdForLongestFqnMatch(
    applicationData: ApplicationData,
    fqFileName: string
  ) {
    const fqnToModelMap = applicationData.flatData.fqnToModelMap;

    // replace all occurences of / with .
    // (change in code service in the future)
    const fqFileNameDotDelimeter = fqFileName.replace(/\//g, '.');

    let longestKeyMatch = null;
    let id = null;

    for (const [fqn, modelObj] of fqnToModelMap.entries()) {
      if (fqFileNameDotDelimeter.includes(fqn)) {
        if (!longestKeyMatch || fqn.length > longestKeyMatch.length) {
          longestKeyMatch = fqn;
          id = modelObj.modelId;
        }
      }
    }
    return id;
  }

  private visualizeAddedPackagesAndClasses(
    applicationData: ApplicationData,
    applicationObject3D: ApplicationObject3D,
    commitComparison: CommitComparison
  ) {
    let indexAdded = 0;

    for (const fqFileName of commitComparison.added) {
      const addedPackages = commitComparison.addedPackages[indexAdded];

      const id = this.findModelIdForLongestFqnMatch(
        applicationData,
        fqFileName
      );

      if (id) {
        this.texturer.markAsAddedById(this.getMeshById(id));

        if (addedPackages !== '') {
          const clazz = getClassInApplicationById(
            applicationObject3D.data.application,
            id
          );
          let pckg: Package | undefined = clazz?.parent;
          const addedPackagesSplit = addedPackages.split('.');
          const firstAddedPackageName = addedPackagesSplit[0];
          while (pckg && pckg.name !== firstAddedPackageName) {
            this.texturer.markAsAddedById(this.getMeshById(pckg.id));
            pckg = pckg.parent;
          }
          if (pckg) {
            this.texturer.markAsAddedById(this.getMeshById(pckg.id));
          }
        }
      }
      indexAdded++;
    }
  }

  private visualizeDeletedPackagesAndClasses(
    applicationData: ApplicationData,
    applicationObject3D: ApplicationObject3D,
    commitComparison: CommitComparison
  ) {
    let indexDeleted = 0;
    for (const fqFileName of commitComparison.deleted) {
      const id = this.findModelIdForLongestFqnMatch(
        applicationData,
        fqFileName
      );

      const deletedPackages = commitComparison.deletedPackages[indexDeleted];

      if (id) {
        this.texturer.markAsDeletedById(this.getMeshById(id));
        if (deletedPackages !== '') {
          const clazz = getClassInApplicationById(
            applicationObject3D.data.application,
            id
          );
          let pckg: Package | undefined = clazz?.parent;
          const deletedPackagesSplit = deletedPackages.split('.');
          const firstDeletedPackageName = deletedPackagesSplit[0];
          while (pckg && pckg.name !== firstDeletedPackageName) {
            this.texturer.markAsDeletedById(this.getMeshById(pckg.id));
            pckg = pckg.parent;
          }
          if (pckg) {
            this.texturer.markAsDeletedById(this.getMeshById(pckg.id));
          }
        }
      }
      indexDeleted++;
    }
  }

  private visualizeModifiedPackagesAndClasses(
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) {
    // only mark classes as modified. Why? Because if we decided to apply the added/deleted package visualization, we would
    // have to mark every parent package as modified. The design choice is to not do that as it seems overloaded

    for (const fqFileName of commitComparison.modified) {
      const id = this.findModelIdForLongestFqnMatch(
        applicationData,
        fqFileName
      );

      if (id) {
        this.texturer.markAsModifiedById(this.getMeshById(id));
      }
    }
  }

  private removeCommitComparisonVisualization(
    applicationObject3D: ApplicationObject3D
  ) {
    const packages = getAllPackagesInApplication(
      applicationObject3D.data.application
    );
    const classes = getAllClassesInApplication(
      applicationObject3D.data.application
    );
    packages.forEach((pckg) => {
      const mesh = this.getBoxMeshByModelId(pckg.id);
      if (
        mesh &&
        (mesh.material instanceof THREE.MeshBasicMaterial ||
          mesh.material instanceof THREE.MeshLambertMaterial ||
          mesh.material instanceof MeshLineMaterial)
      ) {
        mesh.material.map = null;
      }
    });
    classes.forEach((clazz) => {
      const mesh = this.getBoxMeshByModelId(clazz.id);
      if (
        mesh &&
        (mesh.material instanceof THREE.MeshBasicMaterial ||
          mesh.material instanceof THREE.MeshLambertMaterial ||
          mesh.material instanceof MeshLineMaterial)
      ) {
        mesh.material.map = null;
      }
    });
  }

  cleanup() {
    this.forEachOpenApplication(this.removeApplicationLocally);
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
