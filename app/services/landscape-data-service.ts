import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import * as Comlink from 'comlink';
import { LandscapeDataWorkerAPI } from 'workers/landscape-data-worker';
import debugLogger from 'ember-debug-logger';
import type LandscapeTokenService from './landscape-token';
import type Auth from './auth';
import ENV from 'explorviz-frontend/config/environment';
import type { DataUpdate } from 'workers/landscape-data-worker/LandscapeDataContext';
import type { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import type TimestampRepository from './repos/timestamp-repository';
import type ApplicationRenderer from './application-renderer';
import type { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';

const intervalInSeconds = 10;
const webWorkersPath = 'assets/web-workers/';
export const LandscapeDataUpdateEventName = 'LandscapeDataUpdate';
const debug = debugLogger('LandscapeDataService');

export default class LandscapeDataService extends Service.extend(Evented) {
  private readonly latestData: LocalLandscapeData = {};

  private worker: Worker | undefined;
  private comlinkRemote: Comlink.Remote<LandscapeDataWorkerAPI> | undefined;
  private interval: number | undefined;

  @service('auth') auth!: Auth;
  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;
  @service('application-renderer') applicationRenderer!: ApplicationRenderer;

  async initPolling() {
    const [worker, remote] = await this.createWorkerAndRemote();
    this.worker = worker;
    this.comlinkRemote = remote;

    this.updateLocalData();

    // TODO tiwe: ENV.mode.tokenToShow
    this.interval = setInterval(
      () => this.updateLocalData(),
      1000 * intervalInSeconds
    ) as unknown as number;
  }

  subscribe(dataConsumer: (data: Readonly<LocalLandscapeData>) => unknown) {
    if (this.latestData.drawableClassCommunications) {
      dataConsumer(this.latestData);
    }

    this.on(LandscapeDataUpdateEventName, dataConsumer);
  }

  async stopPolling() {
    if (this.interval === undefined) {
      return;
    }
    clearInterval(this.interval);
    this.interval = undefined;
    // TODO (?)
  }

  getLatest(): LocalLandscapeData {
    return this.latestData;
  }

  /**
   * Loads a landscape from the backend and triggers a visualization update.
   * @param timestamp
   */
  async loadByTimestamp(timestamp: number): Promise<void> {
    const data = await this.fetchData(timestamp);
    await this.handleUpdate(data);
  }

  private async fetchData(
    endTime = Date.now() - 60 * 1000
  ): Promise<DataUpdate> {
    const landscapeToken = this.tokenService.token;
    if (landscapeToken === null) {
      throw new Error('No landscape token.');
    }

    const remote = this.comlinkRemote;
    if (remote === undefined) {
      throw new Error('Not initialized.');
    }

    return remote.poll(landscapeToken.value, endTime, this.auth.accessToken);
  }

  private async handleUpdate(update: DataUpdate) {
    console.log('Update received!', Object.keys(update));

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

    this.trigger(LandscapeDataUpdateEventName, this.latestData);
  }

  private async updateLocalData(endTime = Date.now() - 60 * 1000) {
    const landscapeToken = this.tokenService.token;
    if (landscapeToken === null) {
      return;
    }

    const remote = this.comlinkRemote;
    if (remote === undefined) {
      return;
    }

    const update = await this.fetchData(endTime);
    await this.handleUpdate(update);
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

export type LocalLandscapeData = Partial<{
  structure: StructureLandscapeData;
  dynamic: DynamicLandscapeData;
  drawableClassCommunications: DrawableClassCommunication[];
}>;

declare module '@ember/service' {
  interface Registry {
    'landscape-data-service': LandscapeDataService;
  }
}
