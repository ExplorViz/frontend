import Service, { inject as service } from '@ember/service';
import { Application, Node } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ElkConstructor, { ELK, ElkNode } from 'elkjs/lib/elk-api';
import { restartableTask } from 'ember-concurrency-decorators';
import { Layout1Return, Layout3Return } from 'explorviz-frontend/components/visualization/rendering/landscape-rendering';
import ImageLoader from 'explorviz-frontend/utils/three-image-loader';
import * as CommunicationRendering from 'explorviz-frontend/utils/landscape-rendering/communication-rendering';
import computeApplicationCommunication from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import Configuration from './configuration';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import Labeler from 'explorviz-frontend/utils/landscape-rendering/labeler';
import debugLogger from 'ember-debug-logger';
import updateCameraZoom from 'explorviz-frontend/utils/landscape-rendering/zoom-calculator';
import LocalUser from 'collaborative-mode/services/local-user';
import VrSceneService from 'virtual-reality/services/vr-scene';
import THREE from 'three';
import ArSettings from 'virtual-reality/services/ar-settings';
import VrLandscapeObject3D from 'virtual-reality/utils/view-objects/landscape/vr-landscape-object-3d';

interface SimplePlaneLayout {
  height: number;
  width: number;
  positionX: number;
  positionY: number;
}

export type Point = {
  x: number,
  y: number
};

export interface Layout1Return {
  graph: ElkNode,
  modelIdToPoints: Map<string, Point[]>,
}

export interface Layout3Return {
  modelIdToLayout: Map<string, SimplePlaneLayout>,
  modelIdToPoints: Map<string, Point[]>,
}
const LANDSCAPE_SCALAR = 0.3;

