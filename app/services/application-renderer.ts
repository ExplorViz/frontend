import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { enqueueTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { restoreComponentState } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import { highlight, highlightModel, removeHighlighting, updateHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
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
import VrAssetRepository from 'virtual-reality/services/vr-asset-repo';
import VrHighlightingService, { HightlightComponentArgs } from 'virtual-reality/services/vr-highlighting';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import WebSocketService from 'virtual-reality/services/web-socket';
import VrApplicationObject3D from 'virtual-reality/utils/view-objects/application/vr-application-object-3d';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import { isObjectClosedResponse, ObjectClosedResponse } from 'virtual-reality/utils/vr-message/receivable/response/object-closed';
import { SerializedVrRoom, SerialzedApp } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import Configuration from './configuration';
import ApplicationRepository, { ApplicationData } from './repos/application-repository';
import FontRepository from './repos/font-repository';
import UserSettings from './user-settings';

const APPLICATION_SCALAR = 0.01;

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

export default class ApplicationRenderer extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  debug = debugLogger('ApplicationRendering');

  @service('configuration')
  configuration!: Configuration;

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('vr-asset-repo')
  private assetRepo!: VrAssetRepository;

  @service('vr-highlighting')
  private highlightingService!: VrHighlightingService;

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

  private structureLandscapeData!: StructureLandscapeData;

  private openApplications: Map<string, ApplicationObject3D>;

  readonly applicationMarkers: THREE.Group[] = [];

  readonly appCommRendering: CommunicationRendering;

  updatables: any[] = [];

  arMode: boolean = false;

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  get font() {
    return this.fontRepo.font;
  }

  constructor(properties?: object) {
    super(properties);
    this.openApplications = new Map();
    this.appCommRendering = new CommunicationRendering(this.configuration,
      this.userSettings);

    for (let i = 0; i < 5; i++) {
      if (this.applicationMarkers.length <= i) {
        const applicationMarker = new THREE.Group();
        applicationMarker.position.set(i * 1 - 1, 0.1, 2);
        this.applicationMarkers = [...this.applicationMarkers, applicationMarker];
      }
    }
  }

  resetAndAddToScene(scene: THREE.Scene, updateables: any[]) {
    this.updateables = updateables;
    this.openApplications.clear();
    for (const applicationMarker of this.applicationMarkers) {
      scene.add(applicationMarker);
    }
  }

  get raycastObjects() {
    this.debug('Gettings objects' + this.applicationMarkers.length);
    return this.applicationMarkers;
    // return this.openApplications;
  }

  get openApplicationIds() {
    return this.openApplications.keys();
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

  private initializeApplication(
    applicationObject3D: ApplicationObject3D,
    args: AddApplicationArgs,
  ) {
    const closeIcon = new CloseIcon({
      textures: this.assetRepo.closeIconTextures,
      onClose: () => this.closeApplication(applicationObject3D?.dataModel.id),
    });
    closeIcon.addToObject(applicationObject3D);

    this.addGlobe(applicationObject3D);
    // Set initial position, rotation and scale.
    if (args.position) applicationObject3D.parent.position.copy(args.position);
    if (args.quaternion) applicationObject3D.quaternion.copy(args.quaternion);
    if (args.scale) applicationObject3D.scale.copy(args.scale);
  }

  removeAllApplications() {
    this.getOpenApplications().forEach((application) => {
      if (this.closeApplication) {
        this.closeApplication(application.dataModel.id);
      }
    });
  }

  updateAllApplicationGlobes(deltaTime: number) {
    this.getOpenApplications().forEach((application) => {
      application.animationMixer?.update(deltaTime);
    });
  }

  removeAllApplicationsLocally() {
    this.openApplications.forEach((app) => this.removeApplicationLocally(app.dataModel.id));
  }

  removeApplicationLocally(applicationId: string) {
    const application = this.getApplicationById(applicationId);
    if (application) {
      this.openApplications.delete(application.dataModel.id);
      application.parent?.remove(application);
      application.children.forEach((child) => {
        if (child instanceof BaseMesh) {
          child.disposeRecursively();
        }
      });
    }
  }

  @enqueueTask
  * openApplicationTask(
    applicationId: string,
    traces: DynamicLandscapeData,
    initCallback?: (applicationObject3D: ApplicationObject3D) => void,
    addApplicationArgs: AddApplicationArgs = {},
  ) {
    const applicationData = this.applicationRepo.getById(applicationId);
    const application = applicationData?.application;
    if (!applicationData || application?.packages.length === 0) {
      AlertifyHandler.showAlertifyMessage(
        `Sorry, there is no information for application <b>
        ${application?.name}</b> available.`
      );
      return;
    }
    if (this.isApplicationOpen(applicationId)) {
      AlertifyHandler.showAlertifyMessage(
        'Application already opened'
      );
      return;
    }
    const applicationObject3D = yield perform(this.addApplicationTask, applicationData, traces, addApplicationArgs);
    if (initCallback && applicationObject3D) {
      initCallback(applicationObject3D);
    }
  }

  private saveApplicationState(applicationObject3D: ApplicationObject3D): AddApplicationArgs {
    const serializedApp = this.roomSerializer.serializeApplication(applicationObject3D);
    return serializedRoomToAddApplicationArgs(serializedApp);
  }

  @enqueueTask
  * addApplicationTask(
    applicationData: ApplicationData,
    traces: DynamicLandscapeData,
    addApplicationArgs: AddApplicationArgs = {},
  ) {
    const applicationModel = applicationData.application;
    const isOpen = this.isApplicationOpen(applicationModel.id);
    // get existing applicationObject3D or create new one.
    const applicationObject3D = this.updateOrCreateApplication(applicationModel, traces, applicationData.layoutData);

    if (Object.keys(addApplicationArgs).length == 0 && isOpen) {
      addApplicationArgs = this.saveApplicationState(applicationObject3D);
    }

    this.cleanUpApplication(applicationObject3D);

    // Add new meshes to application
    EntityRendering.addFoundationAndChildrenToApplication(
      applicationObject3D,
      this.configuration.applicationColors,
    );

    if (applicationObject3D.globeMesh) {
      EntityRendering.repositionGlobeToApplication(applicationObject3D, applicationObject3D.globeMesh);
    }

    // Restore state of components highlighting
    const openComponentIds = addApplicationArgs.openComponents;
    if (openComponentIds) {
      restoreComponentState(applicationObject3D, openComponentIds);
    }

    this.addCommunication(applicationObject3D)

    this.addLabels(applicationObject3D, this.font, false)

    addApplicationArgs.highlightedComponents?.forEach((highlightedComponent) => {
      this.highlightingService.hightlightComponentLocallyByTypeAndId(
        applicationObject3D,
        highlightedComponent,
      );
    });

    if (!isOpen) {
      this.initializeApplication(applicationObject3D, addApplicationArgs);
      applicationObject3D.scale.setScalar(APPLICATION_SCALAR);
    }

    this.openApplications.set(
      applicationModel.id,
      applicationObject3D,
    );
    this.heatmapConf.updateActiveApplication(applicationObject3D);

    return applicationObject3D;
  }

  private cleanUpApplication(applicationObject3D: ApplicationObject3D) {
    applicationObject3D.removeAllEntities();
    removeHighlighting(applicationObject3D);
  }

  @action
  closeApplication(appId: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Ask backend to close the application.
      const nonce = this.sender.sendAppClosed(appId);

      // Remove the application only when the backend allowed the application to be closed.
      this.webSocket.awaitResponse({
        nonce,
        responseType: isObjectClosedResponse,
        onResponse: (response: ObjectClosedResponse) => {
          if (response.isSuccess) this.removeApplicationLocally(appId);
          resolve(response.isSuccess);
        },
        onOffline: () => {
          this.removeApplicationLocally(appId);
          resolve(true);
        },
      });
    });
  }

  updateOrCreateApplication(application: Application, traces: DynamicLandscapeData, layoutMap: Map<string, LayoutData>) {
    // Converting plain JSON layout data due to worker limitations
    const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(layoutMap);
    const applicationObject3D = this.getApplicationById(application.id);
    if (applicationObject3D) {
      applicationObject3D.dataModel = application;
      applicationObject3D.traces = traces;

      applicationObject3D.boxLayoutMap = boxLayoutMap;
      return applicationObject3D;
    }
    return this.createApplication(application, boxLayoutMap, traces);
  }

  private createApplication(application: Application, boxLayoutMap: Map<string, BoxLayout>, traces: DynamicLandscapeData) {
    const applicationObject3D = new VrApplicationObject3D(
      application,
      boxLayoutMap,
      traces,
    );
    this.addApplicationToMarker(applicationObject3D);
    this.debug('Application added to marker');
    return applicationObject3D;
  }

  @action
  addCommunicationForAllApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      this.addCommunication(applicationObject3D);
    })
  }

  @action
  removeCommunicationForAllApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      applicationObject3D.removeAllCommunication();

      // Remove highlighting if highlighted communication is no longer visible
      if (applicationObject3D.highlightedEntity instanceof ClazzCommunicationMesh) {
        removeHighlighting(applicationObject3D);
      }
    })
  }

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(applicationObject3D.dataModel.id);
    const drawableClassCommunications = applicationData?.drawableClassCommunications;
    if (drawableClassCommunications) {
      this.appCommRendering.addCommunication(
        applicationObject3D,
        drawableClassCommunications
      );
    }
  }

  @action
  updateApplicationObject3DAfterUpdate(applicationObject3D: ApplicationObject3D) {
    if (!this.arMode || this.arSettings.renderCommunication) {
      this.addCommunication(applicationObject3D);
    }
    if (!this.appSettings.keepHighlightingOnOpenOrClose.value) {
      // TODO this doesn't exist
      this.unhighlightAll();
    }
  }

  getDrawableClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(applicationObjetc3D.dataModel.id);
    return applicationData?.drawableClassCommunications;
  }

  getApplicationInCurrentLandscapeById(id: string): Application | undefined {
    return getApplicationInLandscapeById(this.structureLandscapeData, id);
  }

  getApplicationById(id: string): ApplicationObject3D | undefined {
    return this.openApplications.get(id);
  }

  getOpenApplications(): ApplicationObject3D[] {
    return Array.from(this.openApplications.values());
  }

  isApplicationOpen(id: string): boolean {
    return this.openApplications.has(id);
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
    }
    )
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
    for (const applicationObject3D of this.getOpenApplications()) {
      applicationObject3D.removeAllEntities();
      removeHighlighting(applicationObject3D);
      this.removeApplicationLocally(applicationObject3D.dataModel.id);
    }
  }

  addGlobe(applicationObject3D: ApplicationObject3D) {
    const addGlobe = () => {
      // Add globe for communication that comes from the outside
      const globeMesh = EntityRendering.addGlobeToApplication(applicationObject3D);

      const period = 1000;
      const times = [0, period];
      const values = [0, 360];

      const trackName = '.rotation[y]';
      const track = new THREE.NumberKeyframeTrack(trackName, times, values);

      const clip = new THREE.AnimationClip('default', period, [track]);

      const animationMixer = new THREE.AnimationMixer(globeMesh);

      const clipAction = animationMixer.clipAction(clip);
      clipAction.play();
      globeMesh.tick = (delta: any) => animationMixer.update(delta);
      this.updatables.push(globeMesh);
    };
    addGlobe();
  }

  addApplicationToMarker(applicationObject3D: ApplicationObject3D) {
    // applicationObject3D.setLargestSide(1.5);
    const applicationModel = applicationObject3D.dataModel;
    for (let i = 0; i < this.applicationMarkers.length; i++) {
      if (this.applicationMarkers[i].children.length === 0) {
        this.applicationMarkers[i].add(applicationObject3D);

        const message = `Application '${applicationModel.name}' successfully opened <br>
          on marker #${i + 1}.`;

        AlertifyHandler.showAlertifySuccess(message);

        break;
      }
    }
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

  restore(room: SerializedVrRoom, dynamicData: DynamicLandscapeData) {
    this.cleanUpApplications();
    for (const app of room.openApps) {

      const applicationData = this.applicationRepo.getById(app.id);
      perform(
        this.addApplicationTask,
        applicationData,
        dynamicData,
        serializedRoomToAddApplicationArgs(app),
      )
    }
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
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'application-renderer': ApplicationRenderer;
  }
}
