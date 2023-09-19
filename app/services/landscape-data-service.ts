import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import type LandscapeTokenService from './landscape-token';
import type Auth from './auth';
import type {
  DataUpdate,
  WorkerApplicationData,
} from 'workers/landscape-data-worker/landscape-data-context';
import type {
  Application,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import type TimestampRepository from './repos/timestamp-repository';
import type ApplicationRenderer from './application-renderer';
import type { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import type { NewTimestampPayload } from './repos/timestamp-repository';
import type WorkerService from './worker-service';
import type LandscapeRestructure from './landscape-restructure';

export const DataUpdateIntervalInSeconds = 10;
export const LandscapeDataUpdateEventName = 'LandscapeDataUpdate';
export const NewTimestampEventName = 'NewTimestamp';

export default class LandscapeDataService extends Service.extend(Evented) {
  private latestData: LocalLandscapeData = {};
  private interval: number | undefined;

  @service('worker-service') readonly workerService!: WorkerService;
  @service('auth') readonly auth!: Auth;
  @service('landscape-token') readonly tokenService!: LandscapeTokenService;
  @service('repos/timestamp-repository')
  readonly timestampRepo!: TimestampRepository;
  @service('application-renderer')
  readonly applicationRenderer!: ApplicationRenderer;
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

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

  async changeData(
    structure: StructureLandscapeData,
    dynamic: DynamicLandscapeData
  ): Promise<void> {
    const landscapeToken = this.tokenService.token;
    if (landscapeToken === null) {
      throw new Error('No landscape token.');
    }

    const remote = await this.workerService.getRemote();

    const update = await remote.changeData(
      landscapeToken.value,
      structure,
      dynamic
    );
    await this.handleUpdate(update);
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
    if (this.latestData.token !== update.token) {
      this.latestData = {
        token: update.token,
      };
    }

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

    if (update.interAppCommunications) {
      this.latestData.interAppCommunications = update.interAppCommunications;
    }

    if (update.appData) {
      this.latestData.appData = update.appData;
    }

    this.trigger(LandscapeDataUpdateEventName, this.latestData);
  }

  private async updateLocalData(endTime = Date.now() - 60 * 1000) {
    const landscapeToken = this.tokenService.token;
    if (landscapeToken === null) {
      return;
    }

    if (
      this.latestData.token &&
      this.latestData.token !== landscapeToken.value
    ) {
      this.latestData = { token: landscapeToken.value };
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
  interAppCommunications: DrawableClassCommunication[];
  appData: Map<Application['id'], WorkerApplicationData>;
  token: string;
}>;

declare module '@ember/service' {
  interface Registry {
    'landscape-data-service': LandscapeDataService;
  }
}
