// @ts-ignore: no types atm
import * as d3 from 'd3-force-3d';
import ApplicationObject3D from '../../view-objects/3d/application/application-object-3d';
import { DrawableClassCommunication } from '../../utils/application-rendering/class-communication-computer';
import ClazzCommunicationMesh from '../../view-objects/3d/application/clazz-communication-mesh';
import ApplicationRenderer from '../../services/application-renderer';
import Configuration from '../../services/configuration';
import LinkRenderer from '../../services/link-renderer';
import ApplicationRepository from '../../services/repos/application-repository';
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

export default class ForceGraph {
  graph: ThreeForceGraph;

  scale: number;

  applicationRenderer!: ApplicationRenderer;

  applicationRepo!: ApplicationRepository;

  configuration!: Configuration;

  linkRenderer!: LinkRenderer;

  constructor(owner: any, scale: number = 1) {
    this.scale = scale;
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    this.graph = new ThreeForceGraph()
      .graphData({ nodes: [], links: [] })
      .nodeThreeObject(
        ({ id }) => this.applicationRenderer.getApplicationById(id as string)!
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
      // TODO
      //.linkThreeObject(this.linkRenderer.createLink)
      //.linkPositionUpdate(this.linkRenderer.linkPositionUpdate)
      //.linkVisibility(this.linkRenderer.linkVisible)
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
    // this.applicationRenderer.updateLinks = () => {
    //   this.graph.graphData().links.forEach((link: any) => {
    //     // eslint-disable-next-line no-underscore-dangle
    //     const lineObj = link.__lineObj;
    //     if (!lineObj) return;
    //     this.linkRenderer.linkPositionUpdate(lineObj, {}, link);
    //   });
    // };
    this.graph.scale.setScalar(scale);
  }

  tick() {
    this.graph.tickFrame();
  }
}
