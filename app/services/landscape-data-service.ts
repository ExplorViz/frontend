import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import type LandscapeTokenService from './landscape-token';
import type Auth from './auth';
import type { DataUpdate } from 'workers/landscape-data-worker/LandscapeDataContext';
import type { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import type TimestampRepository from './repos/timestamp-repository';
import type ApplicationRenderer from './application-renderer';
import type { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import type { NewTimestampPayload } from './repos/timestamp-repository';
import type WorkerService from './worker-service';

export const DataUpdateIntervalInSeconds = 10;
export const LandscapeDataUpdateEventName = 'LandscapeDataUpdate';
export const NewTimestampEventName = 'NewTimestamp';

export default class LandscapeDataService extends Service.extend(Evented) {
  private readonly latestData: LocalLandscapeData = {};
  private interval: number | undefined;

  @service('worker-service') readonly workerService!: WorkerService;
  @service('auth') readonly auth!: Auth;
  @service('landscape-token') readonly tokenService!: LandscapeTokenService;
  @service('repos/timestamp-repository')
  readonly timestampRepo!: TimestampRepository;
  @service('application-renderer')
  readonly applicationRenderer!: ApplicationRenderer;

  startPolling(): void {
    if (this.interval !== undefined) {
      throw new Error('Polling already started.');
    }

    setTimeout(() => this.updateLocalData(), 0);

    // TODO tiwe: ENV.mode.tokenToShow
    this.interval = setInterval(
      () => this.updateLocalData(),
      1000 * DataUpdateIntervalInSeconds
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

    const remote = await this.workerService.getRemote();

    return remote.getLandscapeDataUpdate(
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

    const update = await this.fetchData(endTime);
    await this.handleUpdate(update);
  }

  willDestroy(): void {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    super.willDestroy();
  }
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