export default class LandscapeRenderer extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  private debug = debugLogger('LandscapeRenderer');

  @service()
  private worker!: any;

  @service('configuration')
  private configuration!: Configuration;

  @service('local-user')
  private localUser!: LocalUser;

  @service('ar-settings')
  arSettings!: ArSettings;

  @service('vr-scene')
  private sceneService!: VrSceneService;

  readonly landscapeObject3D!: LandscapeObject3D; // TODO should be read only?

  largestSide: number | undefined;

  modelIdToPlaneLayout: Map<string, PlaneLayout> | null = null;

  private elk: ELK;

  // Provides functions to label landscape meshes
  readonly labeler = new Labeler();

  readonly imageLoader: ImageLoader = new ImageLoader();

  webglrenderer!: THREE.WebGLRenderer;

  // readonly font: THREE.Font;
  font!: THREE.Font;

  // Scalar with which the landscape is scaled (evenly in all dimensions)
  // landscape_scalar = 3.5;
  landscape_scalar = 0.1;

  // Depth of boxes for landscape entities
  landscape_depth = 0.0;

  z_depth = 0.02

  commLineMinSize = 0.02

  commLineScalar = 0.08

  z_pos_application = 0.03

  arMode = false

  constructor(properties?: object) {
    super(properties);

    this.elk = new ElkConstructor({
      workerUrl: './assets/web-workers/elk-worker.min.js',
    });

    // Create landscape object. The actual landscape data is not available
    // until the VR rendering component is created.
    this.landscapeObject3D = new VrLandscapeObject3D({
      landscapeToken: '',
      nodes: [],
    });
    this.debug('Adding landscapeObject3D to scene' + this.landscapeObject3D.id);
    this.sceneService.scene.add(this.landscapeObject3D);
    this.debug('Added landscapeObject3D to scene');
  }

  cleanUpLandscape() {
    this.landscapeObject3D.removeAllChildren();
    this.landscapeObject3D.resetMeshReferences();
  }

  @restartableTask
  * populateLandscape(
    structureLandscapeData: StructureLandscapeData,
    dynamicLandscapeData: DynamicLandscapeData,
  ): any {
    this.debug('populate landscape-rendering');

    // Update landscape model.
    this.landscapeObject3D.dataModel = structureLandscapeData;

    // Run Klay layouting in 3 steps within workers
    try {
      const applicationCommunications = computeApplicationCommunication(
        structureLandscapeData,
        dynamicLandscapeData,
      );

      // Do layout pre-processing (1st step)
      const {
        graph,
        modelIdToPoints,
      }: Layout1Return = yield this.worker.postMessage('layout1', {
        structureLandscapeData,
        applicationCommunications,
      });

      // Run actual klay function (2nd step)
      const newGraph: ElkNode = yield this.elk.layout(graph);

      // Post-process layout graph (3rd step)
      const layoutedLandscape: any = yield this.worker.postMessage('layout3', {
        graph: newGraph,
        modelIdToPoints,
        structureLandscapeData,
        applicationCommunications,
      });

      // Remove old landscape.
      this.cleanUpLandscape();

      const {
        modelIdToLayout,
        modelIdToPoints: modelIdToPointsComplete,
      }: Layout3Return = layoutedLandscape;

      const modelIdToPlaneLayout = new Map<string, PlaneLayout>();

      this.modelIdToPlaneLayout = modelIdToPlaneLayout

      // Convert the simple to a PlaneLayout map
      LandscapeRenderer.convertToPlaneLayoutMap(
        modelIdToLayout,
        modelIdToPlaneLayout,
      );

      // Compute center of landscape
      const landscapeRect = this.landscapeObject3D.getMinMaxRect(
        modelIdToPlaneLayout,
      );
      const centerPoint = landscapeRect.center;

      // Update camera zoom accordingly
      if (!this.arMode) {
        updateCameraZoom(landscapeRect, this.localUser.camera, this.webglrenderer);
      }

      // Draw boxes for nodes
      structureLandscapeData.nodes.forEach((node: Node) => {
        this.renderNode(
          node,
          modelIdToPlaneLayout.get(node.id),
          centerPoint,
        );

        const { applications } = node;

        // Draw boxes for applications
        applications.forEach((application: Application) => {
          this.renderApplication(
            application,
            modelIdToPlaneLayout.get(application.id),
            centerPoint,
          );
        });
      });

      // Render application communication
      const color = this.configuration.landscapeColors.communicationColor;
      const tiles = CommunicationRendering.computeCommunicationTiles(
        applicationCommunications,
        modelIdToPointsComplete,
        color,
        this.z_offset,
        //
      );

      CommunicationRendering.addCommunicationLineDrawing(
        tiles,
        this.landscapeObject3D,
        centerPoint,
        this.commLineMinSize, // DONE AR ONLY
        this.commLineScalar, // DONE AR ONLY
      );


      if (this.arMode) {
        this.landscapeObject3D.setOpacity(this.arSettings.landscapeOpacity);

        // Reset position of landscape.
        this.resetScale();
        this.resetRotation();
        this.centerLandscape();
      }

      this.resetScale();
      this.resetRotation();
      this.debug('Landscape loaded');
    } catch (e) {
      this.debug(e);
    }
  }

  /**
   * Creates & positions a node mesh with corresponding labels.
   * Then adds it to the landscapeObject3D.
   *
   * @param node Data model for the node mesh
   * @param layout Layout data to position the mesh correctly
   * @param centerPoint Offset of landscape object
   */
  renderNode(
    node: Node,
    layout: PlaneLayout | undefined,
    centerPoint: THREE.Vector2
  ) {
    if (!layout) { return; }

    // Create node mesh
    const nodeMesh = new NodeMesh(
      layout,
      node,
      this.configuration.landscapeColors.nodeColor,
      this.configuration.applicationColors.highlightedEntityColor,
      this.landscape_depth, // DONE AR ONLY
      this.z_depth// 0.2, // DONE AR ONLY
    );

    // Create and add label + icon
    nodeMesh.setToDefaultPosition(centerPoint);

    // Label with own ip-address by default
    const labelText = nodeMesh.getDisplayName();

    // if (this.assetRepo.font) {
    this.labeler.addNodeTextLabel(
      nodeMesh,
      labelText,
      this.font,
      // this.assetRepo.font, // TODO AR ONLY
      this.configuration.landscapeColors.nodeTextColor
    );
    // }

    // Add to scene
    this.landscapeObject3D.add(nodeMesh);
  }

  /**
   * Creates & positions an application mesh with corresponding labels.
   * Then adds it to the landscapeObject3D.
   *
   * @param application Data model for the application mesh
   * @param layout Layout data to position the mesh correctly
   * @param centerPoint Offset of landscape object
   */
  renderApplication(application: Application, layout: PlaneLayout | undefined,
    centerPoint: THREE.Vector2) {
    if (!layout) { return; }

    // Create application mesh
    const applicationMesh = new ApplicationMesh(
      layout,
      application,
      this.configuration.landscapeColors.applicationColor,
      this.configuration.applicationColors.highlightedEntityColor,
      this.landscape_depth,
      this.z_pos_application,
    );
    applicationMesh.setToDefaultPosition(centerPoint);

    // Create and add label + icon
    this.labeler.addApplicationTextLabel(
      applicationMesh,
      application.name,
      this.font,
      // this.assetRepo.font, // TODO AR ONLY
      this.configuration.landscapeColors.applicationTextColor,
    );
    this.labeler.addApplicationLogo(applicationMesh, this.imageLoader);

    // Add to scene
    this.landscapeObject3D.add(applicationMesh);
  }

  setLargestSide(largestSide: number) {
    this.largestSide = largestSide;
    this.landscapeObject3D.setLargestSide(largestSide);
  }

  centerLandscape() {
    this.resetRotation();

    if (this.largestSide) {
      this.landscapeObject3D.setLargestSide(this.largestSide);
    } else {
      this.resetScale();
      this.resetPosition();
    }
  }

  private resetPosition() {
    // Compute bounding box of the floor.
    const bboxFloor = new THREE.Box3().setFromObject(this.sceneService.floor);

    // Calculate center of the floor.
    const centerFloor = new THREE.Vector3();
    bboxFloor.getCenter(centerFloor);

    const bboxLandscape = new THREE.Box3().setFromObject(
      this.landscapeObject3D,
    );

    // Calculate center of the landscape.
    const centerLandscape = new THREE.Vector3();
    bboxLandscape.getCenter(centerLandscape);

    // Set new position of landscape
    this.landscapeObject3D.position.x += centerFloor.x - centerLandscape.x;
    this.landscapeObject3D.position.z += centerFloor.z - centerLandscape.z;

    // Check distance between floor and landscape
    if (bboxLandscape.min.y > bboxFloor.max.y) {
      this.landscapeObject3D.position.y
        += bboxFloor.max.y - bboxLandscape.min.y + 0.001;
    }

    // Check if landscape is underneath the floor
    if (bboxLandscape.min.y < bboxFloor.min.y) {
      this.landscapeObject3D.position.y
        += bboxFloor.max.y - bboxLandscape.min.y + 0.001;
    }
  }

  private resetScale() {
    this.landscapeObject3D.scale.set(
      LANDSCAPE_SCALAR,
      LANDSCAPE_SCALAR,
      LANDSCAPE_SCALAR,
    );
  }

  resetRotation() {
    this.landscapeObject3D.rotation.x = -90 * THREE.MathUtils.DEG2RAD;
    this.landscapeObject3D.rotation.y = 0;
    this.landscapeObject3D.rotation.z = 0;
  }

  resetService() {
    this.cleanUpLandscape();
    this.largestSide = undefined;
  }

  resetBrowserView() {
    if (!this.modelIdToPlaneLayout) { return; }

    this.localUser.camera.position.set(0, 0, 0);
    const landscapeRect = this.landscapeObject3D.getMinMaxRect(this.modelIdToPlaneLayout);

    updateCameraZoom(landscapeRect, this.localUser.camera, this.webglrenderer);
  }

  /**
   * Takes a map with plain JSON layout objects and creates PlaneLayout objects from it
   *
   * @param layoutedApplication Map containing plain JSON layout data
   */
  static convertToPlaneLayoutMap(modelIdToSimpleLayout: Map<string, SimplePlaneLayout>,
    modelIdToPlaneLayout: Map<string, PlaneLayout>) {
    // Construct a layout map from plain JSON layouts
    modelIdToSimpleLayout.forEach((simplePlaneLayout: SimplePlaneLayout, modelId: string) => {
      const planeLayoutObject = new PlaneLayout();
      planeLayoutObject.height = simplePlaneLayout.height;
      planeLayoutObject.width = simplePlaneLayout.width;
      planeLayoutObject.positionX = simplePlaneLayout.positionX;
      planeLayoutObject.positionY = simplePlaneLayout.positionY;

      modelIdToPlaneLayout.set(modelId, planeLayoutObject);
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-renderer': LandscapeRenderer;
  }
}
