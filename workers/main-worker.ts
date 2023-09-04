import * as Comlink from 'comlink';
import type {
  BackendInfo,
  DataUpdate,
} from './landscape-data-worker/LandscapeDataContext';
import LandscapeDataContext from './landscape-data-worker/LandscapeDataContext';
import type { OrderTuple, VizDataRaw } from 'explorviz-frontend/ide/shared';
import {} from 'explorviz-frontend/ide/shared';
import { convertVizDataToOrderTuple } from './ide/prepare-viz-data';

let currentDataContext: LandscapeDataContext | undefined;
let backendInfo: BackendInfo | undefined;
let updateIntervalMS: number = 10 * 1000;

const api = {
  init(options: InitOptions): void {
    updateIntervalMS = options.updateIntervalInMS;
    backendInfo = options.backend;
  },

  getLandscapeDataUpdate(
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

    if (!currentDataContext || currentDataContext.token !== landscapeToken) {
      currentDataContext = new LandscapeDataContext(
        landscapeToken,
        backendInfo!,
        updateIntervalMS
      );
    }

    return currentDataContext.update(endTime, accessToken);
  },

  prepareVizDataForIDE(vizDataRaw: VizDataRaw): OrderTuple[] {
    return convertVizDataToOrderTuple(vizDataRaw);
  },
};

Comlink.expose(api);

export type LandscapeDataWorkerAPI = typeof api;

type InitOptions = {
  updateIntervalInMS: number;
  backend: BackendInfo;
};
