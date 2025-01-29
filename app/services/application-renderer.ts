// #region Imports
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import { task } from 'ember-concurrency';
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
  Class,
  getApplicationsFromNodes,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import * as THREE from 'three';
import ArSettings from 'explorviz-frontend/services/extended-reality/ar-settings';
import VrApplicationObject3D from 'explorviz-frontend/utils/extended-reality/view-objects/application/vr-application-object-3d';
import Configuration from './configuration';
import LinkRenderer from './link-renderer';
import ApplicationRepository from './repos/application-repository';
import FontRepository from './repos/font-repository';
import UserSettings from './user-settings';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { getSubPackagesOfPackage } from 'explorviz-frontend/utils/package-helpers';
import HighlightingService from './highlighting-service';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import RoomSerializer from 'explorviz-frontend/services/collaboration/room-serializer';
import { SerializedRoom } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/serialized-room';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/utils/extended-reality/vr-helpers/detail-info-composer';
import SceneRepository from './repos/scene-repository';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import EvolutionDataRepository from './repos/evolution-data-repository';
import { CommitComparison } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';
import { MeshLineMaterial } from 'meshline';
import { FlatDataModelBasicInfo } from 'explorviz-frontend/utils/flat-data-schemes/flat-data';
import TextureService from './texture-service';
import SemanticZoomManager from 'explorviz-frontend/view-objects/3d/application/utils/semantic-zoom-manager';
import { ImmersiveView } from 'explorviz-frontend/rendering/application/immersive-view';
import layoutLandscape from 'explorviz-frontend/utils/elk-layouter';
import Landscape3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-3d';
// #endregion imports

export default class ApplicationRenderer extends Service.extend() {
  // #region Services

  @service('repos/evolution-data-repository')
  private evolutionDataRepository!: EvolutionDataRepository;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('configuration')
  private configuration!: Configuration;

  @service('extended-reality/ar-settings')
  private arSettings!: ArSettings;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  @service('repos/font-repository')
  private fontRepo!: FontRepository;

  @service('collaboration/room-serializer')
  private roomSerializer!: RoomSerializer;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('texture-service')
  private textureService!: TextureService;

  // #endregion

  //#region Fields

  private _landscape3D!: Landscape3D;

  private _openApplicationsMap: Map<string, ApplicationObject3D>;

  private _appCommRendering: CommunicationRendering;

  // #endregion

  constructor(properties?: object) {
    super(properties);
    this._openApplicationsMap = new Map();
    this._appCommRendering = new CommunicationRendering(
      this.configuration,
      this.userSettings,
      this.localUser
    );
    try {
      SemanticZoomManager.instance.configuration = this.configuration;
      SemanticZoomManager.instance.userSettings = this.userSettings;
      SemanticZoomManager.instance.localUser = this.localUser;
      SemanticZoomManager.instance.appCommRendering = this._appCommRendering;
      SemanticZoomManager.instance.font = this.font;
      ImmersiveView.instance.font = this.font;
    } catch (error) {
      console.error(
        'Semantic Zoom Manger did not get any Settings by the Service Renderer. Zoom features are limited: {$error}'
      );
    }

    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(geometry, material);
    // this.sceneRepo.getScene().add(cube);
  }

  // #region Get / Set

  get landscape3D() {
    return this._landscape3D;
  }

  set landscape3D(newLandscape3D: Landscape3D) {
    this._landscape3D = newLandscape3D;
  }

  get appSettings() {
    return this.userSettings.visualizationSettings;
  }

  get font() {
    return this.fontRepo.font;
  }

  get openApplications() {
    return Array.from(this._openApplicationsMap.values());
  }

  get openApplicationIds() {
    return Array.from(this._openApplicationsMap.keys());
  }

  getApplicationById(id: string): ApplicationObject3D | undefined {
    return this._openApplicationsMap.get(id);
  }

