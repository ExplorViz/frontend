import { ForceGraph3DInstance } from '3d-force-graph';
import { inject as service } from '@ember/service';
import { task, all } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import ApplicationData, { K8sData } from 'react-lib/src/utils/application-data';
import computeClassCommunication, {
  computeRestructuredClassCommunication,
} from 'react-lib/src/utils/application-rendering/class-communication-computer';
import { calculateLineThickness } from 'react-lib/src/utils/application-rendering/communication-layouter';
import calculateHeatmap from 'react-lib/src/utils/calculate-heatmap';
import {
  Application,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import DetachedMenuRenderer from 'explorviz-frontend/services/extended-reality/detached-menu-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import UserSettings from 'explorviz-frontend/services/user-settings';
import RoomSerializer from 'explorviz-frontend/services/collaboration/room-serializer';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
// import SceneRepository from 'explorviz-frontend/services/repos/scene-repository'; not being used
// import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
// import FontRepository from 'explorviz-frontend/services/repos/font-repository';
import { useFontRepositoryStore } from 'react-lib/src/stores/repos/font-repository';
import { Object3D } from 'three';
import visualizeK8sLandscape from 'explorviz-frontend/utils/k8s-landscape-visualization-assembler';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';

interface NamedArgs {
  readonly landscapeData: LandscapeData | null;
  readonly graph: ForceGraph3DInstance;
}

interface Args {
  positional: [];
  named: NamedArgs;
}

export default class LandscapeDataWatcherModifier extends Modifier<Args> {
  debug = debugLogger('LandscapeDataWatcherModifier');

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('extended-reality/detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('configuration')
  configuration!: Configuration;

  @service('collaboration/room-serializer')
  roomSerializer!: RoomSerializer;

  @service('heatmap/heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('user-settings')
  userSettings!: UserSettings;

  // @service('repos/scene-repository')
  // sceneRepo!: SceneRepository;

  // @service('repos/font-repository')
  // fontRepo!: FontRepository;

  @service
  private worker!: any;

  private landscapeData!: LandscapeData;

  private graph!: ForceGraph3DInstance;

  get structureLandscapeData(): StructureLandscapeData | null {
    return this.landscapeData?.structureLandscapeData;
  }

  get dynamicLandscapeData(): DynamicLandscapeData | null {
    return this.landscapeData?.dynamicLandscapeData;
  }

  async modify(
    _element: any,
    _positionalArgs: any[],
    { landscapeData, graph }: any
  ) {
    this.landscapeData = landscapeData;
    this.graph = graph.graph;
    this.handleUpdatedLandscapeData.perform();
  }

  handleUpdatedLandscapeData = task({ restartable: true }, async () => {
    await Promise.resolve();
    if (!this.structureLandscapeData || !this.dynamicLandscapeData) {
      return;
    }

    this.debug('Update Visualization');

    // ToDo: This can take quite some time. Optimize.
    let classCommunications = computeClassCommunication(
      this.structureLandscapeData,
      this.dynamicLandscapeData
    );

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
    const { nodes, k8sNodes } = this.structureLandscapeData;

    const allAppsInNodes = [
      ...nodes.flatMap((n) => n.applications),
      ...k8sNodes
        .flatMap((n) => n.k8sNamespaces)
        .flatMap((ns) => ns.k8sDeployments)
        .flatMap((d) => d.k8sPods)
        .flatMap((p) => p.applications),
    ];

    // Filter out any nodes that are no longer present in the new landscape data
    graphNodes = graphNodes.filter((node: GraphNode) => {
      const appears = allAppsInNodes.some((n) => n.id === node.id);

      if (!appears) {
        // also delete from application renderer so it can be rerendered if it existent again
        this.applicationRenderer.removeApplicationLocallyById(node.id);
      }
      return appears;
    });

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const applicationData = await this.updateApplicationData.perform(
          application,
          null,
          classCommunications
        );

        // create or update applicationObject3D
        const app =
          await this.applicationRenderer.addApplicationTask.perform(
            applicationData
          );

        // fix previously existing nodes to position (if present) and calculate collision size
        const graphNode = graphNodes.find(
          (node) => node.id === applicationData.application.id
        ) as GraphNode;

        if (!app.foundationMesh) {
          console.error('No foundation mesh, this should not happen');
          return;
        }

        const { x, z } = app.foundationMesh.scale;
        const collisionRadius = Math.hypot(x, z) / 2 + 3;
        if (graphNode) {
          graphNode.collisionRadius = collisionRadius;
          //graphNode.fx = graphNode.x;
          //graphNode.fz = graphNode.z;
        } else {
          graphNodes.push({
            id: applicationData.application.id,
            fy: 0,
            collisionRadius,
            __threeObj: app as Object3D,
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

    const k8sApps = this.landscapeData.structureLandscapeData.k8sNodes.flatMap(
      (n) =>
        n.k8sNamespaces.flatMap((ns) =>
          ns.k8sDeployments.flatMap((d) =>
            d.k8sPods.flatMap((p) =>
              p.applications.map((app) => {
                return {
                  k8sNode: n,
                  k8sNamespace: ns,
                  k8sDeployment: d,
                  k8sPod: p,
                  app: app,
                };
              })
            )
          )
        )
    );

    // add k8sApps
    const promises = k8sApps.map(async (k8sApp) => {
      const applicationData = await this.updateApplicationData.perform(
        k8sApp.app,
        {
          k8sNode: k8sApp.k8sNode.name,
          k8sNamespace: k8sApp.k8sNamespace.name,
          k8sDeployment: k8sApp.k8sDeployment.name,
          k8sPod: k8sApp.k8sPod.name,
        },
        classCommunications
      );

      const app =
        await this.applicationRenderer.addApplicationTask.perform(
          applicationData
        );

      // fix previously existing nodes to position (if present) and calculate collision size
      const graphNode = graphNodes.find(
        (node) => node.id === applicationData.application.id
      ) as GraphNode;

      if (!app.foundationMesh) {
        console.error('No foundation mesh, this should not happen');
        return;
      }

      const { x, z } = app.foundationMesh.scale;
      const collisionRadius = Math.hypot(x, z) / 2 + 3;
      if (graphNode) {
        graphNode.collisionRadius = collisionRadius;
        // graphNode.fx = graphNode.x;
        // graphNode.fz = graphNode.z;
      } else {
        graphNodes.push({
          id: applicationData.application.id,
          x: 0, // without this property, the arrows will not be displayed
          collisionRadius,
          __threeObj: app as Object3D,
        } as GraphNode);
      }

      return app;
    });

    const apps = (await Promise.all(promises)) as ApplicationObject3D[];

    const baseParams = {
      font: useFontRepositoryStore.getState().font,
    };
    const rootParents = visualizeK8sLandscape(
      this.landscapeData.structureLandscapeData.k8sNodes,
      baseParams,
      (app) => {
        return apps.find(
          (a) => a.dataModel.application.id === app.id
        ) as ApplicationObject3D;
      }
    );

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
      nodes: [
        ...rootParents.map((p) => {
          const d = p.dimensions;
          const collisionRadius = Math.hypot(d.x, d.z) / 2 + 3;
          return {
            __threeObj: p,
            fy: 0, // positions all nodes on the same height
            collisionRadius,
          };
        }),
        ...graphNodes.filter((n) => !apps.includes((n as any).__threeObj)),
      ],
      links: [...communicationLinks, ...nodeLinks],
    };

    const { serializedRoom } = this.roomSerializer;

    // Apply serialized room data from collaboration service if it seems up-to-date
    if (
      serializedRoom &&
      serializedRoom.openApps.length >=
        useApplicationRepositoryStore.getState().applications.size
    ) {
      this.applicationRenderer.restoreFromSerialization(serializedRoom);
      this.detachedMenuRenderer.restore(
        serializedRoom.popups,
        serializedRoom.detachedMenus
      );
      this.detachedMenuRenderer.restoreAnnotations(serializedRoom.annotations!);
      this.roomSerializer.serializedRoom = undefined;
    } else {
      // Remove possibly oudated applications
      // ToDo: Refactor
      const openApplicationsIds = this.applicationRenderer.openApplicationIds;
      for (let i = 0; i < openApplicationsIds.length; ++i) {
        const applicationId = openApplicationsIds[i];
        const applicationData = useApplicationRepositoryStore
          .getState()
          .getById(applicationId);
        if (!applicationData) {
          this.applicationRenderer.removeApplicationLocallyById(applicationId);
        }
      }
      this.highlightingService.updateHighlighting();
    }

    this.graph.graphData(gData);

    // Send new data to ide
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
      k8sData: K8sData | null,
      classCommunication: ClassCommunication[]
    ) => {
      const workerPayload = {
        structure: application,
        dynamic: this.dynamicLandscapeData,
      };

      const cityLayout = this.worker.postMessage(
        'city-layouter',
        workerPayload
      );

      const flatData = this.worker.postMessage(
        'flat-data-worker',
        workerPayload
      );

      const results = (await all([cityLayout, flatData])) as any[];

      let applicationData = useApplicationRepositoryStore
        .getState()
        .getById(application.id);
      if (applicationData) {
        applicationData.updateApplication(application, results[0], results[1]);
      } else {
        applicationData = new ApplicationData(
          application,
          results[0],
          results[1],
          k8sData
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

      if (
        this.userSettings.applicationSettings.heatmapEnabled &&
        this.heatmapConf.currentApplication?.dataModel.application.id ===
          application.id
      ) {
        calculateHeatmap(
          applicationData.applicationMetrics,
          await this.worker.postMessage('metrics-worker', workerPayload)
        );
      }

      this.applicationRepo.add(applicationData);

      return applicationData;
    }
  );
}
