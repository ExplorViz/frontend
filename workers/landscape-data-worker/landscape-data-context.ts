import type { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import computeDrawableClassCommunication, {
  DrawableClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import calculateCommunications from 'explorviz-frontend/utils/calculate-communications';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import {
  type Application,
  preProcessAndEnhanceStructureLandscape,
  type StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { ApplicationHeatmapData } from 'heatmap/services/heatmap-configuration';
import {
  type CityLayout,
  computeLayoutForApplication,
} from 'workers/city-layouter';
import { calculateFlatData, type FlatData } from 'workers/flat-data-worker';
import { calculateHeatmapData } from 'workers/metrics-worker';
import {
  type ClassAndPackageCounts,
  countClassesAndPackages,
} from 'workers/utils';
import {
  type ApplicationLabelData,
  generatePackageLabels,
} from './label-generator';
import * as Comlink from 'comlink';

export default class LandscapeDataContext {
  readonly token: string;
  private readonly backend: BackendInfo;
  private intervalInMS: number;

  private latestProcessedStructureData: StructureLandscapeData;
  private latestDynamicData: DynamicLandscapeData = [];

  private lastStructureResponse: string | undefined;
  private lastDynamicResponse: string | undefined;

  constructor(token: string, backend: BackendInfo, intervalInMS: number) {
    this.token = token;
    this.backend = backend;
    this.intervalInMS = intervalInMS;
    this.latestProcessedStructureData = {
      landscapeToken: token,
      nodes: [],
    };
  }

  async update(endTime: number, accessToken?: string): Promise<DataUpdate> {
    const [structureUpdated, dynamicUpdated] = await Promise.all([
      this.updateStructureData(accessToken),
      this.updateDynamicData(endTime, accessToken),
    ]);

    return this.handleUpdatedData(endTime, structureUpdated, dynamicUpdated);
  }

  replaceData(
    structure: StructureLandscapeData,
    dynamic: DynamicLandscapeData
  ): DataUpdate {
    this.latestProcessedStructureData = structure;
    this.latestDynamicData = dynamic;
    this.lastDynamicResponse = undefined;
    this.lastStructureResponse = undefined;
    return this.handleUpdatedData(Date.now(), true, true);
  }

  private handleUpdatedData(
    endTime: number,
    structureUpdated: boolean,
    dynamicUpdated: boolean
  ): DataUpdate {
    const timestamp = {
      id: uuidv4(),
      timestamp: endTime,
      totalRequests: computeTotalRequests(this.latestDynamicData),
    };

    const update: DataUpdate = {
      token: this.token,
      timestamp,
      structure: this.latestProcessedStructureData,
      dynamic: this.latestDynamicData,
    };

    if (structureUpdated || dynamicUpdated) {
      update.drawableClassCommunications = computeDrawableClassCommunication(
        this.latestProcessedStructureData,
        this.latestDynamicData
      );

      update.interAppCommunications = update.drawableClassCommunications.filter(
        (x) => x.sourceApp !== x.targetApp
      );

      update.appData = computeApplicationData(
        this.latestProcessedStructureData,
        this.latestDynamicData,
        update.drawableClassCommunications
      );
    }

    const transfers: Transferable[] = [];

    if (update.appData) {
      update.appData.forEach((data) =>
        transfers.push(data.labels.texture.data.buffer)
      );
    }

    return Comlink.transfer(update, transfers);
  }

  private async updateStructureData(
    accessToken: string | undefined
  ): Promise<boolean> {
    const [result] = await Promise.allSettled([
      this.request(
        `${this.backend.landscapeUrl}/v2/landscapes/${this.token}/structure`,
        accessToken
      ),
    ]);

    if (result.status === 'rejected') {
      return false;
    }

    if (result.value === this.lastStructureResponse) {
      return false;
    }
    this.lastStructureResponse = result.value;

    let data: StructureLandscapeData;
    try {
      data = JSON.parse(result.value);
    } catch (e) {
      console.error('Invalid JSON response (structure)');
      return false;
    }

    preProcessAndEnhanceStructureLandscape(data);

    this.latestProcessedStructureData = data;

    return true;
  }

  private async updateDynamicData(
    endTime: number,
    accessToken: string | undefined
  ): Promise<boolean> {
    const startTime = endTime - this.intervalInMS;

    const [result] = await Promise.allSettled([
      this.request(
        `${this.backend.tracesUrl}/v2/landscapes/${this.token}/dynamic?from=${startTime}&to=${endTime}`,
        accessToken
      ),
    ]);

    if (result.status === 'rejected') {
      return false;
    }

    if (result.value === this.lastDynamicResponse) {
      return false;
    }
    this.lastDynamicResponse = result.value;

    let data: DynamicLandscapeData;
    try {
      data = JSON.parse(result.value);
    } catch (e) {
      console.error('Invalid JSON response (dynamic)');
      return false;
    }

    this.latestDynamicData = data;
    return true;
  }

  private async request(url: string, auth?: string): Promise<string> {
    const response = await fetch(url, {
      headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    });

    if (!response.ok) {
      throw new Error('Bad response.');
    }

    return await response.text();
  }
}

function computeTotalRequests(dynamicData: DynamicLandscapeData): number {
  let total = 0;
  for (const trace of dynamicData) {
    total += trace.overallRequestCount;
  }
  return total;
}

function computeApplicationData(
  structure: StructureLandscapeData,
  dynamic: DynamicLandscapeData,
  drawableClassCommunications: DrawableClassCommunication[]
) {
  const data = new Map<Application['id'], WorkerApplicationData>();
  const applications = structure.nodes.map((node) => node.applications).flat();

  // TODO: If this part is too slow it could be done by multiple workers in parallel:
  for (const application of applications) {
    performance.mark(`appData-${application.id}`);

    const layout = computeLayoutForApplication(application, dynamic);
    const heatmap = calculateHeatmapData(application, dynamic);
    const flatData = calculateFlatData(application);
    const communication = calculateCommunications(
      application,
      drawableClassCommunications
    );
    const counts = countClassesAndPackages(application);
    const labels = generatePackageLabels(application, layout);

    data.set(application.id, {
      layout,
      heatmap,
      flatData,
      communication,
      counts,
      labels,
    });
  }
  performance.mark('appData-completed');

  return data;
}

export type WorkerApplicationData = {
  layout: CityLayout;
  heatmap: ApplicationHeatmapData;
  flatData: Map<string, FlatData>;
  communication: DrawableClassCommunication[];
  counts: ClassAndPackageCounts;
  labels: ApplicationLabelData;
};

/**
 * Generates a unique string ID
 * See: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
function uuidv4() {
  /* eslint-disable */
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function (c) {
      let r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
  /* eslint-enable */
}

export type UpdateConsumer = (update: DataUpdate) => void | Promise<void>;

export type DataUpdate = {
  token: string;
  structure: StructureLandscapeData;
  dynamic: DynamicLandscapeData;
  timestamp: Timestamp;
  drawableClassCommunications?: DrawableClassCommunication[];
  appData?: Map<Application['id'], WorkerApplicationData>;
  interAppCommunications?: DrawableClassCommunication[];
};

export type BackendInfo = {
  landscapeUrl: string;
  tracesUrl: string;
};
