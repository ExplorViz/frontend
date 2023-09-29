import { ForceGraph3DInstance } from '3d-force-graph';
import { inject as service } from '@ember/service';
import { task, all } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import computeAggregatedClassCommunication, {
  computeRestructuredClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { calculateLineThickness } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import DetachedMenuRenderer from 'virtual-reality/services/detached-menu-renderer';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import LocalUser from 'collaborative-mode/services/local-user';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';

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

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  @service('local-user')
  localUser!: LocalUser;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

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

  async modify(
    _element: any,
    _positionalArgs: any[],
    { landscapeData, graph }: any
  ) {
    this.landscapeData = landscapeData;
    this.graph = graph;
    this.handleUpdatedLandscapeData.perform();
  }

  handleUpdatedLandscapeData = task({ restartable: true }, async () => {
    await Promise.resolve();
    let aggregatedClassCommunications = computeAggregatedClassCommunication(
      this.structureLandscapeData,
      this.dynamicLandscapeData
    );

    if (this.landscapeRestructure.restructureMode) {
      aggregatedClassCommunications = computeRestructuredClassCommunication(
        aggregatedClassCommunications,
        this.landscapeRestructure.createdClassCommunication,
        this.landscapeRestructure.copiedClassCommunications,
        this.landscapeRestructure.updatedClassCommunications,
        this.landscapeRestructure.completelyDeletedClassCommunications
      );
    }

    this.landscapeRestructure.allClassCommunications =
      aggregatedClassCommunications;
    this.applicationRepo.allClassCommunications = aggregatedClassCommunications;

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    const { nodes: graphNodes } = this.graph.graphData();
    const { nodes } = this.structureLandscapeData;

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const applicationData = await this.updateApplicationData.perform(
          application,
          aggregatedClassCommunications
        );

        // create or update applicationObject3D
        const app =
          await this.applicationRenderer.addApplicationTask.perform(
            applicationData
          );

        // fix previously existing nodes to position (if present) and calculate collision size
        const graphNode = graphNodes.findBy(
          'id',
          applicationData.application.id
        ) as GraphNode;

        if (!app.foundationMesh) {
          console.error('No foundation mesh, this should not happen');
          return;
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

    // Apply restructure textures in restructure mode
    this.landscapeRestructure.applyTextureMappings();

    const interAppCommunications = aggregatedClassCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    const communicationLinks = interAppCommunications.map((communication) => ({
      source: graphNodes.findBy('id', communication.sourceApp?.id) as GraphNode,
      target: graphNodes.findBy('id', communication.targetApp?.id) as GraphNode,
      value: calculateLineThickness(communication),
      communicationData: communication,
    }));

    const gData = {
      nodes: graphNodes,
      links: [...communicationLinks, ...nodeLinks],
    };

    const { serializedRoom } = this.roomSerializer;

    if (serializedRoom) {
      this.applicationRenderer.restoreFromSerialization(serializedRoom);

      if (this.localUser.visualizationMode === 'vr') {
        this.detachedMenuRenderer.restore(serializedRoom.detachedMenus);
      } else if (this.localUser.visualizationMode === 'browser') {
        //restore(serializedRoom.detachedMenus); // browser popups not restorable?
      }

      this.roomSerializer.serializedRoom = undefined;
    } else {
      const openApplicationsIds = this.applicationRenderer.openApplicationIds;
      for (let i = 0; i < openApplicationsIds.length; ++i) {
        const applicationId = openApplicationsIds[i];
        const applicationData = this.applicationRepo.getById(applicationId);
        if (!applicationData) {
          this.applicationRenderer.removeApplicationLocallyById(applicationId);
        }
      }
      this.highlightingService.updateHighlighting();
    }
    this.graph.graphData(gData);

    // send new data to ide
    const cls: CommunicationLink[] = [];
    communicationLinks.forEach((element) => {
      const meshIDs = element.communicationData.id.split('_');
      const tempCL: CommunicationLink = {
        meshID: element.communicationData.id,
        sourceMeshID: meshIDs[0],
        targetMeshID: meshIDs[1],
        methodName: meshIDs[2],
      };
      cls.push(tempCL);
    });
    this.ideWebsocketFacade.refreshVizData(cls);

    // apply new color for restructured communications in restructure mode
    this.landscapeRestructure.applyColorMappings();
  });

  updateApplicationData = task(
    async (
      application: Application,
      aggregatedClassCommunication: AggregatedClassCommunication[]
    ) => {
      const workerPayload = {
        structure: application,
        dynamic: this.dynamicLandscapeData,
      };
      const cityLayout = this.worker.postMessage(
        'city-layouter',
        workerPayload
      );
      const heatmapMetrics = this.worker.postMessage(
        'metrics-worker',
        workerPayload
      );

      const flatData = this.worker.postMessage(
        'flat-data-worker',
        workerPayload
      );

      const results = (await all([
        cityLayout,
        heatmapMetrics,
        flatData,
      ])) as any[];

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
      applicationData.aggregatedClassCommunications =
        aggregatedClassCommunication;
      calculateHeatmap(applicationData.heatmapData, results[1]);
      this.applicationRepo.add(applicationData);
      return applicationData;
    }
  );
}
