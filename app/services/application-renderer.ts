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
import { removeHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import CurrentApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
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

  @service('virtual-reality@vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service('toast-message')
  toastMessage!: ToastMessage;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  forceGraph!: ThreeForceGraph;

  private structureLandscapeData!: StructureLandscapeData;

  private openApplicationsMap: Map<string, CurrentApplicationObject3D>;

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

  getApplicationById(id: string): CurrentApplicationObject3D | undefined {
    return this.openApplicationsMap.get(id);
  }

  getApplicationInCurrentLandscapeById(id: string): Application | undefined {
    return getApplicationInLandscapeById(this.structureLandscapeData, id);
  }

  getDrawableClassCommunications(
    applicationObjetc3D: CurrentApplicationObject3D
  ) {
    const applicationData = this.applicationRepo.getById(
      applicationObjetc3D.getModelId()
    );
    return applicationData?.drawableClassCommunications;
  }

  getOpenApplications(): CurrentApplicationObject3D[] {
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
      let currentApplicationObject3D = this.getApplicationById(
        applicationModel.id
      );

      let layoutChanged = true;
      if (currentApplicationObject3D) {
        layoutChanged =
          boxLayoutMap !== currentApplicationObject3D.boxLayoutMap;

        currentApplicationObject3D.boxLayoutMap = boxLayoutMap;
      } else {
        currentApplicationObject3D = new VrApplicationObject3D(
          applicationData,
          boxLayoutMap
        );
      }

      const applicationState =
        Object.keys(addApplicationArgs).length === 0 && isOpen && layoutChanged
          ? this.roomSerializer.serializeToAddApplicationArgs(
              currentApplicationObject3D
            )
          : addApplicationArgs;

      if (layoutChanged) {
        currentApplicationObject3D.removeAllEntities();

        // Add new meshes to application
        EntityRendering.addFoundationAndChildrenToApplication(
          currentApplicationObject3D,
          this.configuration.applicationColors
        );
      }

      // Restore state of components highlighting
      restoreComponentState(
        currentApplicationObject3D,
        applicationState.openComponents
      );

      // Add labels to application
      Labeler.addApplicationLabels(
        currentApplicationObject3D,
        this.font,
        this.configuration.applicationColors
      );

      this.addCommunication(currentApplicationObject3D);

      applicationState.highlightedComponents?.forEach(
        (highlightedComponent) => {
          this.highlightingService.hightlightComponentLocallyByTypeAndId(
            currentApplicationObject3D!,
            highlightedComponent
          );
        }
      );
      this.highlightingService.updateHighlighting(currentApplicationObject3D);

      this.openApplicationsMap.set(
        applicationModel.id,
        currentApplicationObject3D
      );

      // this.heatmapConf.updateActiveApplication(currentApplicationObject3D);

      currentApplicationObject3D.resetRotation();

      return currentApplicationObject3D;
    }
  );

  // #region @actions

  @action
  addCommunication(currentApplicationObject3D: CurrentApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(
      currentApplicationObject3D.getModelId()
    );
    const drawableClassCommunications =
      applicationData?.drawableClassCommunications;

    if (drawableClassCommunications) {
      this.appCommRendering.addCommunication(
        currentApplicationObject3D,
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
    currentApplicationObject3D: CurrentApplicationObject3D
  ) {
    // Render communication
    if (
      this.localUser.visualizationMode !== 'ar' ||
      this.arSettings.renderCommunication
    ) {
      this.addCommunication(currentApplicationObject3D);
    }
    // Update highlighting
    if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
      this.highlightingService.updateHighlighting(currentApplicationObject3D);
    } else {
      removeHighlighting(currentApplicationObject3D);
    }
    // Update labels
    Labeler.addApplicationLabels(
      currentApplicationObject3D,
      this.font,
      this.configuration.applicationColors
    );
    // Update links
    this.updateLinks?.();
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
   * @param entity Component or clazz which shall be highlighted
   */
  @action
  highlightModel(entity: Package | Class, applicationId: string) {
    const currentApplicationObject3D = this.getApplicationById(applicationId);
    if (!currentApplicationObject3D) {
      return;
    }
    this.highlightingService.highlightModel(entity, currentApplicationObject3D);
  }

  /**
   * Opens all parents / components of a given component or clazz.
   * Adds communication and restores highlighting.
   *
   * @param entity Component or Clazz of which the mesh parents shall be opened
   */
  @action
  openParents(entity: Package | Class, applicationId: string) {
    const currentApplicationObject3D = this.getApplicationById(applicationId);
    if (!currentApplicationObject3D) {
      return;
    }

    EntityManipulation.openComponentsByList(
      EntityManipulation.getAllAncestorComponents(entity),
      currentApplicationObject3D
    );

    this.updateApplicationObject3DAfterUpdate(currentApplicationObject3D);
  }

  // #endregion @actions

  // #region utility methods

  openAllComponents(currentApplicationObject3D: CurrentApplicationObject3D) {
    this.openAllComponentsLocally(currentApplicationObject3D);
    this.sender.sendComponentUpdate(
      currentApplicationObject3D.getModelId(),
      '',
      true,
      true
    );
  }

  toggleComponentLocally(
    componentMesh: ComponentMesh,
    currentApplicationObject3D: CurrentApplicationObject3D
  ) {
    EntityManipulation.toggleComponentMeshState(
      componentMesh,
      currentApplicationObject3D
    );
    this.updateApplicationObject3DAfterUpdate(currentApplicationObject3D);
  }

  toggleComponent(
    componentMesh: ComponentMesh,
    currentApplicationObject3D: CurrentApplicationObject3D
  ) {
    this.toggleComponentLocally(componentMesh, currentApplicationObject3D);
    this.sender.sendComponentUpdate(
      currentApplicationObject3D.getModelId(),
      componentMesh.getModelId(),
      componentMesh.opened,
      false
    );
  }

  openAllComponentsLocally(
    currentApplicationObject3D: CurrentApplicationObject3D
  ) {
    EntityManipulation.openAllComponents(currentApplicationObject3D);

    this.updateApplicationObject3DAfterUpdate(currentApplicationObject3D);
  }

  closeAllComponentsLocally(
    currentApplicationObject3D: CurrentApplicationObject3D
  ) {
    EntityManipulation.closeAllComponents(currentApplicationObject3D);

    this.updateApplicationObject3DAfterUpdate(currentApplicationObject3D);
  }

  closeAllComponents(currentApplicationObject3D: CurrentApplicationObject3D) {
    this.closeAllComponentsLocally(currentApplicationObject3D);
    this.sender.sendComponentUpdate(
      currentApplicationObject3D.getModelId(),
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

  removeApplicationLocally(application: CurrentApplicationObject3D) {
    application.parent?.remove(application);
    application.removeAllEntities();
    this.openApplicationsMap.delete(application.getModelId());
  }

  removeApplicationLocallyById(applicationId: string) {
    const application = this.getApplicationById(applicationId);
    application && this.removeApplicationLocally(application);
  }

  removeCommunication(application: CurrentApplicationObject3D) {
    if (application.highlightedEntity instanceof ClazzCommunicationMesh) {
      removeHighlighting(application);
    }

    application.removeAllCommunication();
  }

  forEachOpenApplication(
    forEachFunction: (app: CurrentApplicationObject3D) => void
  ) {
    this.getOpenApplications().forEach((application) => {
      forEachFunction(application);
    });
  }

  restoreFromSerialization(room: SerializedVrRoom) {
    this.forEachOpenApplication(this.removeApplicationLocally);

    room.openApps.forEach((app) => {
      const applicationData = this.applicationRepo.getById(app.id);
      if (applicationData) {
        this.addApplicationTask.perform(
          applicationData,
          this.roomSerializer.serializeToAddApplicationArgs(app)
        );
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
