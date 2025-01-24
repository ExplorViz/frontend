import { createStore } from "zustand/vanilla";
import { SelectedCommit } from "react-lib/src/stores/commit-tree-state";
import { Timestamp } from "react-lib/src/utils/landscape-schemes/timestamp";
import { CROSS_COMMIT_IDENTIFIER } from "react-lib/src/utils/evolution-schemes/evolution-data";
import ENV from "explorviz-frontend/config/environment";
// TODO: import Auth from "./auth";

const { spanService } = ENV.backendAddresses;

interface TimestampPollingState {
  timer: NodeJS.Timeout | null;
  initTimestampPollingWithCallback: (
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) => void;
  resetPolling: () => void;
  startTimestampPolling: (
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) => void;
  pollTimestamps: (
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) => void;
  httpFetchTimestamps: (
    commit?: SelectedCommit,
    newestLocalTimestamp?: Timestamp
  ) => Promise<Timestamp[]>;
}

export const useTimestampPollingStore = createStore<TimestampPollingState>(
  (set, get) => ({
    timer: null,
    initTimestampPollingWithCallback: async (
      commits: SelectedCommit[],
      callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
    ) => {
      get().startTimestampPolling(commits, callback);
    },
    resetPolling: () => {
      if (get().timer) {
        // TODO: this.debug("Stopping timestamp polling.");
        // TODO: clearTimeout(get().timer);
      }
    },
    startTimestampPolling: (
      commits: SelectedCommit[],
      callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
    ) => {
      function setIntervalImmediately(func: () => void, interval: number) {
        func();
        return setInterval(func, interval);
      }

      get().timer = setIntervalImmediately(async () => {
        get().pollTimestamps(commits, callback);
      }, 10 * 1000);

      // TODO: get().debug('Timestamp timer started');
    },
    pollTimestamps: async (
      commits: SelectedCommit[],
      callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
    ) => {
      // if (this.snapshotService.snapshotToken) {
      //   const timestamps =
      //     this.snapshotService.snapshotToken.timestamps.timestamps;
      //   callback(timestamps);
      // }

      const polledCommitToTimestampMap: Map<string, Timestamp[]> = new Map();

      // if (commits.length === 0) {
      // No commit selected -> get all runtime behavior regardless of commit
      // const commitId = CROSS_COMMIT_IDENTIFIER;
      // TODO: const newestLocalTimestamp =
      //   useTimestampRepositoryStore.getLatestTimestamp(commitId);
      // const newestLocalTimestamp =
      //   get().timestampRepo.getLatestTimestamp(commitId);
      // const allCommitsTimestampPromise = get().httpFetchTimestamps(
      //   undefined,
      //   newestLocalTimestamp
      // );

      //   await allCommitsTimestampPromise
      //     .then((timestamps: Timestamp[]) => {
      //       polledCommitToTimestampMap.set(commitId, timestamps);
      //     })
      //     .catch((error: Error) => {
      //       console.error(`Error on fetch of timestamps: ${error}`);
      //       callback(new Map([[CROSS_COMMIT_IDENTIFIER, []]]));
      //       return;
      //     });
      //   callback(polledCommitToTimestampMap);
      //   return;
      // } else {
      //   for (const selectedCommit of commits) {
      //     // TODO: const newestLocalTimestampForCommit =
      //     //   useTimestampRepositoryStore.getLatestTimestamp(selectedCommit.commitId);
      //     // const newestLocalTimestampForCommit =
      //     //   get().timestampRepo.getLatestTimestamp(selectedCommit.commitId);

      //     const promise = get().httpFetchTimestamps(
      //       selectedCommit,
      //       newestLocalTimestampForCommit
      //     );

      //     await promise
      //       .then((timestamps: Timestamp[]) => {
      //         polledCommitToTimestampMap.set(
      //           selectedCommit.commitId,
      //           timestamps
      //         );
      //       })
      //       .catch((error: Error) => {
      //         console.error(`Error on fetch of timestamps: ${error}`);
      //         polledCommitToTimestampMap.set(selectedCommit.commitId, []);
      //       });
      //   }
      // TODO: callback(polledCommitToTimestampMap);
      // }
    },
    httpFetchTimestamps: (
      commit?: SelectedCommit,
      newestLocalTimestamp?: Timestamp
    ) => {
      // TODO: this.debug(
      //   'Polling timestamps for commitId: ' + (commit?.commitId ?? 'cross-commit')
      // );
      return new Promise<Timestamp[]>((resolve, reject) => {
        // TODO: if (useLandscapeTokenStore.token === null) {
        //   reject(new Error('No landscape token selected'));
        //   return;
        // }
        // if (get().tokenService.token === null) {
        //   reject(new Error('No landscape token selected'));
        //   return;
        // }
        // TODO: let url = `${spanService}/v2/landscapes/${useLandscapeTokenStore.token.value}/timestamps`;
        // let url = `${spanService}/v2/landscapes/${get().tokenService.token.value}/timestamps`;
        //     if (newestLocalTimestamp) {
        //       url += `?newest=${newestLocalTimestamp.epochMilli}`;
        //       if (commit) {
        //         url += `&commit=${commit.commitId}`;
        //       }
        //     }
        //     if (commit && !newestLocalTimestamp) {
        //       url += `?commit=${commit.commitId}`;
        //     }
        //     fetch(url, {
        //       headers: {
        //         Authorization: `Bearer ${get().auth.accessToken}`,
        //         "Access-Control-Allow-Origin": "*",
        //       },
        //     })
        //       .then(async (response: Response) => {
        //         if (response.ok) {
        //           const timestamps = (await response.json()) as Timestamp[];
        //           resolve(timestamps);
        //         } else {
        //           reject();
        //         }
        //       })
        //       .catch((e) => reject(e));
      });
    },
  })
);
