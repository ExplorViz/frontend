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
  private readonly backend: BackendInfo;
  private intervalInMS: number;

  constructor(token: string, backend: BackendInfo, intervalInMS: number) {
    this.token = token;
    this.backend = backend;
    this.intervalInMS = intervalInMS;
  }

  async poll(
    endTime: number,
    accessToken: string | undefined
  ): Promise<DataUpdate> {
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

    // TODO: Compare with previous (if applicable)
    const processedData = preProcessAndEnhanceStructureLandscape(
      structureData.json
    );
    update.structure = processedData;

    const timestampRecord = {
      id: uuidv4(),
      timestamp: endTime,
      totalRequests: computeTotalRequests(dynamicData.json),
    };
    update.dynamic = dynamicData.json;
    update.timestamp = timestampRecord;

    update.drawableClassCommunications = computeDrawableClassCommunication(
      processedData,
      dynamicData.json
    );

    return update;
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
