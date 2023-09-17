import type ThreeForceGraph from 'three-forcegraph';
import type { GraphData } from 'three-forcegraph';
import type Owner from '@ember/owner';
import type { Updatable } from 'explorviz-frontend/rendering/application/rendering-loop';
import type { LocalLandscapeData } from 'explorviz-frontend/services/landscape-data-service';
import type { CommunicationLink } from 'explorviz-frontend/ide/shared';
import type VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import type IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import type DetachedMenuRenderer from 'virtual-reality/services/detached-menu-renderer';
import type ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import type { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';

import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import ForceGraph, {
  type GraphNode,
} from 'explorviz-frontend/rendering/application/force-graph';
import { defaultScene, vrScene } from 'explorviz-frontend/utils/scene';
import { calculatePipeSize } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import type { Object3D } from 'three';
import type { WorkerApplicationData } from 'workers/landscape-data-worker/landscape-data-context';
import type LocalUser from 'collaborative-mode/services/local-user';

export default class LandscapeScene3D implements Updatable {
  private readonly forceGraph: ForceGraph;
  readonly threeScene: THREE.Scene;

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('virtual-reality@vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('local-user')
  localUser!: LocalUser;

  private constructor(owner: Owner, scene: THREE.Scene) {
    setOwner(this, owner);
    this.threeScene = scene;
    this.forceGraph = new ForceGraph(owner, 0.02);
    this.threeScene.add(this.forceGraph.graph);
  }

  static createDefault(
    owner: Owner,
    backgroundColor: THREE.Color | null
  ): LandscapeScene3D {
    const scene = new LandscapeScene3D(owner, defaultScene());
    scene.threeScene.background = backgroundColor;
    return scene;
  }

  static createVR(
    owner: Owner,
    backgroundColor: THREE.Color | null
  ): LandscapeScene3D {
    const scene = new LandscapeScene3D(owner, vrScene());
    scene.threeScene.background = backgroundColor;
    return scene;
  }

  get graph(): ThreeForceGraph {
    return this.forceGraph.graph;
  }

  isGraphEmpty() {
    return this.forceGraph.graph.graphData().nodes.length === 0;
  }

  add(...object: Object3D[]): LandscapeScene3D {
    this.threeScene.add(...object);
    return this;
  }

  async updateData(data: LocalLandscapeData): Promise<void> {
    if (
      !data.drawableClassCommunications ||
      !data.appData ||
      !data.interAppCommunications
    ) {
      console.error('incomplete data', data);
      return;
    }

    const { drawableClassCommunications, interAppCommunications, appData } =
      data;

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    const { nodes: graphNodes } = this.graph.graphData();
    const nodes = data.structure?.nodes ?? [];

    const nodeLinks: any[] = [];
    for (const node of nodes) {
      for (const application of node.applications) {
        const workerData = appData.get(application.id);

        if (workerData === undefined) {
          throw new Error(`No worker data for ${application.id}`);
        }

        const applicationData = this.updateApplicationData(
          application,
          workerData
        );

        // create or update applicationObject3D
        const app = this.applicationRenderer.addApplication(applicationData);

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

    // TODO: This could be moved to the worker as well but has
    //       a small side-effects that has to be removed first.
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
    }

    // This updates the scene:
    this.setGraphData(gData);

    // send new data to ide
    // TODO: consider moving this out of LandscapeScene3D.updateData
    this.ideWebsocketFacade.refreshVizData(
      communicationLinks.map((element) => {
        const meshIDs = element.communicationData.id.split('_');
        const tempCL: CommunicationLink = {
          meshID: element.communicationData.id,
          sourceMeshID: meshIDs[0],
          targetMeshID: meshIDs[1],
          methodName: meshIDs[2],
        };
        return tempCL;
      })
    );
  }

  // TODO tiwe: remove?
  tick() {
    this.forceGraph.tick();
  }

  private setGraphData(data: GraphData): void {
    this.forceGraph.graph.graphData(data);
  }

  private updateApplicationData(
    application: Application,
    data: WorkerApplicationData
  ): ApplicationData {
    let applicationData = this.applicationRepo.getById(application.id);
    if (applicationData) {
      applicationData.updateApplication(application, data);
    } else {
      applicationData = new ApplicationData(application, data);
      this.applicationRepo.add(applicationData);
    }
    applicationData.drawableClassCommunications = data.communication;

    return applicationData;
  }
}
