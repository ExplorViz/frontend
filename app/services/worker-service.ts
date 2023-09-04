import Service from '@ember/service';
import * as Comlink from 'comlink';
import { LandscapeDataWorkerAPI } from 'workers/main-worker';
import ENV from 'explorviz-frontend/config/environment';
import { DataUpdateIntervalInSeconds } from './landscape-data-service';

const webWorkersPath = 'assets/web-workers/';

export default class WorkerService extends Service {
  private worker: Worker | undefined;
  private readonly comlinkRemote: Promise<
    Comlink.Remote<LandscapeDataWorkerAPI>
  >;

  constructor() {
    super(...arguments);

    this.comlinkRemote = this.createWorkerAndRemote().then(
      ([worker, remote]) => {
        this.worker = worker;
        return remote;
      }
    );
  }

  getRemote(): Promise<Comlink.Remote<LandscapeDataWorkerAPI>> {
    return this.comlinkRemote;
  }

  private async createWorkerAndRemote(): Promise<
    [Worker, Comlink.Remote<LandscapeDataWorkerAPI>]
  > {
    const worker = new Worker(resolveWorkerUrl('main-worker.js'), {
      name: 'Main Worker',
    });
    const remote = Comlink.wrap<LandscapeDataWorkerAPI>(worker);

    const { landscapeService, traceService } = ENV.backendAddresses;

    await remote.init({
      updateIntervalInMS: 1000 * DataUpdateIntervalInSeconds,
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
    super.willDestroy();
  }
}

function resolveWorkerUrl(worker: string): string {
  // TODO assetMap?
  // https://github.com/BBVAEngineering/ember-web-workers/blob/dbb3bab974383fc053c8e4d9486259260b9d4b00/addon/services/worker.js#L86
  return `${webWorkersPath}${worker}`;
}

declare module '@ember/service' {
  interface Registry {
    'worker-service': WorkerService;
  }
}
