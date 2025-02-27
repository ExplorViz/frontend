import { create } from 'zustand';
import {
  Commit,
  CommitComparison,
  CommitTree,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { ApplicationMetricsCode } from '../utils/metric-schemes/metric-data';
import { SelectedCommit } from 'react-lib/src/stores/commit-tree-state';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
import { useAuthStore } from 'react-lib/src/stores/auth';
import * as ENV from 'react-lib/src/env';

interface EvolutionDataFetchState {
  fetchApplications: () => Promise<string[]>;
  fetchCommitTreeForAppName(appName: string): Promise<CommitTree>;
  fetchApplicationMetricsCodeForAppNameAndCommit(
    applicationName: string,
    commit: Commit
  ): Promise<ApplicationMetricsCode>;
  fetchApplicationMetricsCodeForAppAndCommits(
    applicationName: string,
    commits: SelectedCommit[]
  ): Promise<Map<string, ApplicationMetricsCode>>;
  fetchCommitComparison(
    applicationName: string,
    baseCommit: Commit,
    comparisonCommit: Commit
  ): Promise<CommitComparison>;
  fetchStaticLandscapeStructuresForAppName(
    applicationName: string,
    commits: SelectedCommit[]
  ): Promise<StructureLandscapeData>;
  _getLandscapeToken(): string;
  _constructUrl(endpoint: string, ...params: string[]): string;
  _fetchFromService<T>(url: string): Promise<T>;
}

export const useEvolutionDataFetchServiceStore =
  create<EvolutionDataFetchState>((set, get) => ({
    fetchApplications: async (): Promise<string[]> => {
      const url = get()._constructUrl('applications');
      return await get()._fetchFromService<string[]>(url);
    },

    fetchCommitTreeForAppName: async (appName: string): Promise<CommitTree> => {
      const url = get()._constructUrl('commit-tree', appName);
      return await get()._fetchFromService<CommitTree>(url);
    },

    fetchApplicationMetricsCodeForAppNameAndCommit: async (
      applicationName: string,
      commit: Commit
    ): Promise<ApplicationMetricsCode> => {
      const url = get()._constructUrl(
        'metrics',
        applicationName,
        commit.commitId
      );
      return await get()._fetchFromService<ApplicationMetricsCode>(url);
    },

    fetchApplicationMetricsCodeForAppAndCommits: async (
      applicationName: string,
      commits: SelectedCommit[]
    ): Promise<Map<string, ApplicationMetricsCode>> => {
      const commitIdToAppMetricsCodeMap: Map<string, ApplicationMetricsCode> =
        new Map();

      for (const commit of commits) {
        const url = get()._constructUrl(
          'metrics',
          applicationName,
          commit.commitId
        );
        const appMetricsCode =
          await get()._fetchFromService<ApplicationMetricsCode>(url);

        commitIdToAppMetricsCodeMap.set(commit.commitId, appMetricsCode);
      }

      return commitIdToAppMetricsCodeMap;
    },

    fetchCommitComparison: async (
      applicationName: string,
      baseCommit: Commit,
      comparisonCommit: Commit
    ): Promise<CommitComparison> => {
      const url = get()._constructUrl(
        'commit-comparison',
        applicationName,
        `${baseCommit.commitId}-${comparisonCommit.commitId}`
      );

      const response = await get()._fetchFromService(url);
      return response as CommitComparison;
    },

    fetchStaticLandscapeStructuresForAppName: async (
      applicationName: string,
      commits: SelectedCommit[]
    ): Promise<StructureLandscapeData> => {
      if (commits.length < 1 || commits.length > 2) {
        throw new Error('Invalid number of commits');
      }

      const [firstCommit, secondCommit] = commits;
      const commitPath = secondCommit
        ? `${firstCommit.commitId}-${secondCommit.commitId}`
        : firstCommit.commitId;
      const url = get()._constructUrl('structure', applicationName, commitPath);

      const response =
        await get()._fetchFromService<StructureLandscapeData>(url);
      return preProcessAndEnhanceStructureLandscape(
        response,
        TypeOfAnalysis.Static
      );
    },

    _getLandscapeToken: (): string => {
      const landscapeToken = useLandscapeTokenStore.getState().token?.value;
      if (!landscapeToken) {
        throw new Error('No landscape token selected');
      }
      return landscapeToken;
    },

    _constructUrl: (endpoint: string, ...params: string[]): string => {
      const landscapeToken = get()._getLandscapeToken();
      return `${ENV.CODE_SERV_URL}/v2/code/${endpoint}/${landscapeToken}/${params.join('/')}`;
    },

    _fetchFromService: async <T>(url: string): Promise<T> => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new FetchError(response.status, errorText);
        }

        return (await response.json()) as T;
      } catch (error) {
        throw error;
      }
    },
  }));

class FetchError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(`Fetch failed with status ${status}: ${message}`);
    this.name = 'FetchError';
  }
}
