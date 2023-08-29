import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import ENV from 'explorviz-frontend/config/environment';
import TimestampRepository from './repos/timestamp-repository';
import Auth from './auth';
import LandscapeTokenService from './landscape-token';

const { landscapeService, traceService } = ENV.backendAddresses;

export default class LandscapeListener extends Service.extend(Evented) {
  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

  @service('auth') auth!: Auth;

  @service('landscape-token') tokenService!: LandscapeTokenService;

  latestStructureData: StructureLandscapeData | null = null;
  latestStructureJsonString: StructureLandscapeData | null = null;

  latestDynamicData: DynamicLandscapeData | null = null;

  debug = debugLogger();

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

    this.debug('Timer started timer');
  }

  async pollData(endTime: number, intervalInSeconds: number = 10) {
    try {
      // request landscape data that is 60 seconds old
      // that way we can be sure, all traces are available
      const [strucDataProm, dynamicDataProm] = await this.requestData(
        endTime,
        intervalInSeconds
      );

      let triggerUpdate = false;

      let structureData = null;
      if (strucDataProm.status === 'fulfilled') {
        structureData = strucDataProm.value;

        if (
          !this.latestStructureJsonString ||
          JSON.stringify(this.latestStructureJsonString) !==
            JSON.stringify(strucDataProm.value)
        ) {
          // preProcessAndEnhanceStructureLandscape introduces cycle to the original value, therefore no more JSON.stringify. Use different variable latestStructureJsonString to check if update is necessary

          this.latestStructureData =
            preProcessAndEnhanceStructureLandscape(structureData);

          this.latestStructureJsonString = structureData;

          triggerUpdate = true;
        }
      }

      if (dynamicDataProm.status === 'fulfilled') {
        if (
          !this.latestDynamicData ||
          JSON.stringify(this.latestDynamicData) !==
            JSON.stringify(dynamicDataProm.value)
        ) {
          this.latestDynamicData = dynamicDataProm.value;
          triggerUpdate = true;
        }
      } else {
        this.latestDynamicData = [];
      }

      this.updateTimestampRepoAndTimeline(
        endTime,
        LandscapeListener.computeTotalRequests(this.latestDynamicData!)
      );

      if (triggerUpdate) {
        this.debug('Trigger Data Update');
        this.trigger(
          'newLandscapeData',
          this.latestStructureData,
          this.latestDynamicData
        );

        if (
          ENV.mode.tokenToShow &&
          ENV.mode.tokenToShow !== 'change-token' &&
          this.timer
        ) {
          clearTimeout(this.timer);
        }
      }
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
      .map((trace) => trace.overallRequestCount)
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

  cleanup() {
    console.log('Cleanup was called');
  }
}

declare module '@ember/service' {
  interface Registry {
    'landscape-listener': LandscapeListener;
  }
}
