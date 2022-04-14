import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { enqueueTask, task } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { getAllClassesInApplication } from 'explorviz-frontend/utils/application-helpers';
import computeDrawableClassCommunication, { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { restoreComponentState } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
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
import VrSceneService from 'virtual-reality/services/vr-scene';
import WebSocketService from 'virtual-reality/services/web-socket';
import VrApplicationObject3D from 'virtual-reality/utils/view-objects/application/vr-application-object-3d';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import { isObjectClosedResponse, ObjectClosedResponse } from 'virtual-reality/utils/vr-message/receivable/response/object-closed';
import Configuration from './configuration';
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

  @service()
  private worker!: any;

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

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('vr-scene')
  private sceneService!: VrSceneService;


  // @service('heatmap-renderer')
  // heatmapRenderer!: HeatmapRenderer;

  private structureLandscapeData!: StructureLandscapeData;

  private dynamicLandscapeData!: DynamicLandscapeData;

  private openApplications: Map<string, ApplicationObject3D>;

  readonly applicationMarkers: THREE.Group[] = [];

  readonly appCommRendering: CommunicationRendering;

  renderingLoop!: RenderingLoop;

  arMode: boolean = false;


  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  readonly drawableClassCommunications: Map<
    string,
    DrawableClassCommunication[]
  >;

  // TODO this has to be assigned
  font?: THREE.Font;

  constructor(properties?: object) {
    super(properties);
    this.openApplications = new Map();

    const applicationMarkerNames = ['pattern-angular_1', 'pattern-angular_2', 'pattern-angular_3', 'pattern-angular_4', 'pattern-angular_5'];
    for (let i = 0; i < applicationMarkerNames.length; i++) {
      if (this.applicationMarkers.length <= i) {
        const applicationMarker = new THREE.Group();
        applicationMarker.position.set(i * 1 - 1, 0.3, 2);
        this.sceneService.scene.add(applicationMarker);
        this.applicationMarkers = [...this.applicationMarkers, applicationMarker];
      }
    }

    this.appCommRendering = new CommunicationRendering(this.configuration,
      this.userSettings, this.heatmapConf);
    this.drawableClassCommunications = new Map();
  }

  get raycastObjects() {
    this.debug('Gettings objects' + this.applicationMarkers.length);
    return this.applicationMarkers;
    // return this.openApplications;
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

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  async addApplication(
    applicationModel: Application,
    args: AddApplicationArgs = {},
  ): Promise<ApplicationObject3D> {
    const application = await this.addApplicationLocally(
      applicationModel,
      args,
    );
    this.sender.sendAppOpened(application);
    return application;
  }


  addApplicationLocally(
    applicationModel: Application,
    args: AddApplicationArgs = {},
  ): Promise<ApplicationObject3D> {
    return new Promise((resolve) => {
      perform(this.addApplicationTask, applicationModel, (application) => {
        this.initializeApplication(application, args);
        resolve(application);
      });
    });
  }


  private initializeApplication(
    application: ApplicationObject3D,
    args: AddApplicationArgs,
  ) {
    // Set initial position, rotation and scale.
    if (args.position) application.position.copy(args.position);
    if (args.quaternion) application.quaternion.copy(args.quaternion);
    if (args.scale) application.scale.copy(args.scale);

    // Expand initially open components.
    if (args.openComponents) {
      EntityManipulation.restoreComponentState(
        application,
        args.openComponents,
      );
      this.addLabels(application, this.font!, false);
    }

    // Draw communication lines.
    const drawableComm = this.drawableClassCommunications.get(
      application.dataModel.id,
    );
    if (drawableComm && this.arSettings.renderCommunication) {
      this.appCommRendering.addCommunication(application, drawableComm);
      Highlighting.updateHighlighting(application, drawableComm, this.opacity);
    }

    // Hightlight components.
    args.highlightedComponents?.forEach((highlightedComponent) => {
      this.highlightingService.hightlightComponentLocallyByTypeAndId(
        application,
        highlightedComponent,
      );
    });
  }

  removeAllApplications() {
    this.getOpenApplications().forEach((application) => {
      this.removeApplication(application);
    });
  }

  removeApplication(application: ApplicationObject3D): Promise<boolean> {
    return new Promise((resolve) => {
      // Ask backend to close the application.
      const nonce = this.sender.sendAppClosed(application.dataModel.id);

      // Remove the application only when the backend allowed the application to be closed.
      this.webSocket.awaitResponse({
        nonce,
        responseType: isObjectClosedResponse,
        onResponse: (response: ObjectClosedResponse) => {
          if (response.isSuccess) this.removeApplicationLocally(application);
          resolve(response.isSuccess);
        },
        onOffline: () => {
          this.removeApplicationLocally(application);
          resolve(true);
        },
      });
    });
  }

  updateAllApplicationGlobes(deltaTime: number) {
    this.getOpenApplications().forEach((application) => {
      application.animationMixer?.update(deltaTime);
    });
  }

  removeAllApplicationsLocally() {
    this.openApplications.forEach((app) => this.removeApplicationLocally(app));

    this.drawableClassCommunications.clear();
  }

  removeApplicationLocally(application: ApplicationObject3D) {
    this.openApplications.delete(application.dataModel.id);
    application.parent?.remove(application);
    application.children.forEach((child) => {
      if (child instanceof BaseMesh) {
        child.disposeRecursively();
      }
    });

    this.drawableClassCommunications.delete(application.dataModel.id);
  }

  async updateLandscapeData(
    structureLandscapeData: StructureLandscapeData,
    dynamicLandscapeData: DynamicLandscapeData,
    clear: boolean = true,
  ): Promise<void> {
    this.structureLandscapeData = structureLandscapeData;
    this.dynamicLandscapeData = dynamicLandscapeData;

    if (clear) {
      this.removeAllApplicationsLocally();
      this.drawableClassCommunications.clear();
    }
  }

  @enqueueTask
  * addApplicationTask(
    applicationModel: Application,
    traces: DynamicLandscapeData,
    drawableClassCommunications: DrawableClassCommunication[],
  ) {
    // get existing applicationObject3D or create new one.
    const applicationObject3D = yield perform(this.updateOrCreateApplication, applicationModel, traces);

    // save state
    const openComponentIds = applicationObject3D.openComponentIds;
    this.cleanUpApplication(applicationObject3D);

    // Add new meshes to application
    EntityRendering.addFoundationAndChildrenToApplication(
      applicationObject3D,
      this.configuration.applicationColors,
    );

    if (applicationObject3D.globeMesh) {
      EntityRendering.repositionGlobeToApplication(applicationObject3D, applicationObject3D.globeMesh);
    }

    if (openComponentIds) {
      restoreComponentState(applicationObject3D, openComponentIds);
    }

    this.updateDrawableClassCommunications(
      applicationObject3D,
      drawableClassCommunications,
    )

    this.debug('Add communication ')
    this.addCommunication(applicationObject3D)

    this.addLabels(applicationObject3D, this.font!, !this.arMode)
    // Scale application to a reasonable size to work with it.
    applicationObject3D.scale.setScalar(APPLICATION_SCALAR);

    this.openApplications.set(
      applicationModel.id,
      applicationObject3D,
    );
    return applicationObject3D;
  }

  cleanUpApplication(applicationObject3D: ApplicationObject3D) {
    applicationObject3D.removeAllEntities();
    removeHighlighting(applicationObject3D);
  }

  @task *
    updateOrCreateApplication(application: Application, traces: DynamicLandscapeData) {
    const workerPayload = {
      structure: application,
      dynamic: traces,
    };

    // TODO this can probably be placed somewhere else, then it doesn't have to be a task
    const layoutMap: Map<string, LayoutData> = yield this.worker.postMessage('city-layouter', workerPayload);
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

  createApplication(application: Application, boxLayoutMap: Map<string, BoxLayout>, traces: DynamicLandscapeData) {
    const applicationObject3D = new VrApplicationObject3D(
      application,
      boxLayoutMap,
      traces,
    );

    const closeIcon = new CloseIcon({
      textures: this.assetRepo.closeIconTextures,
      onClose: () => this.removeApplication(applicationObject3D),
    });
    closeIcon.addToObject(applicationObject3D);
    this.addGlobe(applicationObject3D);
    this.addApplicationToMarker(applicationObject3D);
    return applicationObject3D;
  }

  updateDrawableClassCommunications(
    applicationObject3D: ApplicationObject3D,
    drawableClassCommunications: DrawableClassCommunication[]
  ) {
    const allClasses = new Set(getAllClassesInApplication(applicationObject3D.dataModel));

    const communicationInApplication = drawableClassCommunications.filter(
      (comm) => allClasses.has(comm.sourceClass) || allClasses.has(comm.targetClass),
    );
    this.drawableClassCommunications.set(
      applicationObject3D.dataModel.id,
      communicationInApplication,
    );
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
    const drawableClassCommunications = this.drawableClassCommunications.get(applicationObject3D.dataModel.id);
    if (drawableClassCommunications) {
      this.appCommRendering.addCommunication(
        applicationObject3D,
        drawableClassCommunications
      );
      updateHighlighting(
        applicationObject3D,
        drawableClassCommunications,
        1,
      );

      if (this.heatmapConf.heatmapActive) {
        applicationObject3D.setComponentMeshOpacity(0.1);
        applicationObject3D.setCommunicationOpacity(0.1);
      }
    }
  }


  @action
  updateApplicationObject3DAfterUpdate(applicationObject3D: ApplicationObject3D) {
    this.addCommunication(applicationObject3D);
    if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
      const { value } = this.appSettings.transparencyIntensity;
      this.updateHighlighting(applicationObject3D, value);
    } else {
      this.unhighlightAll();
    }

  }

  @action
  updateHighlightingForAllApplications(value: number) {
    this.getOpenApplications().forEach((applicationObject3D) => {
      this.updateHighlighting(applicationObject3D, value);
    })
  }



  @action
  updateHighlighting(applicationObject3D: ApplicationObject3D, value: number) {
    const drawableClassCommunications = this.drawableClassCommunications.get(applicationObject3D.dataModel.id);
    if (drawableClassCommunications) {
      updateHighlighting(applicationObject3D, drawableClassCommunications, value);
    }
  }

  @action
  highlightModel(entity: Package | Class, applicationObject3D: ApplicationObject3D, opacity: number) {
    const drawableClassCommunications = this.drawableClassCommunications.get(applicationObject3D.dataModel.id);
    if (drawableClassCommunications) {
      highlightModel(entity, this.selectedApplicationObject3D, drawableClassCommunications, opacity);
    }
  }

  @action
  highlight(mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh) {
    const applicationObject3D = mesh.parent;
    if (applicationObject3D instanceof ApplicationObject3D) {
      const drawableClassCommunications = this.drawableClassCommunications.get(applicationObject3D.dataModel.id);
      if (drawableClassCommunications) {
        highlight(mesh, applicationObject3D, drawableClassCommunications!, this.opacity);
      }
    }
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
    this.addLabels(applicationObject3D, this.font!, false);
    this.highlightingService.updateHighlightingLocally(applicationObject3D);
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
    this.highlightingService.updateHighlightingLocally(applicationObject3D);
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


  openAllComponentsOfAllApplications() {
    this.getOpenApplications().forEach((applicationObject3D) => {
      EntityManipulation.openAllComponents(applicationObject3D);
      this.updateApplicationObject3DAfterUpdate(applicationObject3D);
    }
    )
  }

  openAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.openAllComponents(applicationObject3D);
    this.addLabels(applicationObject3D, this.font!, false);

    const drawableComm = this.drawableClassCommunications.get(
      applicationObject3D.dataModel.id,
    )!;
    if (this.arSettings.renderCommunication) {
      this.appCommRendering.addCommunication(applicationObject3D, drawableComm);
    }
    this.highlightingService.updateHighlightingLocally(applicationObject3D);

    if (this.heatmapConf.heatmapActive) {
      applicationObject3D.setComponentMeshOpacity(0.1);
      applicationObject3D.setCommunicationOpacity(0.1);
    }
  }

  updateCommunication() {
    this.getOpenApplications().forEach((application) => {
      const drawableComm = this.drawableClassCommunications.get(
        application.dataModel.id,
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
      removeHighlighting(applicationObject3D)
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
      this.renderingLoop.updatables.push(globeMesh);
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

  // normal class body definition here
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'application-renderer': ApplicationRenderer;
  }
}
