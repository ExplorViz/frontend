import * as Comlink from 'comlink';
import type {
  BackendInfo,
  DataUpdate,
} from './landscape-data-worker/LandscapeDataContext';
import LandscapeDataContext from './landscape-data-worker/LandscapeDataContext';

let currentContext: LandscapeDataContext | undefined;
let backendInfo: BackendInfo | undefined;
let updateIntervalMS: number = 10 * 1000;

const api = {
  init(options: InitOptions): void {
    updateIntervalMS = options.updateIntervalInMS;
    backendInfo = options.backend;
  },

  getDataUpdate(
    landscapeToken: string | null,
    endTime: number,
    accessToken?: string
  ): Promise<DataUpdate> {
    if (!backendInfo) {
      throw new Error('Not initialized.');
    }

    if (landscapeToken === null) {
      throw new Error('No landscape token selected');
    }

    if (!currentContext || currentContext.token !== landscapeToken) {
      currentContext = new LandscapeDataContext(
        landscapeToken,
        backendInfo!,
        updateIntervalMS
      );
    }

    return currentContext.update(endTime, accessToken);
  },
};

Comlink.expose(api);

export type LandscapeDataWorkerAPI = typeof api;

type InitOptions = {
  updateIntervalInMS: number;
  backend: BackendInfo;
};
