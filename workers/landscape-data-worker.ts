import * as Comlink from 'comlink';
import type {
  BackendInfo,
  UpdateConsumer,
} from './landscape-data-worker/LandscapeDataContext';
import LandscapeDataContext from './landscape-data-worker/LandscapeDataContext';

let currentContext: LandscapeDataContext | undefined;
let backendInfo: BackendInfo | undefined;
let updateConsumer: UpdateConsumer | undefined;
let updateIntervalMS: number = 10 * 1000;

const api = {
  init(options: InitOptions, onUpdate: UpdateConsumer): void {
    updateIntervalMS = options.updateIntervalInMS;
    backendInfo = options.backend;
    updateConsumer = onUpdate;
    console.log('worker initialized');
  },

  async poll(
    landscapeToken: string | null,
    accessToken?: string
  ): Promise<void> {
    if (!backendInfo || !updateConsumer) {
      throw new Error('Not initialized.');
    }

    if (landscapeToken === null) {
      throw new Error('No landscape token selected');
    }

    if (!currentContext || currentContext.token !== landscapeToken) {
      currentContext = new LandscapeDataContext(
        landscapeToken,
        backendInfo!,
        updateConsumer!,
        updateIntervalMS
      );
    }

    await currentContext.poll(accessToken);
  },
};

Comlink.expose(api);

export type LandscapeDataWorkerAPI = typeof api;

type InitOptions = {
  updateIntervalInMS: number;
  backend: BackendInfo;
};
