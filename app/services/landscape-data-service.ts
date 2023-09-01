import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import * as Comlink from 'comlink';
import { LandscapeDataWorkerAPI } from 'workers/landscape-data-worker';
import type LandscapeTokenService from './landscape-token';
import type Auth from './auth';
import ENV from 'explorviz-frontend/config/environment';
import type { DataUpdate } from 'workers/landscape-data-worker/LandscapeDataContext';
import type { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import type TimestampRepository from './repos/timestamp-repository';
import type ApplicationRenderer from './application-renderer';
import type { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import type { NewTimestampPayload } from './repos/timestamp-repository';

const intervalInSeconds = 10;
const webWorkersPath = 'assets/web-workers/';

export const LandscapeDataUpdateEventName = 'LandscapeDataUpdate';
export const NewTimestampEventName = 'NewTimestamp';

export default class LandscapeDataService extends Service.extend(Evented) {
  private readonly latestData: LocalLandscapeData = {};

  private worker: Worker | undefined;
  private readonly comlinkRemote: Promise<
    Comlink.Remote<LandscapeDataWorkerAPI>
  >;
  private interval: number | undefined;

  @service('auth') auth!: Auth;
  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;
  @service('application-renderer') applicationRenderer!: ApplicationRenderer;

  constructor() {
    super(...arguments);

    this.comlinkRemote = this.createWorkerAndRemote().then(
      ([worker, remote]) => {
        this.worker = worker;
        return remote;
      }
    );
  }

  startPolling(): void {
    if (this.interval !== undefined) {
      throw new Error('Polling already started.');
    }

    setTimeout(() => this.updateLocalData(), 0);

    // TODO tiwe: ENV.mode.tokenToShow
    this.interval = setInterval(
      () => this.updateLocalData(),
      1000 * intervalInSeconds
    ) as unknown as number;
  }

  stopPolling(): void {
    if (this.interval === undefined) {
      return;
    }
    clearInterval(this.interval);
    this.interval = undefined;
  }

  getLatest(): Readonly<LocalLandscapeData> {
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

    const remote = await this.comlinkRemote;

    return remote.getDataUpdate(
      landscapeToken.value,
      endTime,
      this.auth.accessToken
    );
  }

  private async handleUpdate(update: DataUpdate) {
    this.latestData.dynamic = update.dynamic;
    this.latestData.structure = update.structure;

    this.trigger(NewTimestampEventName, {
      token: update.token,
      timestamp: update.timestamp,
    } as NewTimestampPayload);

    if (update.drawableClassCommunications) {
      this.latestData.drawableClassCommunications =
        update.drawableClassCommunications;
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
    const worker = new Worker(resolveWorkerUrl('landscape-data-worker.js'), {
      name: 'Landscape Data Worker',
    });
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

  willDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
    }
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    super.willDestroy();
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
