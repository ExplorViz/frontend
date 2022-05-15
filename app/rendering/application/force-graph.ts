import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
// @ts-ignore
import * as d3 from 'd3-force-3d';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { linkPositionUpdate } from 'explorviz-frontend/utils/link-helper';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ThreeForceGraph from 'three-forcegraph';

interface GraphNode {
  data: ApplicationData,
  id: string,
  index: number,
  x: number,
  y: number,
  z: number,
  __threeObj: ApplicationObject3D,
}

export interface GraphLink {
  source: GraphNode,
  target: GraphNode,
  value: number,
  communicationData: DrawableClassCommunication,
  __curve: any,
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

  constructor(owner: any) {
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
    this.graph = new ThreeForceGraph()
      .nodeThreeObject(({ id, data, fy }) => this.applicationRenderer.addApplicationData(data))
      .numDimensions(3)
      // .dagMode('lr')
      // .dagMode('radialin')
      // .dagLevelDistance(100)
      .warmupTicks(300)
      .linkDirectionalArrowLength(5.5)
      .linkDirectionalArrowRelPos(0.8)
      .linkColor(() => '#' + this.configuration.landscapeColors.communicationColor.getHexString())
      .linkDirectionalArrowColor(() => '#' + this.configuration.applicationColors.communicationArrowColor.getHexString())
      .linkDirectionalParticleColor(() => '#' + this.configuration.applicationColors.communicationArrowColor.getHexString())
      .linkWidth(1)
      .linkOpacity(1)
      .nodeVal(5)
      .linkCurvature(0.00001) // used as workaround to make particles aware of non-centered start/ end
      // particles
      .linkDirectionalParticles("value")
      .linkDirectionalParticleWidth(1.5)
      .linkDirectionalParticleSpeed(this.particleSpeed)
      .linkPositionUpdate(linkPositionUpdate)

      .d3Force('collision', d3.forceCollide(node => {
        const { x, z } = node.__threeObj.foundationMesh.scale
        return Math.hypot(x, z) / 2 + 3
        // return .width / 2 + 3
      }))
      .d3VelocityDecay(0.8);


    // forces
    this.graph.d3Force('collision')!.iterations(2)
    // graph.d3Force('link').distance(30);
    // graph.d3Force('charge')!.strength(-70)
  }

  tick() {
    this.graph.tickFrame();
  }

  private particleSpeed(link: GraphLink) {
    return Math.sqrt(link.value) * PARTICLE_SPEED_MULTIPLIER;
  }

  // .onNodeClick((node: GraphNode, event: PointerEvent) => {
  //     this.applicationRenderer.openAllComponentsOfAllApplications();
  //     // Aim at node from outside it
  //     const distance = getDistance(node.__threeObj, graph.camera());
  //     this.selectedId = node.id;
  //     // TODO fix label render order, as they are currently slighly transparent
  //     node.__threeObj.setOpacity(0.99)
  //     node.__threeObj.traverse(child => child.renderOrder = 1)

  //     const newPos = node.x || node.y
  //         ? { x: node.x, y: distance + 30, z: node.z + 10 }
  //         : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

  //     // graph.zoomToFit(1500, 10, (xx) => xx.id === node.id);

  //     graph.cameraPosition(
  //         newPos, // new position
  //         node, // lookAt ({ x, y, z })
  //         900  // ms transition duration
  //     );
  // })
  // .onBackgroundClick((event: PointerEvent) => {
  //     if (this.selectedId) {
  //         const node = graph.graphData().nodes.findBy('id', this.selectedId);
  //         node!.__threeObj.setOpacity(1)
  //         // node!.__threeObj.children.forEach(child => child.renderOrder = 0)
  //         node!.__threeObj.traverse(child => child.renderOrder = 0)
  //         this.selectedId = null;
  //     }
  // })
  // .onEngineTick(() => {
  //     // workaroud because DAG mode overwrites the fy value of the graph node data
  //     graph.graphData().nodes.forEach((node) => {
  //         if (node.id === this.selectedId) {
  //             node.fy = 20;
  //         } else {
  //             node.fy = 0;
  //         }
  //     })
  // })
  // .cooldownTicks(1)

}