  getBoxMeshByModelId(id: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getBoxMeshByModelId(id);
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

  getPositionInLandscape(mesh: THREE.Object3D) {
    const landscapePosition = new THREE.Vector3();
    mesh.getWorldPosition(landscapePosition);
    this._landscape3D.worldToLocal(landscapePosition);
    return landscapePosition;
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
    return Array.from(this._openApplicationsMap.values());
  }

  isApplicationOpen(id: string): boolean {
    return this._openApplicationsMap.has(id);
  }

  // #endregion getters

  addApplicationTask = task(
    async (
      applicationData: ApplicationData,
      addApplicationArgs: AddApplicationArgs = {}
    ) => {
      const applicationModel = applicationData.application;
      const boxLayoutMap = applicationData.boxLayoutMap;
      const isOpen = this.isApplicationOpen(applicationModel.id);
      let app3D = this.getApplicationById(applicationModel.id);

      if (!app3D) {
        app3D = new VrApplicationObject3D(applicationData);
        this._openApplicationsMap.set(applicationModel.id, app3D);
      }

      // Check if new classes have been discovered
      const oldClassCount = app3D.getClassMeshes().length;
      const newClassCount = applicationData.getClassCount();
      const hasStructureChanged = oldClassCount !== newClassCount;

      const applicationState =
        Object.keys(addApplicationArgs).length === 0 &&
        isOpen &&
        hasStructureChanged
          ? this.roomSerializer.serializeToAddApplicationArgs(app3D)
          : addApplicationArgs;

      // Set layout properties
      const appLayout = boxLayoutMap.get(applicationData.getId());
      if (appLayout) {
        app3D.position.copy(appLayout.position);
      }

      if (hasStructureChanged) {
        app3D.removeAll();

        // Add new meshes to application
        EntityRendering.addFoundationAndChildrenToApplication(
          app3D,
          this.userSettings.colors,
          this.font
        );

        // Restore state of open packages and transparent components (packages and classes)
        EntityManipulation.restoreComponentState(
          app3D,
          applicationState.openComponents,
          applicationState.transparentComponents,
          this.highlightingService.opacity
        );

        // Add labels to application
        Labeler.addApplicationLabels(
          app3D,
          this.font,
          this.userSettings.colors
        );
      } else {
        // Layout may have been changed in settings
        app3D.updateLayout();
      }

      this.addCommunication(app3D);

      // reset transparency of inner communication links
      app3D.getCommMeshes().forEach((commMesh) => {
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

      // Reset highlights -------------------

      const currentSetting =
        this.userSettings.visualizationSettings.enableMultipleHighlighting
          .value;
      this.userSettings.visualizationSettings.enableMultipleHighlighting.value =
        true; // so resetting multiple highlights within one application won't reset them
      applicationState.highlightedComponents?.forEach(
        (highlightedComponent) => {
          this.highlightingService.toggleHighlightById(
            highlightedComponent.entityId,
            highlightedComponent.color
          );
        }
      );
      this.userSettings.visualizationSettings.enableMultipleHighlighting.value =
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
          commitComparison
        );
      } else {
        // remove existing comparison visualizations
        this.removeCommitComparisonVisualization(applicationData);
      }

      return app3D;
    }
  );

  // #region @actions

  @action
  updateLabel(entityId: string, label: string) {
    const appId = this.getApplicationIdByMeshId(entityId);
    const applicationObject3D = this.getApplicationById(appId!);

    const boxMesh = applicationObject3D!.getBoxMeshByModelId(entityId) as
      | ComponentMesh
      | FoundationMesh;

    const { componentTextColor, foundationTextColor } =
      this.userSettings.colors;

    if (boxMesh instanceof ComponentMesh) {
      Labeler.updateBoxTextLabel(boxMesh, this.font, componentTextColor, label);
    } else if (boxMesh instanceof FoundationMesh) {
      Labeler.updateBoxTextLabel(
        boxMesh,
        this.font,
        foundationTextColor,
        label
      );
    }

    this.updateApplicationObject3DAfterUpdate(applicationObject3D!);
  }

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    this._appCommRendering.addCommunication(
      applicationObject3D,
      this.userSettings.visualizationSettings
    );
  }

