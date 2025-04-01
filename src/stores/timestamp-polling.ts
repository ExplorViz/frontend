import { create } from 'zustand';
import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useAuthStore } from './auth';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { useLandscapeTokenStore } from './landscape-token';

const spanService = import.meta.env.VITE_SPAN_SERV_URL;

interface TimestampPollingState {
  timer: NodeJS.Timeout | null;
  initTimestampPollingWithCallback: (
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) => void;
  resetPolling: () => void;
  _startTimestampPolling: (
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) => void;
  _pollTimestamps: (
    commits: SelectedCommit[],
    callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
  ) => void;
  _httpFetchTimestamps: (
    commit?: SelectedCommit,
    newestLocalTimestamp?: Timestamp
  ) => Promise<Timestamp[]>;
}

export const useTimestampPollingStore = create<TimestampPollingState>(
  (set, get) => ({
    timer: null,

    initTimestampPollingWithCallback: async (
      commits: SelectedCommit[],
      callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
    ) => {
      get()._startTimestampPolling(commits, callback);
    },

    resetPolling: () => {
      if (get().timer) {
        clearTimeout(get().timer!);
      }
    },

    // private
    _startTimestampPolling: (
      commits: SelectedCommit[],
      callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
    ) => {
      function setIntervalImmediately(func: () => void, interval: number) {
        func();
        return setInterval(func, interval);
      }

      set({
        timer: setIntervalImmediately(async () => {
          get()._pollTimestamps(commits, callback);
        }, 10 * 1000),
      });
    },

    // private
    _pollTimestamps: async (
      commits: SelectedCommit[],
      callback: (commitToTimestampMap: Map<string, Timestamp[]>) => void
    ) => {
      //       if (useSnapshotTokenStore.getState().snapshotToken) {
      //         const timestamps =
      //           useSnapshotTokenStore.getState().snapshotToken!.timestamps.timestamps;
      //         callback(timestamps);
      //   }

      const polledCommitToTimestampMap: Map<string, Timestamp[]> = new Map();

      if (commits.length === 0) {
        //   No commit selected -> get all runtime behavior regardless of commit
        const commitId = CROSS_COMMIT_IDENTIFIER;
        const newestLocalTimestamp = useTimestampRepositoryStore
          .getState()
          .getLatestTimestamp(commitId);
        const allCommitsTimestampPromise = get()._httpFetchTimestamps(
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
          const newestLocalTimestampForCommit = useTimestampRepositoryStore
            .getState()
            .getLatestTimestamp(selectedCommit.commitId);

          const promise = get()._httpFetchTimestamps(
            selectedCommit,
            newestLocalTimestampForCommit
          );

          await promise
            .then((timestamps: Timestamp[]) => {
              polledCommitToTimestampMap.set(
                selectedCommit.commitId,
                timestamps
              );
            })
            .catch((error: Error) => {
              console.error(`Error on fetch of timestamps: ${error}`);
              polledCommitToTimestampMap.set(selectedCommit.commitId, []);
            });
        }
        callback(polledCommitToTimestampMap);
      }
    },

    // private
    _httpFetchTimestamps: (
      commit?: SelectedCommit,
      newestLocalTimestamp?: Timestamp
    ) => {
      return new Promise<Timestamp[]>((resolve, reject) => {
        if (!useLandscapeTokenStore.getState().token) {
          reject(new Error('No landscape token selected'));
          return;
        }

        let url = `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/timestamps`;

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
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
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
    },
  })
);
