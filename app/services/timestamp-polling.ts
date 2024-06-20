import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import TimestampRepository from './repos/timestamp-repository';

const { spanService } = ENV.backendAddresses;

export default class TimestampPollingService extends Service {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('auth')
  auth!: Auth;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  private timer: NodeJS.Timeout | null = null;
  private debug = debugLogger('TimestampPollingService');

  async initTimestampPollingWithCallback(
    callback: (timestamps: Timestamp[]) => void
  ) {
    this.startTimestampPolling(callback);
  }

  resetPolling() {
    this.debug('Stopping timestamp polling.');
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private startTimestampPolling(callback: (timestamps: Timestamp[]) => void) {
    function setIntervalImmediately(func: () => void, interval: number) {
      func();
      return setInterval(func, interval);
    }

    this.timer = setIntervalImmediately(async () => {
      this.pollTimestamps(callback);
    }, 10 * 1000);

    this.debug('Timestamp timer started');
  }

  private pollTimestamps(callback: (timestamps: Timestamp[]) => void) {
    // Check if we already have a timestamp that acts as base point
    const landscapeToken = this.tokenService.token?.value;

    if (!landscapeToken) {
      console.error('No landscape token to pull timestamps.');
      return;
    }

    const newestLocalTimestamp =
      this.timestampRepo.getLatestTimestamp(landscapeToken);

    const timestampPromise = this.httpFetchTimestamps(newestLocalTimestamp);

    timestampPromise
      .then((timestamps: Timestamp[]) => callback(timestamps))
      .catch((error: Error) => {
        console.error(`Error on fetch of timestamps: ${error}`);
      });
  }

  private httpFetchTimestamps(newestLocalTimestamp?: Timestamp | undefined) {
    this.debug('Polling timestamps');
    return new Promise<Timestamp[]>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url = `${spanService}/v2/landscapes/${this.tokenService.token.value}/timestamps`;

      if (newestLocalTimestamp) {
        url += `?newest=${newestLocalTimestamp.epochMilli}`;
      }

      fetch(url, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const timestamps = (await response.json()) as Timestamp[];
            resolve(timestamps);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    'timestamp-polling': TimestampPollingService;
  }
}
