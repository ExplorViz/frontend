import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
// @ts-ignore: no types atm
import * as d3 from 'd3-force-3d';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import GrabbableForceGraph from 'explorviz-frontend/view-objects/3d/landscape/grabbable-force-graph';
import ThreeForceGraph from 'three-forcegraph';
import * as THREE from 'three';
export interface GraphNode {
  // data: ApplicationData,
  id: string;
  index: number;
  collisionRadius: number;
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
  __threeObj: ApplicationObject3D;
}

export interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  value: number;
  communicationData: ClassCommunication;
  __curve: any;
  __lineObj: ClazzCommunicationMesh;
}

export default class ForceGraph {
  debug = debugLogger('ForceGraph');

  graph: ThreeForceGraph;

  scale: number;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  boundingBox: THREE.Box3 = new THREE.Box3();

  scaleFactor!: number;

  constructor(owner: any, scale: number = 1) {
    this.scale = scale;
    this.scaleFactor = 30;
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
    this.graph = new GrabbableForceGraph()
      .graphData({ nodes: [], links: [] })
      .nodeThreeObject(
        ({ id }) => this.applicationRenderer.getApplicationById(id as string)!
      )
      .warmupTicks(100)
      .linkColor(
        () =>
          `#${this.userSettings.applicationColors.communicationColor.getHexString()}`
      )
      .linkDirectionalParticleColor(
        () =>
          `#${this.userSettings.applicationColors.communicationArrowColor.getHexString()}`
      )
      .linkOpacity(0.4)
      .linkThreeObject(this.linkRenderer.createMeshFromLink)
      .linkPositionUpdate(this.linkRenderer.linkPositionUpdate)
      .linkVisibility(this.linkRenderer.isLinkVisible)
      .nodeAutoColorBy('node')
      .cooldownTicks(1)
      .d3Force(
        'collision',
        d3.forceCollide((node: GraphNode) => node.collisionRadius)
      );
    // particles
    // .linkDirectionalParticles("value")
    // .linkDirectionalParticleWidth(0.6)

    // forces
    this.graph.d3Force('collision')!.iterations(2);
    this.graph.d3Force('charge')!.strength(-100 * scale);
    this.applicationRenderer.updateLinks = () => {
      this.graph.graphData().links.forEach((link: GraphLink) => {
        // eslint-disable-next-line no-underscore-dangle
        const lineObj = link.__lineObj;
        if (!lineObj) return;
        this.linkRenderer.linkPositionUpdate(lineObj, {}, link);
      });
    };
    this.graph.scale.setScalar(scale);
  }

  tick() {
    this.graph.tickFrame();
    this.calculateBoundingBox();
  }
  /**
   * Calculates the bounding box of the graph using the position and collision radius of the nodes
   */
  calculateBoundingBox() {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    const isAlone = this.graph.graphData().nodes.length == 1;

    this.graph.graphData().nodes.forEach((node) => {
      if (
        node.x !== undefined &&
        node.y !== undefined &&
        node.z !== undefined
      ) {
        let collisionRadius: number;
        if (!isAlone) {
          collisionRadius = node.collisionRadius / 4 || 0;
        } else {
          collisionRadius = node.collisionRadius / 2 || 0;
        }

        if (node.x - collisionRadius < minX) minX = node.x - collisionRadius;
        if (node.y - collisionRadius < minY) minY = node.y - collisionRadius;
        if (node.z - collisionRadius < minZ) minZ = node.z - collisionRadius;
        if (node.x + collisionRadius > maxX) maxX = node.x + collisionRadius;
        if (node.y + collisionRadius > maxY) maxY = node.y + collisionRadius;
        if (node.z + collisionRadius > maxZ) maxZ = node.z + collisionRadius;
      }
    });

    this.boundingBox = new THREE.Box3(
      new THREE.Vector3(
        minX / this.scaleFactor,
        minY / this.scaleFactor,
        minZ / this.scaleFactor
      ),
      new THREE.Vector3(
        maxX / this.scaleFactor,
        maxY / this.scaleFactor,
        maxZ / this.scaleFactor
      )
    );
  }
}
