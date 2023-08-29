import type ThreeForceGraph from 'three-forcegraph';
import type { GraphData } from 'three-forcegraph';
import type Owner from '@ember/owner';
import type { Updatable } from 'explorviz-frontend/rendering/application/rendering-loop';
import type { LocalLandscapeData } from 'explorviz-frontend/services/landscape-data-service';

import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import ForceGraph, {
  type GraphNode,
} from 'explorviz-frontend/rendering/application/force-graph';
import { defaultScene } from 'explorviz-frontend/utils/scene';
import { calculatePipeSize } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import debugLogger from 'ember-debug-logger';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import calculateCommunications from 'explorviz-frontend/utils/calculate-communications';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';

const debug = debugLogger('LandscapeScene3D');

export default class LandscapeScene3D implements Updatable {
  private readonly forceGraph: ForceGraph;
  readonly threeScene: THREE.Scene;

  @service
  private readonly worker!: EmberWebWorker;

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  constructor(owner: Owner) {
    setOwner(this, owner);
    this.threeScene = defaultScene();
    this.forceGraph = new ForceGraph(owner, 0.02);
    this.threeScene.add(this.forceGraph.graph);
  }

  get graph(): ThreeForceGraph {
    return this.forceGraph.graph;
  }

  isGraphEmpty() {
    return this.forceGraph.graph.graphData().nodes.length === 0;
  }

  async updateData(
    data: LocalLandscapeData,
    applicationRenderer: ApplicationRenderer
  ): Promise<CommunicationLink[]> {
    console.log('updateData called');

    if (!data.drawableClassCommunications) {
      return []; // TODO
    }

    const drawableClassCommunications = data.drawableClassCommunications;

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    const { nodes: graphNodes } = this.graph.graphData();
    const nodes = data.structure?.nodes ?? [];

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        // TODO tiwe: do these in parallel?
        const applicationData = await this.updateApplicationData(
          application,
          data.dynamic!,
          drawableClassCommunications
        );

        // create or update applicationObject3D
        const app =
          await applicationRenderer.addApplicationTask.perform(applicationData);

        // fix previously existing nodes to position (if present) and calculate collision size
        const graphNode = graphNodes.findBy(
          'id',
          applicationData.application.id
        ) as GraphNode;

        if (!app.foundationMesh) {
          throw new Error('No foundation mesh, this should not happen');
        }

        const { x, z } = app.foundationMesh.scale;
        const collisionRadius = Math.hypot(x, z) / 2 + 3;
        if (graphNode) {
          graphNode.collisionRadius = collisionRadius;
          graphNode.fx = graphNode.x;
          graphNode.fz = graphNode.z;
        } else {
          graphNodes.push({
            id: applicationData.application.id,
            fy: 0,
            collisionRadius,
          } as GraphNode);
        }

        // create (invisible) links between apps on the same node
        node.applications.forEach((nodeApp) => {
          if (nodeApp.id !== application.id) {
            nodeLinks.push({
              source: application.id,
              target: nodeApp.id,
              value: 1, // used for particles
            });
          }
        });
      }
    }

    const interAppCommunications = drawableClassCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    const pipeSizeMap = calculatePipeSize(drawableClassCommunications);
    const communicationLinks = interAppCommunications.map((communication) => ({
      source: graphNodes.findBy('id', communication.sourceApp?.id) as GraphNode,
      target: graphNodes.findBy('id', communication.targetApp?.id) as GraphNode,
      value: pipeSizeMap.get(communication.id), // used for particles
      communicationData: communication,
    }));

    const gData = {
      nodes: graphNodes,
      links: [...communicationLinks, ...nodeLinks],
    };

    // TODO serialized room stuff & AR:removeApplicationLocallyById

    this.setGraphData(gData);

    return communicationLinks;
  }

  // TODO tiwe: remove?
  tick() {
    this.forceGraph.tick();
  }

  private setGraphData(data: GraphData): void {
    this.forceGraph.graph.graphData(data);
  }

  private async updateApplicationData(
    application: Application,
    dynamicData: DynamicLandscapeData,
    drawableClassCommunications: DrawableClassCommunication[]
  ): Promise<ApplicationData> {
    const workerPayload = {
      structure: application,
      dynamic: dynamicData,
    };
    const cityLayout = this.worker.postMessage('city-layouter', workerPayload);
    const heatmapMetrics = this.worker.postMessage(
      'metrics-worker',
      workerPayload
    );

    const flatData = this.worker.postMessage('flat-data-worker', workerPayload);

    const results = await Promise.all([cityLayout, heatmapMetrics, flatData]);

    let applicationData = this.applicationRepo.getById(application.id);
    if (applicationData) {
      applicationData.updateApplication(application, results[0], results[2]);
    } else {
      applicationData = new ApplicationData(
        application,
        results[0],
        results[2]
      );
    }
    applicationData.drawableClassCommunications = calculateCommunications(
      applicationData.application,
      drawableClassCommunications
    );
    calculateHeatmap(applicationData.heatmapData, results[1]);
    this.applicationRepo.add(applicationData);
    return applicationData;
  }
}

type CommunicationLink = {
  source: GraphNode;
  target: GraphNode;
  value: number | undefined;
  communicationData: DrawableClassCommunication;
};

type EmberWebWorker = {
  postMessage(workerName: string, payload: any): Promise<any>;
};
