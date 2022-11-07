import { ForceGraph3DInstance } from '3d-force-graph';
import { inject as service } from '@ember/service';
import { all } from 'ember-concurrency';
import { restartableTask, task } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import computeDrawableClassCommunication, {
  DrawableClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { calculatePipeSize } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import calculateCommunications from 'explorviz-frontend/utils/calculate-communications';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import DetachedMenuRenderer from 'virtual-reality/services/detached-menu-renderer';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';

interface NamedArgs {
  readonly landscapeData: LandscapeData;
  readonly graph: ForceGraph3DInstance;
}

interface Args {
  positional: [];
  named: NamedArgs;
}

export default class LandscapeDataWatcherModifier extends Modifier<Args> {
  debug = debugLogger('ApplicationRendererModifier');

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('configuration')
  configuration!: Configuration;

  @service('virtual-reality@vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service
  private worker!: any;

  private landscapeData!: LandscapeData;

  private graph!: ForceGraph3DInstance;

  get structureLandscapeData() {
    return this.landscapeData.structureLandscapeData;
  }

  get dynamicLandscapeData() {
    return this.landscapeData.dynamicLandscapeData;
  }

  modify(_element: any, _positionalArgs: any[], { landscapeData, graph }: any) {
    this.landscapeData = landscapeData;
    this.graph = graph;

    perform(this.handleUpdatedLandscapeData);
  }

  @restartableTask *handleUpdatedLandscapeData(): Generator<any, any, any> {
    yield Promise.resolve();

    const drawableClassCommunications = computeDrawableClassCommunication(
      this.structureLandscapeData,
      this.dynamicLandscapeData
    );

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    const { nodes: graphNodes } = this.graph.graphData();
    const { nodes } = this.structureLandscapeData;

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const applicationData = yield perform(
          this.updateApplicationData,
          application,
          drawableClassCommunications
        );

        // create or update applicationObject3D
        const app = yield perform(
          this.applicationRenderer.addApplicationTask,
          applicationData
        );

        // fix previously existing nodes to position (if present) and calculate collision size
        const graphNode = graphNodes.findBy(
          'id',
          applicationData.application.id
        ) as GraphNode;

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

    const { serializedRoom } = this.roomSerializer;
    if (serializedRoom) {
      this.applicationRenderer.restore(serializedRoom);
      // TODO is it necessary to wait?
      this.detachedMenuRenderer.restore(serializedRoom.detachedMenus);
      this.roomSerializer.serializedRoom = undefined;
    } else {
      const openApplicationsIds = this.applicationRenderer.openApplicationIds;
      for (let i = 0; i < openApplicationsIds.length; ++i) {
        const applicationId = openApplicationsIds[i];
        const applicationData = this.applicationRepo.getById(applicationId);
        if (!applicationData) {
          this.applicationRenderer.removeApplicationLocally(applicationId);
        }
      }
    }
    this.graph.graphData(gData);
  }

  @task *updateApplicationData(
    application: Application,
    drawableClassCommunications: DrawableClassCommunication[]
  ): Generator<unknown, ApplicationData, unknown> {
    const workerPayload = {
      structure: application,
      dynamic: this.dynamicLandscapeData,
    };
    const cityLayout = this.worker.postMessage('city-layouter', workerPayload);
    const heatmapMetrics = this.worker.postMessage(
      'metrics-worker',
      workerPayload
    );
    const results = (yield all([cityLayout, heatmapMetrics])) as any[];

    let applicationData = this.applicationRepo.getById(application.id);
    if (applicationData) {
      applicationData.updateApplication(application, results[0]);
    } else {
      applicationData = new ApplicationData(application, results[0]);
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
