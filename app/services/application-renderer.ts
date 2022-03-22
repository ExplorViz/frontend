import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import computeDrawableClassCommunication, { DrawableClassCommunication } from 'explorviz-frontend/utils/landscape-rendering/class-communication-computer';
import { Application, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getAllClassesInApplication } from 'explorviz-frontend/utils/application-helpers';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { enqueueTask, restartableTask } from 'ember-concurrency-decorators';
import HeatmapConfiguration, { Metric } from 'heatmap/services/heatmap-configuration';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import applySimpleHeatOnFoundation, { addHeatmapHelperLine, computeHeatMapViewPos, removeHeatmapHelperLines } from 'heatmap/utils/heatmap-helper';
import { simpleHeatmap } from 'heatmap/utils/simple-heatmap';
import VrApplicationObject3D from 'virtual-reality/utils/view-objects/application/vr-application-object-3d';
import { perform } from 'ember-concurrency-ts';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import { updateHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import THREE from 'three';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import Configuration from './configuration';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import VrHighlightingService, { HightlightComponentArgs } from 'virtual-reality/services/vr-highlighting';
import VrSceneService from 'virtual-reality/services/vr-scene';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import WebSocketService from 'virtual-reality/services/web-socket';
import VrAssetRepository from 'virtual-reality/services/vr-asset-repo';
import UserSettings from './user-settings';
import ArSettings from 'virtual-reality/services/ar-settings';
import { isObjectClosedResponse, ObjectClosedResponse } from 'virtual-reality/utils/vr-message/receivable/response/object-closed';

const APPLICATION_SCALAR = 0.01;

type LayoutData = {
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
  @service()
  private worker!: any;

  @service('configuration')
  configuration!: Configuration;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

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

  @service('vr-scene')
  private sceneService!: VrSceneService;

  private structureLandscapeData!: StructureLandscapeData;

  private dynamicLandscapeData!: DynamicLandscapeData;

  private openApplications: Map<string, ApplicationObject3D>;

  readonly applicationGroup: THREE.Group;

  readonly appCommRendering: CommunicationRendering;

  arMode: boolean = false;

  readonly drawableClassCommunications: Map<
    string,
    DrawableClassCommunication[]
  >;

  // TODO this has to be assigned
  font?: THREE.Font;

  constructor(properties?: object) {
    super(properties);
    this.openApplications = new Map();

    this.applicationGroup = new THREE.Group();
    this.sceneService.scene.add(this.applicationGroup);

    this.appCommRendering = new CommunicationRendering(this.configuration,
      this.userSettings, this.heatmapConf);
    this.drawableClassCommunications = new Map();
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

  updateDrawableClassCommunications(
    structureLandscapeData: StructureLandscapeData,
    applicationObject3D: ApplicationObject3D,
  ) {
    if (
      this.drawableClassCommunications.has(
        applicationObject3D.dataModel.id,
      )
    ) {
      return;
    }

    const drawableClassCommunications = computeDrawableClassCommunication(
      structureLandscapeData,
      applicationObject3D.traces,
    );

    const allClasses = new Set(getAllClassesInApplication(applicationObject3D.dataModel));

    const communicationInApplication = drawableClassCommunications.filter(
      (comm) => allClasses.has(comm.sourceClass) || allClasses.has(comm.targetClass),
    );

    this.drawableClassCommunications.set(
      applicationObject3D.dataModel.id,
      communicationInApplication,
    );
  }

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
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
  ): Promise<void> {
    this.structureLandscapeData = structureLandscapeData;
    this.dynamicLandscapeData = dynamicLandscapeData;

    this.removeAllApplicationsLocally();
    this.drawableClassCommunications.clear();
  }

  @restartableTask *
    calculateHeatmapTask(
      applicationObject3D: ApplicationObject3D,
      callback?: () => void,
  ) {
    try {
      const workerPayload = {
        structure: applicationObject3D.dataModel,
        dynamic: applicationObject3D.traces,
      };

      const metrics: Metric[] = yield this.worker.postMessage('metrics-worker', workerPayload);

      this.heatmapConf.applicationID = applicationObject3D.dataModel.id;
      this.heatmapConf.latestClazzMetricScores = metrics;
      this.heatmapConf.saveAndCalculateMetricScores(metrics);

      this.heatmapConf.updateCurrentlyViewedMetric();

      if (callback) callback();
    } catch (e) {
      this.debug(e);
    }
  }

  @enqueueTask
  * addApplicationTask(
    applicationModel: Application,
    callback?: (applicationObject3D: ApplicationObject3D) => void,
  ) {
    try {
      if (this.isApplicationOpen(applicationModel.id)) return;

      const workerPayload = {
        structure: applicationModel,
        dynamic: this.dynamicLandscapeData,
      };

      // TODO his is from browser. We have reloads here, but not in AR
      // Remember state of components
      // const { openComponentIds } = this.applicationObject3D;

      const layoutMap: Map<string, LayoutData> = yield this.worker.postMessage('city-layouter', workerPayload);

      // Converting plain JSON layout data due to worker limitations
      const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(layoutMap);

      const applicationObject3D = new VrApplicationObject3D(
        applicationModel,
        boxLayoutMap,
        this.dynamicLandscapeData,
      );

      // TODO his is from browser. We have reloads here, but not in AR
      // Clean up old application
      // this.cleanUpApplication();

      // Add new meshes to application
      EntityRendering.addFoundationAndChildrenToApplication(
        applicationObject3D,
        this.configuration.applicationColors,
      );

      if (!applicationObject3D.globeMesh) {
        // reposition
        applicationObject3D.addGlobeToApplication();
        applicationObject3D.initializeGlobeAnimation();
      } else {
        applicationObject3D.repositionGlobeToApplication();
      }

      // TODO his is from browser. We have reloads here, but not in AR
      // Restore old state of components
      // restoreComponentState(this.applicationObject3D, openComponentIds);

      this.updateDrawableClassCommunications(
        this.structureLandscapeData,
        applicationObject3D
      )

      const drawableComm = this.drawableClassCommunications.get(
        applicationObject3D.dataModel.id,
      )!;

      if (!this.arMode) {
        this.addCommunication(applicationObject3D, drawableComm)
      } else if (this.arSettings.renderCommunication) {
        this.appCommRendering.addCommunication(applicationObject3D, drawableComm);
      }

      if (this.arMode) {
        this.addLabels(applicationObject3D, this.font!, false)
        // Scale application to a reasonable size to work with it.
        applicationObject3D.scale.setScalar(APPLICATION_SCALAR);

        // Add close icon to application.
        const closeIcon = new CloseIcon({
          textures: this.assetRepo.closeIconTextures,
          onClose: () => this.removeApplication(applicationObject3D),
        });
        closeIcon.addToObject(applicationObject3D);
      } {
        this.addLabels(applicationObject3D, this.font!, true)
      }

      this.applicationGroup.add(applicationObject3D);
      this.openApplications.set(
        applicationModel.id,
        applicationObject3D,
      );

      if (this.heatmapConf.heatmapActive) {
        perform(this.calculateHeatmapTask, applicationObject3D, () => {
          if (!this.arMode) {
            this.applyHeatmap(applicationObject3D);
          }
          this.heatmapConf.triggerLatestHeatmapUpdate();
        });
      }

      if (callback) callback(applicationObject3D);
    } catch (e) {
      this.debug(e);
    }
  }

  @action
  addCommunication(applicationObject3D: ApplicationObject3D, drawableClassCommunications: DrawableClassCommunication[]) {
    this.communicationRendering.addCommunication(
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

  applyHeatmap(applicationObject3D: ApplicationObject3D) {
    if (!this.heatmapConf.latestClazzMetricScores
      || !this.heatmapConf.latestClazzMetricScores.firstObject) {
      AlertifyHandler.showAlertifyError('No metrics available.');
      return;
    }

    // Selected first metric if none is selected yet
    if (!this.heatmapConf.selectedMetric) {
      this.heatmapConf.selectedMetric = this.heatmapConf.latestClazzMetricScores.firstObject;
    }

    const { selectedMetric } = this.heatmapConf;

    applicationObject3D.setComponentMeshOpacity(0.1);
    applicationObject3D.setCommunicationOpacity(0.1);

    const foundationMesh = applicationObject3D
      .getBoxMeshbyModelId(applicationObject3D.dataModel.id); // TODO was this.args.landscapeData.application!.id check if it is correct now

    if (!(foundationMesh instanceof FoundationMesh)) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = foundationMesh.width;
    canvas.height = foundationMesh.depth;
    const simpleHeatMap = simpleHeatmap(selectedMetric.max, canvas,
      this.heatmapConf.getSimpleHeatGradient(),
      this.heatmapConf.heatmapRadius, this.heatmapConf.blurRadius);

    const foundationWorldPosition = new THREE.Vector3();

    foundationMesh.getWorldPosition(foundationWorldPosition);

    removeHeatmapHelperLines(applicationObject3D);

    const boxMeshes = applicationObject3D.getBoxMeshes();

    boxMeshes.forEach((boxMesh) => {
      if (boxMesh instanceof ClazzMesh) {
        this.heatmapClazzUpdate(boxMesh.dataModel, foundationMesh,
          simpleHeatMap);
      }
    });

    simpleHeatMap.draw(0.0);
    applySimpleHeatOnFoundation(foundationMesh, canvas);

    this.heatmapConf.currentApplication = applicationObject3D;
    this.heatmapConf.applicationID = applicationObject3D.dataModel.id;
    this.heatmapConf.heatmapActive = true;
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
