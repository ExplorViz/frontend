import { ForceGraph3DInstance } from '3d-force-graph';
import { inject as service } from '@ember/service';
import { task, all } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData, RenderMode, SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import computeClassCommunication, {
  computeRestructuredClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { calculateLineThickness } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import {
  Application,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { Application, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import LocalUser from 'collaboration/services/local-user';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import { DynamicLandscapeData, Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import UserSettings from 'explorviz-frontend/services/user-settings';
import StaticMetricsRepository from 'explorviz-frontend/services/repos/static-metrics-repository';
import RoomSerializer from 'collaboration/services/room-serializer';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';

interface NamedArgs {
  readonly landscapeData: LandscapeData | null;
  readonly graph: ForceGraph3DInstance;
  readonly dynamics: [DynamicLandscapeData?, DynamicLandscapeData?];
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

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

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

  @service('user-settings')
  userSettings!: UserSettings;

  @service('repos/static-metrics-repository')
  staticMetricsRepo!: StaticMetricsRepository;

  @service
  private worker!: any;

  private landscapeData!: LandscapeData;

  private graph!: ForceGraph3DInstance;

  private selectedApplication? : string;

  private selectedCommits?: Map<string,SelectedCommit[]>;

  private dynamicStructure?: StructureLandscapeData;
  private staticStructure?: StructureLandscapeData;
  private renderMode?: RenderMode;
  private dynamics!: [DynamicLandscapeData?, DynamicLandscapeData?];

  get structureLandscapeData(): StructureLandscapeData | null {
    return this.landscapeData?.structureLandscapeData;
  }

  get dynamicLandscapeData(): DynamicLandscapeData | null {
    return this.landscapeData?.dynamicLandscapeData;
  }

  async modify(
    _element: any,
    _positionalArgs: any[],
    { landscapeData, graph, selectedApplication, selectedCommits, dynamicStructure, staticStructure, renderMode, dynamics}: any
  ) {
    this.landscapeData = landscapeData;
    this.graph = graph;
    this.selectedApplication = selectedApplication;
    this.selectedCommits = selectedCommits;
    this.dynamicStructure = dynamicStructure;
    this.staticStructure = staticStructure; 
    this.dynamics = dynamics;
    this.renderMode = renderMode;
    this.handleUpdatedLandscapeData.perform();
  }

  handleUpdatedLandscapeData = task({ restartable: true }, async () => { 

    //console.log("handleUpdatedLandscapeData,, dynamics ---->", this.dynamics);
    await Promise.resolve();
    if (!this.structureLandscapeData || !this.dynamicLandscapeData) {
      return;
    }

    let classCommunications = computeClassCommunication(
      this.structureLandscapeData,
      //this.dynamicLandscapeData,
      [this.dynamics[0], this.dynamics[1]]
    );

    console.log("classCommunications ------>", classCommunications);

    if (this.landscapeRestructure.restructureMode) {
      classCommunications = computeRestructuredClassCommunication(
        classCommunications,
        this.landscapeRestructure.createdClassCommunication,
        this.landscapeRestructure.copiedClassCommunications,
        this.landscapeRestructure.updatedClassCommunications,
        this.landscapeRestructure.completelyDeletedClassCommunications
      );
    }

    this.landscapeRestructure.allClassCommunications = classCommunications;

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    let { nodes: graphNodes } = this.graph.graphData();
    const { nodes } = this.structureLandscapeData;

    // Filter out any nodes that are no longer present in the new landscape data
    graphNodes = graphNodes.filter((node: GraphNode) => {
      return nodes.some((n) => n.applications[0].id === node.id);
    });

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const applicationData = await this.updateApplicationData.perform(
          application,
          classCommunications
        );

        // create or update applicationObject3D
        const app =
          await this.applicationRenderer.addApplicationTask.perform(
            applicationData,
            {},
            this.selectedApplication,
            this.selectedCommits,
            this.staticStructure,
            this.dynamicStructure,
            this.renderMode,
          );

        // fix previously existing nodes to position (if present) and calculate collision size
        const graphNode = graphNodes.find(
          (node) => node.id == applicationData.application.id
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

    const interAppCommunications = classCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    const communicationLinks = interAppCommunications.map((communication) => ({
      source: graphNodes.find(
        (node) => node.id == communication.sourceApp?.id
      ) as GraphNode,
      target: graphNodes.find(
        (node) => node.id == communication.targetApp?.id
      ) as GraphNode,
      value: calculateLineThickness(
        communication,
        this.userSettings.applicationSettings
      ),
      communicationData: communication,
    }));

    const gData = {
      nodes: graphNodes,
      links: [...communicationLinks, ...nodeLinks],
    };

    const { serializedRoom } = this.roomSerializer;

    // Apply serialized room data from collaboration service if it seems up-to-date
    if (
      serializedRoom &&
      serializedRoom.openApps.length >= this.applicationRepo.applications.size
    ) {
      this.applicationRenderer.restoreFromSerialization(serializedRoom);
      this.detachedMenuRenderer.restore(
        serializedRoom.popups,
        serializedRoom.detachedMenus
      );
      this.roomSerializer.serializedRoom = undefined;
    } else {
      // Remove possibly oudated applications
      // ToDo: Refactor
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
      classCommunication: ClassCommunication[]
    ) => {
      const workerPayload = {
        structure: application,
        dynamic: this.dynamicLandscapeData, // note that this combines dynamics[0] and dynamics[1]
      };
  
      const cityLayout = this.worker.postMessage(
        'city-layouter',
        workerPayload
      );

      
      let heatmapMetrics: any[] = [];
      if(application.name === this.selectedApplication) {
        // consider selected commits

        if(this.dynamics) {

          const commitIds = [ this.selectedCommits!.get(this.selectedApplication)![0].commitId,
          this.selectedCommits!.get(this.selectedApplication)![1]?.commitId ];
          const staticMetrics = [this.staticMetricsRepo.getById(this.selectedApplication + commitIds[0]),
          this.staticMetricsRepo.getById(this.selectedApplication + commitIds[1])];

          const workerPayload = {
            structure: application,
            dynamic: this.dynamics,
            commitId: commitIds,
            staticMetrics: staticMetrics
          }

          //console.log("workerPayload: ", workerPayload);

          heatmapMetrics = this.worker.postMessage(
            'metrics-worker',
            workerPayload 
          );

        }else {
          console.log("Error: no dynamic data for first selected commit");
        }
      }else {
        heatmapMetrics = this.worker.postMessage(
          'metrics-worker',
          workerPayload, 
        );
      }

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
        applicationData.updateApplication(application, results[0], results[results.length - 1]);
      } else {
        applicationData = new ApplicationData(
          application,
          results[0],
          results[results.length - 1]
        );
      }


      applicationData.classCommunications = classCommunication.filter(
        (communication) => {
          return (
            communication.sourceApp.id === application.id &&
            communication.targetApp.id === application.id
          );
        }
      );

      calculateHeatmap(applicationData.heatmapData, results[1]);
      this.applicationRepo.add(applicationData);
      return applicationData;
    }
  );
}
