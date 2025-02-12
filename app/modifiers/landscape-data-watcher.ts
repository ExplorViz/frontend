import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData, {
  K8sData,
} from 'explorviz-frontend/utils/application-data';
import computeClassCommunication, {
  computeRestructuredClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import {
  Application,
  getApplicationsFromNodes,
  getK8sAppsFromNodes,
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
import visualizeK8sLandscape from 'explorviz-frontend/utils/k8s-landscape-visualization-assembler';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import Landscape3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-3d';
import LandscapeModel from 'explorviz-frontend/view-objects/3d/landscape/landscape-model';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-cross-communication';

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

    this.debug('Update Landscape Data');

    const { nodes } = this.structureLandscapeData;
    let { k8sNodes } = this.structureLandscapeData;
    k8sNodes = k8sNodes || [];
    const applications = getApplicationsFromNodes(nodes);
    const k8sApps = getK8sAppsFromNodes(k8sNodes);

    // Applications might be removed in evolution mode
    if (applications.length !== this.applicationRepo.applications.size) {
      landscape3D.removeAll();
    }

    const boxLayoutMap = await layoutLandscape(k8sNodes, applications);

    // Set data model for landscape
    const landscapeLayout = boxLayoutMap.get('landscape');
    if (landscapeLayout) {
      landscape3D.dataModel = new LandscapeModel(
        this.structureLandscapeData,
        this.dynamicLandscapeData,
        landscapeLayout
      );
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

    let app3Ds: ApplicationObject3D[] = [];
    // Compute app3Ds which are not part of Kubernetes deployment
    for (let i = 0; i < applications.length; ++i) {
      const applicationData = await this.updateApplicationData.perform(
        applications[i],
        null,
        classCommunications,
        boxLayoutMap
      );

      // Create or update app3D
      const app3D =
        await this.applicationRenderer.addApplicationTask.perform(
          applicationData
        );

      app3Ds.push(app3D);
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

    app3Ds = app3Ds.concat(k8sApp3Ds);
    app3Ds.forEach((application3D) => {
      landscape3D.addApplication(application3D);
    });

    visualizeK8sLandscape(landscape3D, k8sNodes, k8sParameters, boxLayoutMap);

    landscape3D.layoutLandscape(boxLayoutMap);

    // Apply restructure textures in restructure mode
    this.landscapeRestructure.applyTextureMappings();

    // Add inter-app communication
    const interAppCommunications = classCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    interAppCommunications.forEach((communication) => {
      const commMesh =
        this.linkRenderer.createMeshFromCommunication(communication);
      if (commMesh) {
        landscape3D.addCommunication(commMesh);
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
          landscape3D.app3Ds.delete(applicationId);
        }
      }
      this.highlightingService.updateHighlighting();
    }

    // Send new data to ide
    const cls: CommunicationLink[] = [];
    landscape3D.getAllInterAppCommunications().forEach((communication) => {
      const meshIDs = communication.getModelId().split('_');
      const tempCL: CommunicationLink = {
        meshID: communication.getModelId(),
        sourceMeshID: meshIDs[0],
        targetMeshID: meshIDs[1],
        methodName: meshIDs[2],
      };
      cls.push(tempCL);
    });
    this.ideWebsocketFacade.refreshVizData(cls);

    // Apply new color for restructured communications in restructure mode
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
