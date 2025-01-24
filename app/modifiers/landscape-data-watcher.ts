import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
// import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData, {
  K8sData,
} from 'explorviz-frontend/utils/application-data';
import computeClassCommunication, {
  computeRestructuredClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
// import { calculateLineThickness } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import {
  Application,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import DetachedMenuRenderer from 'explorviz-frontend/services/extended-reality/detached-menu-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import UserSettings from 'explorviz-frontend/services/user-settings';
import RoomSerializer from 'explorviz-frontend/services/collaboration/room-serializer';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import layoutLandscape from 'explorviz-frontend/utils/elk-layouter';
import SceneRepository from 'explorviz-frontend/services/repos/scene-repository';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import FontRepository from 'explorviz-frontend/services/repos/font-repository';
// import { Object3D } from 'three';
import visualizeK8sLandscape from 'explorviz-frontend/utils/k8s-landscape-visualization-assembler';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import Landscape3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-3d';
import LandscapeModel from 'explorviz-frontend/view-objects/3d/landscape/landscape-model';

interface NamedArgs {
  readonly landscapeData: LandscapeData | null;
  readonly landscape3D: Landscape3D;
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

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('repos/font-repository')
  fontRepo!: FontRepository;

  @service
  private worker!: any;

  private landscapeData!: LandscapeData;

  private landscape3D: Landscape3D | undefined;

  get structureLandscapeData(): StructureLandscapeData | null {
    return this.landscapeData?.structureLandscapeData;
  }

  get dynamicLandscapeData(): DynamicLandscapeData | null {
    return this.landscapeData?.dynamicLandscapeData;
  }

  async modify(
    _element: any,
    _positionalArgs: any[],
    { landscapeData, landscape3D }: any
  ) {
    this.landscapeData = landscapeData;
    this.landscape3D = landscape3D;
    this.handleUpdatedLandscapeData.perform();
  }

  handleUpdatedLandscapeData = task({ restartable: true }, async () => {
    await Promise.resolve();
    const landscape3D = this.landscape3D;
    if (
      !this.structureLandscapeData ||
      !this.dynamicLandscapeData ||
      !landscape3D
    ) {
      return;
    }

    this.debug('Update Visualization');

    // Init computation of layout for applications
    const applications: Application[] = [];
    const { nodes, k8sNodes } = this.structureLandscapeData;
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        applications.push(node.applications[j]);
      }
    }

    const k8sApps = k8sNodes.flatMap((n) =>
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

    // Add kubernetes applications
    // k8sApps.forEach((k8App) => {
    //   applications.push(k8App.app);
    // });

    const boxLayoutMap = await layoutLandscape(k8sNodes, applications);

    // Center landscape
    const landscapeLayout = boxLayoutMap.get('landscape');
    if (landscapeLayout) {
      const landscapeModel = new LandscapeModel(
        this.structureLandscapeData,
        this.dynamicLandscapeData,
        landscapeLayout
      );
      landscape3D.dataModel = landscapeModel;
    }
    if (landscapeLayout && boxLayoutMap.size > 2) {
      landscape3D.position.x =
        (-landscapeLayout.width * landscape3D.scale.x) / 2;
      landscape3D.position.z =
        (-landscapeLayout.depth * landscape3D.scale.z) / 2;
    }

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

    for (let i = 0; i < applications.length; ++i) {
      const application = applications[i];

      const applicationData = await this.updateApplicationData.perform(
        application,
        null,
        classCommunications,
        boxLayoutMap
      );
      // Create or update applicationObject3D

      await this.applicationRenderer.addApplicationTask.perform(
        applicationData
      );
    }

    // Add k8sApps
    const k8sAppPromises = k8sApps.map(async (k8sApp) => {
      const applicationData = await this.updateApplicationData.perform(
        k8sApp.app,
        {
          k8sNode: k8sApp.k8sNode.name,
          k8sNamespace: k8sApp.k8sNamespace.name,
          k8sDeployment: k8sApp.k8sDeployment.name,
          k8sPod: k8sApp.k8sPod.name,
        },
        classCommunications,
        boxLayoutMap
      );

      const app3D =
        await this.applicationRenderer.addApplicationTask.perform(
          applicationData
        );

      if (!app3D.foundationMesh) {
        console.error('No foundation mesh, this should not happen');
        return;
      }

      return app3D;
    });

    const k8sApp3Ds = (await Promise.all(
      k8sAppPromises
    )) as ApplicationObject3D[];

    const k8sParameters = {
      font: this.fontRepo.font,
      colors: this.userSettings.colors,
    };

    const app3Ds = this.applicationRenderer.getOpenApplications();

    app3Ds.forEach((application3D) => {
      landscape3D.add(application3D);
    });

    // const rootParents =
    visualizeK8sLandscape(
      landscape3D,
      this.landscapeData.structureLandscapeData.k8sNodes,
      k8sParameters,
      boxLayoutMap,
      (app) => {
        return k8sApp3Ds.find(
          (a) => a.dataModel.application.id === app.id
        ) as ApplicationObject3D;
      }
    );

    // Apply restructure textures in restructure mode
    this.landscapeRestructure.applyTextureMappings();
    // const communicationLinks = interAppCommunications.map((communication) => ({
    //   source: graphNodes.find(
    //     (node) => node.id == communication.sourceApp?.id
    //   ) as GraphNode,
    //   target: graphNodes.find(
    //     (node) => node.id == communication.targetApp?.id
    //   ) as GraphNode,
    //   value: calculateLineThickness(
    //     communication,
    //     this.userSettings.visualizationSettings
    //   ),
    //   communicationData: communication,
    // }));
    // // const gData = {
    //   nodes: [
    //     ...rootParents.map((p) => {
    //       const d = p.dimensions;
    //       const collisionRadius = Math.hypot(d.x, d.z) / 2 + 3;
    //       return {
    //         __threeObj: p,
    //         fy: 0, // positions all nodes on the same height
    //         collisionRadius,
    //       };
    //     }),
    //     ...graphNodes.filter((n) => !apps.includes((n as any).__threeObj)),
    //   ],
    //   links: [...communicationLinks, ...nodeLinks],
    // };

    // Add communication
    const interAppCommunications = classCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    interAppCommunications.forEach((communication) => {
      const commMesh =
        this.linkRenderer.createMeshFromCommunication(communication);
      if (commMesh) {
        landscape3D.add(commMesh);
        this.linkRenderer.updateLinkPosition(commMesh);
      }
    });

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
      this.detachedMenuRenderer.restoreAnnotations(serializedRoom.annotations!);
      this.roomSerializer.serializedRoom = undefined;
    } else {
      // Remove possibly outdated applications
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

    // TODO: Check if this code is still needed
    // Send new data to ide
    // const cls: CommunicationLink[] = [];
    // communicationLinks.forEach((element) => {
    //   const meshIDs = element.communicationData.id.split('_');
    //   const tempCL: CommunicationLink = {
    //     meshID: element.communicationData.id,
    //     sourceMeshID: meshIDs[0],
    //     targetMeshID: meshIDs[1],
    //     methodName: meshIDs[2],
    //   };
    //   cls.push(tempCL);
    // });
    // this.ideWebsocketFacade.refreshVizData(cls);

    // apply new color for restructured communications in restructure mode
    this.landscapeRestructure.applyColorMappings();

    document.dispatchEvent(new Event('Landscape initialized'));
  });

  updateApplicationData = task(
    async (
      application: Application,
      k8sData: K8sData | null,
      classCommunication: ClassCommunication[],
      boxLayoutMap: any
    ) => {
      const workerPayload = {
        structure: application,
        dynamic: this.dynamicLandscapeData,
      };

      const flatData = await this.worker.postMessage(
        'flat-data-worker',
        workerPayload
      );

      let applicationData = this.applicationRepo.getById(application.id);
      if (applicationData) {
        applicationData.updateApplication(application, boxLayoutMap, flatData);
      } else {
        applicationData = new ApplicationData(
          application,
          boxLayoutMap,
          flatData,
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
        this.userSettings.visualizationSettings.heatmapEnabled &&
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
