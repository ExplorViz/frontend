import { action } from '@ember/object';
import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
// @ts-ignore
import * as d3 from 'd3-force-3d';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import applyCommunicationLayout from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import { linkPositionUpdate } from 'explorviz-frontend/utils/link-helper';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import ThreeForceGraph from 'three-forcegraph';
import THREE, { Vector2, Vector3 } from 'three';
import CommunicationLayout from 'explorviz-frontend/view-objects/layout-models/communication-layout';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import AppCommunicationMesh from 'explorviz-frontend/view-objects/3d/landscape/app-communication-mesh';

export interface GraphNode {
  // data: ApplicationData,
  id: string,
  index: number,
  collisionRadius: number,
  x: number,
  y: number,
  z: number,
  fx: number,
  fy: number,
  fz: number,
  __threeObj: ApplicationObject3D,
}

export interface GraphLink {
  source: GraphNode,
  target: GraphNode,
  value: number,
  communicationData: DrawableClassCommunication,
  __curve: any,
  __lineObj: ClazzCommunicationMesh;
}

const PARTICLE_SPEED_MULTIPLIER = 0.001;

export default class ForceGraph {

  debug = debugLogger('ForceGraph');

  graph: ThreeForceGraph;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('configuration')
  configuration!: Configuration;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  constructor(owner: any) {
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
    this.graph = new ThreeForceGraph()
      .nodeThreeObject(({ id }) => this.applicationRenderer.getApplicationById(id)!)
      .numDimensions(3)
      // .dagMode('lr')
      // .dagMode('radialin')
      // .dagLevelDistance(100)
      .warmupTicks(100)
      .linkColor(() => '#' + this.configuration.landscapeColors.communicationColor.getHexString())
      // .linkDirectionalArrowColor(() => '#' + this.configuration.applicationColors.communicationArrowColor.getHexString())
      .linkDirectionalParticleColor(() => '#' + this.configuration.applicationColors.communicationArrowColor.getHexString())
      .linkWidth(0.5)
      .linkOpacity(0.4)
      .nodeVal(5)
      // .linkThreeObjectExtend(true)
      .linkThreeObject(this.linkRenderer.getLink)
      .linkCurvature(0.0001) // used as workaround to make particles aware of non-centered start/ end
      // particles
      .linkDirectionalParticles("value")
      .linkDirectionalParticleWidth(0.6)
      .linkDirectionalParticleSpeed(this.particleSpeed)
      .linkPositionUpdate(this.linkRenderer.linkPositionUpdate)
      .linkVisibility("communicationData")
      // .linkVisibility(this.linkVisibility)
      .nodeAutoColorBy("node")

      .cooldownTicks(1)
      .d3Force('collision', d3.forceCollide((node: GraphNode) => node.collisionRadius));
    // .d3Force('y', d3.forceY(0))
    // .d3VelocityDecay(0.3);


    // forces
    this.graph.d3Force('collision')!.iterations(1)
    // this.graph.d3Force('y')!.strength(1)
    // this.graph.d3Force('link')!.distance(30);
    // this.graph.d3Force('link')!.strength(3);
    this.graph.d3Force('charge')!.strength(-100);
    // this.graph.d3Force('charge')!.distanceMax(90);
    //
    this.applicationRenderer.updateLinks = () => {
      this.graph.graphData().links.forEach((link: GraphLink) => {
        const lineObj = link.__lineObj;
        if (!lineObj) return;
        this.linkRenderer.linkPositionUpdate(lineObj, {}, link);
      });
    }
  }

  tick() {
    this.graph.tickFrame();
  }

  private particleSpeed(link: GraphLink) {
    return Math.sqrt(link.value) * PARTICLE_SPEED_MULTIPLIER;
  }
}
