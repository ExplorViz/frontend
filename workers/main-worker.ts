import * as Comlink from 'comlink';
import type {
  BackendInfo,
  DataUpdate,
} from './landscape-data-worker/landscape-data-context';
import LandscapeDataContext from './landscape-data-worker/landscape-data-context';
import type { OrderTuple, VizDataRaw } from 'explorviz-frontend/ide/shared';
import { convertVizDataToOrderTuple } from './ide/prepare-viz-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';

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

  changeData(
    landscapeToken: string,
    structure: StructureLandscapeData,
    dynamic: DynamicLandscapeData
  ): DataUpdate {
    if (
      landscapeToken === null ||
      !currentDataContext ||
      currentDataContext.token !== landscapeToken
    ) {
      throw new Error();
    }

    currentDataContext.replaceData(structure, dynamic);

    throw new Error('Not implemented');
  },
};

Comlink.expose(api);

export type LandscapeDataWorkerAPI = typeof api;

type InitOptions = {
  updateIntervalInMS: number;
  backend: BackendInfo;
};
