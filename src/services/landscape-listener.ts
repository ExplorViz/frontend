import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
} from '../utils/landscape-schemes/structure-data';
import ENV from '../config/environment';
import TimestampRepository from './repos/timestamp-repository';
import Auth from './auth';
import LandscapeTokenService from './landscape-token';
import { DynamicLandscapeData } from '../utils/landscape-schemes/dynamic-data';

// TODO
const landscapeService = 'http://localhost:8081';
const traceService = 'http://localhost:8082';

export default class LandscapeListener {
  timestampRepo!: TimestampRepository;

  auth!: Auth;

  tokenService!: LandscapeTokenService;

  latestStructureData: StructureLandscapeData | null = null;

  latestDynamicData: DynamicLandscapeData | null = null;

  timer: NodeJS.Timeout | null = null;

  async initLandscapePolling(intervalInSeconds: number = 10) {
    function setIntervalImmediately(func: () => void, interval: number) {
      func();
      return setInterval(func, interval);
    }

    this.timer = setIntervalImmediately(async () => {
      const endTime = Date.now() - 60 * 1000;
      this.pollData(endTime, intervalInSeconds);
    }, intervalInSeconds * 1000);
  }

  async pollData(endTime: number, intervalInSeconds: number = 10) {
    try {
      // request landscape data that is 60 seconds old
      // that way we can be sure, all traces are available
      const [strucDataProm, dynamicDataProm] = await this.requestData(
        endTime,
        intervalInSeconds
      );

      let structureData = null;
      if (strucDataProm.status === 'fulfilled') {
        structureData = strucDataProm.value;

        this.latestStructureData =
          preProcessAndEnhanceStructureLandscape(structureData);
      }

      if (dynamicDataProm.status === 'fulfilled') {
        this.latestDynamicData = dynamicDataProm.value;
      } else {
        this.latestDynamicData = [];
      }

      this.updateTimestampRepoAndTimeline(
        endTime,
        LandscapeListener.computeTotalRequests(this.latestDynamicData!)
      );

      /*
      this.trigger(
        'newLandscapeData',
        this.latestStructureData,
        this.latestDynamicData
      );
      */
    } catch (e) {
      // landscape data could not be requested, try again?
    }
  }

  async requestData(endTime: number, intervalInSeconds: number) {
    const startTime = endTime - intervalInSeconds * 1000;

    const structureDataPromise =
      this.requestStructureData(/* startTime, endTime */);
    const dynamicDataPromise = this.requestDynamicData(startTime, endTime);

    const landscapeData = Promise.allSettled([
      structureDataPromise,
      dynamicDataPromise,
    ]);

    return landscapeData;
  }

  requestStructureData(/* fromTimestamp: number, toTimestamp: number */) {
    return new Promise<StructureLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${landscapeService}/v2/landscapes/${this.tokenService.token.value}/structure`,
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const structureData =
              (await response.json()) as StructureLandscapeData;
            resolve(structureData);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  requestDynamicData(fromTimestamp: number, toTimestamp: number) {
    return new Promise<DynamicLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${traceService}/v2/landscapes/${this.tokenService.token.value}/dynamic?from=${fromTimestamp}&to=${toTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const dynamicData = (await response.json()) as DynamicLandscapeData;
            resolve(dynamicData);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  static computeTotalRequests(dynamicData: DynamicLandscapeData) {
    // cant't run reduce on empty array
    if (dynamicData.length === 0) {
      return 0;
    }
    const reducer = (accumulator: number, currentValue: number) =>
      accumulator + currentValue;
    return dynamicData
      .map((trace: any) => trace.overallRequestCount)
      .reduce(reducer);
  }

  updateTimestampRepoAndTimeline(timestamp: number, totalRequests: number) {
    /**
     * Generates a unique string ID
     */
    //  See: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
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

    const timestampRecord = { id: uuidv4(), timestamp, totalRequests };

    this.timestampRepo.addTimestamp(
      this.tokenService.token!.value,
      timestampRecord
    );

    this.timestampRepo.triggerTimelineUpdate();
  }
}
