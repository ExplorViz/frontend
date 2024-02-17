import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import TimestampRepository from './repos/timestamp-repository';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';

const { spanService } = ENV.backendAddresses;

export default class TimestampPollingService extends Service {
  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('auth') auth!: Auth;
  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

  private timer: NodeJS.Timeout | null = null;
  private debug = debugLogger();

  async initTimestampPollingWithCallback(
    commits: SelectedCommit[], callback: (timestamps: Timestamp[][]) => void
  ) {
    this.startTimestampPolling(commits, callback);
  }

  resetPolling() {
    this.debug('Stopping timestamp polling.');
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private startTimestampPolling(commits : SelectedCommit[], callback: (timestamps: Timestamp[][]) => void) {
    function setIntervalImmediately(func: () => void, interval: number) {
      func();
      return setInterval(func, interval);
    }

    this.timer = setIntervalImmediately(async () => {
      this.pollTimestamps(commits, callback);
    }, 10 * 1000);

    this.debug('Timestamp timer started');
  }

  private async pollTimestamps(commits : SelectedCommit[], callback: (timestamps: Timestamp[][]) => void) {
    // check if we already have a timestamp that acts as base point
    const landscapeToken = this.tokenService.token?.value;

    if (!landscapeToken) {
      console.log('No landscape token.');
      return;
    }

    const firstCommitNewestLocalTimestamp =
      this.timestampRepo.getLatestTimestamp(landscapeToken, commits[0].commitId);

    const firstCommitTimestampPromise = this.httpFetchTimestamps(commits[0], firstCommitNewestLocalTimestamp);
    let secondCommitTimestampPromise = undefined;
    if(commits.length > 1) {
      const secondCommitNewestLocalTimestamp = this.timestampRepo.getLatestTimestamp(landscapeToken, commits[1].commitId);
      secondCommitTimestampPromise = this.httpFetchTimestamps(commits[1], secondCommitNewestLocalTimestamp);
    }

    // TODO: do this stuff only if the returned JSON is NOT identical to the previous one. 
    // Otherwise, return [undefined, undefined] (if both JSONS are identical to their previous ones), 
    // [undefined, [...]] (if only the JSON of the first commit is identical to its previous one) 
    // [[...], undefined] (if only the JSON of the second commit is identical to its previous one)

    const timestampsArr : Timestamp[][] = [];

    await firstCommitTimestampPromise
      .then((timestamps: Timestamp[]) => {
      timestampsArr.push(timestamps);
    })
      .catch((error: Error) => {
        console.log(error);
      });

    if(secondCommitTimestampPromise) {
      await secondCommitTimestampPromise
      .then((timestamps: Timestamp[]) => { 
        // timestamps = [{
        //   epochMilli: 1702891010000,
        //   spanCount: 1
        // }, ...timestamps]; // TODO: DELETE. Only for test purposes. Not bug free anyway
        timestampsArr.push(timestamps);  
      })
      .catch((error: Error) => {
        console.log(error);
      });
    }

    callback(timestampsArr);
  }

  private httpFetchTimestamps(commit : SelectedCommit, newestLocalTimestamp?: Timestamp) { // TODO: commit wise timestamp data
    this.debug('Polling timestamps');
    return new Promise<Timestamp[]>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      // TODO commit id in url
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
