import Service, { inject as service } from '@ember/service';
import { enqueueTask, restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import ApplicationRendering from 'explorviz-frontend/components/visualization/rendering/application-rendering';
import Configuration from 'explorviz-frontend/services/configuration';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { getAllClassesInApplication } from 'explorviz-frontend/utils/application-helpers';
import AppCommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as ApplicationLabeler from 'explorviz-frontend/utils/application-rendering/labeler';
import computeDrawableClassCommunication, { DrawableClassCommunication } from 'explorviz-frontend/utils/landscape-rendering/class-communication-computer';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { Application, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import HeatmapConfiguration, { Metric } from 'heatmap/services/heatmap-configuration';
import THREE from 'three';
import VrApplicationObject3D from 'virtual-reality/utils/view-objects/application/vr-application-object-3d';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import ArSettings from './ar-settings';
import { isObjectClosedResponse, ObjectClosedResponse } from '../utils/vr-message/receivable/response/object-closed';
import VrAssetRepository from './vr-asset-repo';
import VrHighlightingService, { HightlightComponentArgs } from './vr-highlighting';
import VrMessageSender from './vr-message-sender';
import VrSceneService from './vr-scene';
import WebSocketService from 'virtual-reality/services/web-socket';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

// Scalar with which the application is scaled (evenly in all dimensions)
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

export default class VrApplicationRenderer extends Service {
  debug = debugLogger('VrApplicationRender');

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

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

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer

  @service()
  private worker!: any;

  private structureLandscapeData!: StructureLandscapeData;

  private dynamicLandscapeData!: DynamicLandscapeData;

  private openApplications: Map<string, ApplicationObject3D>;

  readonly applicationGroup: THREE.Group;

  readonly appCommRendering: AppCommunicationRendering;




  /**
   * Adds labels to all box meshes of a given application
   */
  private addLabels(applicationObject3D: ApplicationObject3D) {
    if (this.assetRepo.font) {
      this.applicationRenderer.addLabels(applicationObject3D, this.assetRepo.font, false)
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-application-renderer': VrApplicationRenderer;
  }
}
