import type { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import computeDrawableClassCommunication, {
  DrawableClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import type { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  type StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export default class LandscapeDataContext {
  readonly token: string;
  private readonly updateConsumer: UpdateConsumer;
  private readonly backend: BackendInfo;
  private intervalInMS: number;

  private lastStructureData: StructureLandscapeData | undefined;
  private lastStructureDataRaw: string | undefined;
  private lastDynamicDataRaw: string | undefined;

  constructor(
    token: string,
    backend: BackendInfo,
    updateConsumer: UpdateConsumer,
    intervalInMS: number
  ) {
    this.token = token;
    this.backend = backend;
    this.intervalInMS = intervalInMS;
    this.updateConsumer = updateConsumer;
  }

  async poll(accessToken: string | undefined) {
    const endTime = Date.now() - 60 * 1000;
    const startTime = endTime - this.intervalInMS;

    // Fetch & parse data
    // TODO use allSettled to allow a request to fail
    const [structureData, dynamicData] = await Promise.all([
      this.request<StructureLandscapeData>(this.structureUrl, accessToken),
      this.request<DynamicLandscapeData>(
        `${this.traceUrl}?from=${startTime}&to=${endTime}`,
        accessToken
      ),
    ]);

    const update: DataUpdate = { token: this.token };

    // Compare with previous (if applicable)
    if (structureData.raw !== this.lastStructureDataRaw) {
      const processedData = preProcessAndEnhanceStructureLandscape(
        structureData.json
      );
      update.structure = processedData;
    }
    this.lastStructureData = structureData.json;
    this.lastStructureDataRaw = structureData.raw;

    if (dynamicData.raw !== this.lastDynamicDataRaw) {
      const timestampRecord = {
        id: uuidv4(),
        timestamp: endTime,
        totalRequests: computeTotalRequests(dynamicData.json),
      };
      update.dynamic = dynamicData.json;
      update.timestamp = timestampRecord;
    }
    this.lastDynamicDataRaw = dynamicData.raw;

    if (this.lastStructureData && update.dynamic) {
      update.drawableClassCommunications = computeDrawableClassCommunication(
        this.lastStructureData,
        update.dynamic
      );
    }

    if (update.structure || update.dynamic) {
      this.updateConsumer(update);
    }
  }

  private async request<Data>(
    url: string,
    auth?: string
  ): Promise<{ json: Data; raw: string }> {
    const response = await fetch(url, {
      headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    });

    if (!response.ok) {
      throw new Error('Bad response.');
    }

    const data = await Promise.all([response.clone().json(), response.text()]);

    return {
      json: data[0],
      raw: data[1],
    };
  }

  private get structureUrl(): string {
    return `${this.backend.landscapeUrl}/v2/landscapes/${this.token}/structure`;
  }

  private get traceUrl(): string {
    return `${this.backend.tracesUrl}/v2/landscapes/${this.token}/dynamic`;
  }
}

function computeTotalRequests(dynamicData: DynamicLandscapeData): number {
  let total = 0;
  for (const trace of dynamicData) {
    total += trace.overallRequestCount;
  }
  return total;
}

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
  structure?: StructureLandscapeData;
  dynamic?: DynamicLandscapeData;
  timestamp?: Timestamp;
  drawableClassCommunications?: DrawableClassCommunication[];
};

export type BackendInfo = {
  landscapeUrl: string;
  tracesUrl: string;
};
