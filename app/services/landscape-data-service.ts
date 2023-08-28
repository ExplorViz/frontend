import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import * as Comlink from 'comlink';
import { LandscapeDataWorkerAPI } from 'workers/landscape-data-worker';
import debugLogger from 'ember-debug-logger';
import type LandscapeTokenService from './landscape-token';
import type Auth from './auth';
import ENV from 'explorviz-frontend/config/environment';
import type { DataUpdate } from 'workers/landscape-data-worker/LandscapeDataContext';
import type {
  Application,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import type TimestampRepository from './repos/timestamp-repository';
import type ThreeForceGraph from 'three-forcegraph';
import type { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import type ApplicationRenderer from './application-renderer';
import type { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import ApplicationData from 'explorviz-frontend/utils/application-data';

const intervalInSeconds = 10;
const webWorkersPath = 'assets/web-workers/';
export const LandscapeDataUpdateEventName = 'LandscapeDataUpdate';

export default class LandscapeDataService extends Service.extend(Evented) {
  private readonly debug = debugLogger('LandscapeDataService');

  private readonly latestData: LocalData = {};

  private worker: Worker | undefined;
  private comlinkRemote: Comlink.Remote<LandscapeDataWorkerAPI> | undefined;
  private interval: number | undefined;
  private forceGraph: ThreeForceGraph | undefined;

  @service('auth') auth!: Auth;
  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;
  @service('application-renderer') applicationRenderer!: ApplicationRenderer;

  async initPolling() {
    const [worker, remote] = await this.createWorkerAndRemote();
    this.worker = worker;
    this.comlinkRemote = remote;

    this.poll();

    // TODO tiwe: ENV.mode.tokenToShow
    this.interval = setInterval(
      () => this.poll(),
      1000 * intervalInSeconds
    ) as unknown as number;
  }

  async stopPolling() {
    this.debug('Stopping polling interval');
    if (this.interval === undefined) {
      return;
    }
    clearInterval(this.interval);
    this.interval = undefined;
    // TODO (?)
  }

  getLatest(): LocalData {
    return this.latestData;
  }

  async fetchData(timestamp: number): Promise<void> {
    // TODO
  }

  setForceGraph(graph: ThreeForceGraph): void {
    this.forceGraph = graph;
  }

  private async handleUpdate(update: DataUpdate) {
    performance.mark('handleUpdate-start');

    this.debug('Update received!', Object.keys(update));

    this.trigger(LandscapeDataUpdateEventName, update);

    if (update.dynamic) {
      this.latestData.dynamic = update.dynamic;
    }

    if (update.timestamp) {
      this.timestampRepo.addTimestamp(update.token, update.timestamp);
      this.timestampRepo.triggerTimelineUpdate();
    }

    if (update.structure) {
      this.latestData.structure = update.structure;
    }

    if (update.drawableClassCommunications) {
      await this.handleUpdatedLandscapeData(update.drawableClassCommunications);
    }

    performance.mark('handleUpdate-end');
  }

  private async handleUpdatedLandscapeData(
    drawableClassCommunications: DrawableClassCommunication[]
  ) {
    performance.mark('handleUpdatedLandscapeData-start');

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    const { nodes: graphNodes } = this.forceGraph!.graphData();
    const { nodes } = this.latestData.structure!;

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const applicationData = await this.updateApplicationData(
          application,
          drawableClassCommunications
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

    performance.mark('handleUpdatedLandscapeData-end');
  }

  private async updateApplicationData(
    application: Application,
    drawableClassCommunications: DrawableClassCommunication[]
  ): Promise<ApplicationData> {
    // TODO
    throw new Error('Not implemented');
  }

  private async poll(endTime = Date.now() - 60 * 1000) {
    const landscapeToken = this.tokenService.token;
    if (landscapeToken === null) {
      return;
    }

    const remote = this.comlinkRemote;
    if (remote === undefined) {
      return;
    }

    const update = await remote.poll(
      landscapeToken.value,
      endTime,
      this.auth.accessToken
    );

    this.handleUpdate(update);
  }

  private async createWorkerAndRemote(): Promise<
    [Worker, Comlink.Remote<LandscapeDataWorkerAPI>]
  > {
    const worker = new Worker(resolveWorkerUrl('landscape-data-worker.js'));
    const remote = Comlink.wrap<LandscapeDataWorkerAPI>(worker);

    const { landscapeService, traceService } = ENV.backendAddresses;

    await remote.init({
      updateIntervalInMS: 1000 * intervalInSeconds,
      backend: {
        landscapeUrl: landscapeService,
        tracesUrl: traceService,
      },
    });

    this.debug('landscape-data-worker.js initialized.');

    return [worker, remote];
  }

  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.comlinkRemote = undefined;
    }
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}

function resolveWorkerUrl(worker: string): string {
  // TODO assetMap?
  // https://github.com/BBVAEngineering/ember-web-workers/blob/dbb3bab974383fc053c8e4d9486259260b9d4b00/addon/services/worker.js#L86
  return `${webWorkersPath}${worker}`;
}

type LocalData = Partial<{
  structure: StructureLandscapeData;
  dynamic: DynamicLandscapeData;
  drawableClassCommunication: DrawableClassCommunication[];
}>;

declare module '@ember/service' {
  interface Registry {
    'landscape-data-service': LandscapeDataService;
  }
}
