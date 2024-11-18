import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import TimestampRepository from './repos/timestamp-repository';
import SnapshotTokenService from './snapshot-token';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { SelectedCommit } from './commit-tree-state';

const { spanService } = ENV.backendAddresses;

export default class TimestampPollingService extends Service {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('auth')
  auth!: Auth;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  private timer: NodeJS.Timeout | null = null;
  private debug = debugLogger();

  async initTimestampPollingWithCallback(
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) {
    this.startTimestampPolling(commits, callback);
  }

  resetPolling() {
    if (this.timer) {
      this.debug('Stopping timestamp polling.');
      clearTimeout(this.timer);
    }
  }

  private startTimestampPolling(
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) {
    function setIntervalImmediately(func: () => void, interval: number) {
      func();
      return setInterval(func, interval);
    }

    this.timer = setIntervalImmediately(async () => {
      this.pollTimestamps(commits, callback);
    }, 10 * 1000);

    this.debug('Timestamp timer started');
  }

  private async pollTimestamps(
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) {
    // if (this.snapshotService.snapshotToken) {
    //   const timestamps =
    //     this.snapshotService.snapshotToken.timestamps.timestamps;
    //   callback(timestamps);
    // }

    const polledCommitToTimestampMap: Map<string, Timestamp[]> = new Map();

    if (commits.length === 0) {
      // No commit selected -> get all runtime behavior regardless of commit
      const commitId = CROSS_COMMIT_IDENTIFIER;
      const newestLocalTimestamp =
        this.timestampRepo.getLatestTimestamp(commitId);
      const allCommitsTimestampPromise = this.httpFetchTimestamps(
        undefined,
        newestLocalTimestamp
      );

      await allCommitsTimestampPromise
        .then((timestamps: Timestamp[]) => {
          polledCommitToTimestampMap.set(commitId, timestamps);
        })
        .catch((error: Error) => {
          console.error(`Error on fetch of timestamps: ${error}`);
          callback(new Map([[CROSS_COMMIT_IDENTIFIER, []]]));
          return;
        });
      callback(polledCommitToTimestampMap);
      return;
    } else {
      for (const selectedCommit of commits) {
        const newestLocalTimestampForCommit =
          this.timestampRepo.getLatestTimestamp(selectedCommit.commitId);

        const promise = this.httpFetchTimestamps(
          selectedCommit,
          newestLocalTimestampForCommit
        );

        await promise
          .then((timestamps: Timestamp[]) => {
            polledCommitToTimestampMap.set(selectedCommit.commitId, timestamps);
          })
          .catch((error: Error) => {
            console.error(`Error on fetch of timestamps: ${error}`);
            polledCommitToTimestampMap.set(selectedCommit.commitId, []);
          });
      }
      callback(polledCommitToTimestampMap);
    }
  }

  private httpFetchTimestamps(
    commit?: SelectedCommit,
    newestLocalTimestamp?: Timestamp
  ) {
    this.debug(
      'Polling timestamps for commitId: ' + (commit?.commitId ?? 'cross-commit')
    );
    return new Promise<Timestamp[]>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url = `${spanService}/v2/landscapes/${this.tokenService.token.value}/timestamps`;

      if (newestLocalTimestamp) {
        url += `?newest=${newestLocalTimestamp.epochMilli}`;

        if (commit) {
          url += `&commit=${commit.commitId}`;
        }
      }

      if (commit && !newestLocalTimestamp) {
        url += `?commit=${commit.commitId}`;
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
