import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
// @ts-ignore
import * as d3 from 'd3-force-3d';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ThreeForceGraph from 'three-forcegraph';

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
  communicationData: DrawableClassCommunication;
  __curve: any;
  __lineObj: ClazzCommunicationMesh;
}

const PARTICLE_SPEED_MULTIPLIER = 0.001;

export default class ForceGraph {
  debug = debugLogger('ForceGraph');

  graph: ThreeForceGraph;

  scale: number;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('configuration')
  configuration!: Configuration;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  constructor(owner: any, scale: number = 1) {
    this.scale = scale;
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
    this.graph = new ThreeForceGraph()
      .graphData({ nodes: [], links: [] })
      .nodeThreeObject(
        ({ id }) => this.applicationRenderer.getApplicationById(id)!
      )
      .warmupTicks(100)
      .linkColor(
        () =>
          `#${this.configuration.landscapeColors.communicationColor.getHexString()}`
      )
      .linkDirectionalParticleColor(
        () =>
          `#${this.configuration.applicationColors.communicationArrowColor.getHexString()}`
      )
      .linkOpacity(0.4)
      .linkThreeObject(this.linkRenderer.createLink)
      .linkPositionUpdate(this.linkRenderer.linkPositionUpdate)
      .linkVisibility(this.linkRenderer.linkVisible)
      .nodeAutoColorBy('node')
      .cooldownTicks(1)
      .d3Force(
        'collision',
        d3.forceCollide((node: GraphNode) => node.collisionRadius)
      );
    // particles
    // .linkDirectionalParticles("value")
    // .linkDirectionalParticleWidth(0.6)
    // .linkDirectionalParticleSpeed(this.particleSpeed)

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
    this.graph.getGrabId = () => {
      'force-graph-grabbable';
    };
  }

  tick() {
    this.graph.tickFrame();
  }

  private particleSpeed(link: GraphLink) {
    return Math.sqrt(link.value) * PARTICLE_SPEED_MULTIPLIER;
  }
}