  @action
  addCommunicationForAllApplications() {
    this.forEachOpenApplication(this.addCommunication);
    this.linkRenderer.updateLinkPositions();
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
      this.userSettings.colors
    );
    // Update links
    this.linkRenderer.updateLinkPositions();
    // Update highlighting
    this.highlightingService.updateHighlighting(); // needs to be after update links
  }

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
    this.linkRenderer.updateLinkPositions();
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

  // #region Utility

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
        this._appCommRendering.addCommunication(
          application,
          this.userSettings.visualizationSettings
        );
      } else {
        application.removeAllCommunication();
      }
    });
  }

  removeApplicationLocally(application: ApplicationObject3D) {
    application.parent?.remove(application);
    application.removeAll();
    this._openApplicationsMap.delete(application.getModelId());
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

  async updateApplicationLayout() {
    const boxLayoutMap = await layoutLandscape(
      this.landscape3D.dataModel.structure.k8sNodes,
      getApplicationsFromNodes(this.landscape3D.dataModel.structure.nodes)
    );

    this.landscape3D.layoutLandscape(boxLayoutMap);

    // Update communication since position of classes may have changed
    this.addCommunicationForAllApplications();
  }

  // #endregion

  //#region Priv. Helper

  private visualizeCommitComparisonPackagesAndClasses(
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) {
    this.visualizeAddedPackagesAndClasses(applicationData, commitComparison);
    this.visualizeDeletedPackagesAndClasses(applicationData, commitComparison);
    this.visualizeModifiedPackagesAndClasses(applicationData, commitComparison);
  }

  private getFlatDataModelForBestFqnMatch(
    applicationData: ApplicationData,
    fqFileName: string
  ): FlatDataModelBasicInfo | null {
    const fqnToModelMap = applicationData.flatData.fqnToModelMap;

    // replace all occurences of / with .
    // (change in code service in the future)
    const fqFileNameDotDelimiter = fqFileName.replace(/\//g, '.');

    let longestKeyMatch = null;
    let flatDataModelBasicInfo: FlatDataModelBasicInfo | null = null;

    for (const [fqn, modelObj] of fqnToModelMap.entries()) {
      if (fqFileNameDotDelimiter.includes(fqn)) {
        if (!longestKeyMatch || fqn.length > longestKeyMatch.length) {
          longestKeyMatch = fqn;
          flatDataModelBasicInfo = modelObj;
        }
      }
    }
    return flatDataModelBasicInfo;
  }

  private visualizeAddedPackagesAndClasses(
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) {
    commitComparison.added.forEach((fqFileName, index) => {
      const addedPackages = commitComparison.addedPackages[index];

      const flatDataModel = this.getFlatDataModelForBestFqnMatch(
        applicationData,
        fqFileName
      );

      const id = flatDataModel?.modelId;

      if (id) {
        // Mark the class as added
        this.textureService.applyAddedTextureToMesh(this.getMeshById(id));

        if (addedPackages) {
          const clazz = flatDataModel.model as Class;
          let packageNode: Package | undefined = clazz?.parent;
          const addedPackageNames = addedPackages.split('.');
          const firstAddedPackageName = addedPackageNames[0];

          // Traverse up the package hierarchy and mark packages as added
          while (packageNode && packageNode.name !== firstAddedPackageName) {
            this.textureService.applyAddedTextureToMesh(
              this.getMeshById(packageNode.id)
            );
            packageNode = packageNode.parent;
          }

          // Mark the first added package
          if (packageNode) {
            this.textureService.applyAddedTextureToMesh(
              this.getMeshById(packageNode.id)
            );
          }
        }
      }
    });
  }

  private visualizeDeletedPackagesAndClasses(
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) {
    commitComparison.deleted.forEach((fqFileName, index) => {
      const deletedPackages = commitComparison.deletedPackages[index];

      const flatDataModel = this.getFlatDataModelForBestFqnMatch(
        applicationData,
        fqFileName
      );

      const id = flatDataModel?.modelId;

      if (id) {
        // Mark the class as deleted
        this.textureService.applyDeletedTextureToMesh(this.getMeshById(id));

        if (deletedPackages) {
          const clazz = flatDataModel.model as Class;
          let packageNode: Package | undefined = clazz?.parent;
          const deletedPackageNames = deletedPackages.split('.');
          const firstDeletedPackageName = deletedPackageNames[0];

          // Traverse up the package hierarchy and mark packages as deleted
          while (packageNode && packageNode.name !== firstDeletedPackageName) {
            this.textureService.applyDeletedTextureToMesh(
              this.getMeshById(packageNode.id)
            );
            packageNode = packageNode.parent;
          }

          // Mark the first deleted package
          if (packageNode) {
            this.textureService.applyDeletedTextureToMesh(
              this.getMeshById(packageNode.id)
            );
          }
        }
      }
    });
  }

  private visualizeModifiedPackagesAndClasses(
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) {
    // only mark classes as modified. Why? Because if we decided to apply the added/deleted package visualization, we would
    // have to mark every parent package as modified. The design choice is to not do that as it seems overloaded

    for (const fqFileName of commitComparison.modified) {
      const id = this.getFlatDataModelForBestFqnMatch(
        applicationData,
        fqFileName
      )?.modelId;

      if (id) {
        this.textureService.applyModifiedTextureToMesh(this.getMeshById(id));
      }
    }
  }

  private removeCommitComparisonVisualization(
    applicationData: ApplicationData
  ) {
    const packages = getAllPackagesInApplication(applicationData.application);
    const classes = getAllClassesInApplication(applicationData.application);
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
  //#endregion

  //#region Cleanup

  cleanup() {
    this.forEachOpenApplication(this.removeApplicationLocally);
    this._openApplicationsMap.clear();
  }

  //#endregion
}

// #region Type Def.
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
