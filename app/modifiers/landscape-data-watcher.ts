import { ForceGraph3DInstance } from '3d-force-graph';
import { inject as service } from '@ember/service';
import { all } from 'ember-concurrency';
import { restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import computeDrawableClassCommunication from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import calculateCommunications from 'explorviz-frontend/utils/calculate-communications';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import computeApplicationCommunication from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';
import DetachedMenuRenderer from 'virtual-reality/services/detached-menu-renderer';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';

interface NamedArgs {
  readonly landscapeData: LandscapeData,
  readonly graph: ForceGraph3DInstance,
}

interface Args {
  positional: [],
  named: NamedArgs,
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

  @service()
  private worker!: any;

  private landscapeData!: LandscapeData;

  private graph!: ForceGraph3DInstance;

  @service('vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  didSetup = false;

  get structureLandscapeData() {
    return this.landscapeData.structureLandscapeData;
  }

  get dynamicLandscapeData() {
    return this.landscapeData.dynamicLandscapeData;
  }

  modify(_element: any, _positionalArgs: any[], { landscapeData, graph }: NamedArgs) {
    this.landscapeData = landscapeData;
    this.graph = graph;

    if (!this.didSetup) {
      this.didSetup = true;
    }

    perform(this.handleUpdatedLandscapeData);
  }

  @restartableTask *
    handleUpdatedLandscapeData() {
    yield Promise.resolve();

    const drawableClassCommunications = computeDrawableClassCommunication(
      this.structureLandscapeData,
      this.dynamicLandscapeData,
    );

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    // const { nodes, links } = this.graph.graphData();
    const gdata = this.graph.graphData();
    const { nodes } = this.structureLandscapeData;
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const workerPayload = {
          structure: application,
          dynamic: this.dynamicLandscapeData,
        };
        const cityLayout = this.worker.postMessage('city-layouter', workerPayload);
        const heatmapMetrics = this.worker.postMessage('metrics-worker', workerPayload);
        const results = (yield all([cityLayout, heatmapMetrics])) as any[];
        let applicationData = this.applicationRepo.getById(application.id);
        if (applicationData) {
          applicationData.updateApplication(application, results[0]);
        } else {
          applicationData = new ApplicationData(application, results[0]);
          gdata.nodes.push({ id: applicationData.application.id, data: applicationData, fy: 0, y: 0 });
        }
        applicationData.drawableClassCommunications = calculateCommunications(
          applicationData.application, drawableClassCommunications,
        );
        calculateHeatmap(applicationData.heatmapData, results[1]);
        this.applicationRepo.add(applicationData);
      }
    }

    const interAppCommunications = drawableClassCommunications.filter(x => x.sourceApp !== x.targetApp)

    const gData = {
      nodes: gdata.nodes,
      links: interAppCommunications.map(communication => ({
        source: communication.sourceApp?.id,
        target: communication.targetApp?.id,
        value: communication.totalRequests, // used for particles
        communicationData: communication
      })),
    };

    this.graph.graphData(gData);

    // this.graph.d3ReheatSimulation();


    //   const { serializedRoom } = this.roomSerializer;
    //   // perform(this.landscapeRenderer.populateLandscape,
    //   //   this.structureLandscapeData, this.dynamicLandscapeData);
    //   if (serializedRoom) {
    //     this.landscapeRenderer.restore(serializedRoom.landscape);
    //     this.applicationRenderer.restore(serializedRoom);
    //     // TODO is it necessary to wait?
    //     this.detachedMenuRenderer.restore(serializedRoom.detachedMenus);
    //     this.roomSerializer.serializedRoom = undefined;
    //   } else {
    //     const openApplicationsIds = this.applicationRenderer.openApplicationIds;
    //     for (let i = 0; i < openApplicationsIds.length; ++i) {
    //       const applicationId = openApplicationsIds[i];
    //       const applicationData = this.applicationRepo.getById(applicationId);
    //       if (applicationData) {
    //         // perform(
    //         //   this.applicationRenderer.addApplicationTask,
    //         //   applicationData,
    //         // );
    //       } else {
    //         this.applicationRenderer.removeApplicationLocally(applicationId);
    //       }
    //     }
    //   }
  }
}
