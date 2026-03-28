import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import {
  Commit,
  CommitComparison,
  CommitTree,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import {
  convertStructureLandscapeFromFlat,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { ApplicationMetricsCode } from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import { create } from 'zustand';

interface EvolutionDataFetchState {
  fetchRepositories: () => Promise<string[]>;
  fetchCommitTreeForRepoName(repoName: string): Promise<CommitTree>;
  fetchApplicationMetricsCodeForAppNameAndCommit(
    applicationName: string,
    commit: Commit
  ): Promise<ApplicationMetricsCode>;
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
  _constructUrlV3(endpoint: string, ...params: string[]): string;
  _fetchFromService<T>(url: string): Promise<T>;
}

export const useEvolutionDataFetchServiceStore =
  create<EvolutionDataFetchState>((set, get) => ({
    fetchRepositories: async (): Promise<string[]> => {
      const url = get()._constructUrlV3('repositories');
      return await get()._fetchFromService<string[]>(url);
    },

    fetchCommitTreeForRepoName: async (repoName: string): Promise<CommitTree> => {
      const url = get()._constructUrlV3('commit-tree', repoName);
      return await get()._fetchFromService<CommitTree>(url);
    },

    fetchFlatLandscapeForRepoNameAndCommits: async (repoName: string, commits: SelectedCommit[]): Promise<FlatLandscape> => {
      if (commits.length < 1 || commits.length > 2) {
        throw new Error('Invalid number of commits');
      }
      
      const [firstCommit, secondCommit] = commits;
      const commitPath = secondCommit
        ? `${firstCommit.commitId}-${secondCommit.commitId}`
        : firstCommit.commitId;
      const url = get()._constructUrlV3('structure', 'evolution', repoName, commitPath);
      return await get()._fetchFromService<FlatLandscape>(url);
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

      const response = await get()._fetchFromService<
        StructureLandscapeData | FlatLandscape
      >(url);

      if ('cities' in response) {
        return convertStructureLandscapeFromFlat(response as FlatLandscape);
      }

      return preProcessAndEnhanceStructureLandscape(
        response as StructureLandscapeData,
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
      return `${import.meta.env.VITE_CODE_SERV_URL}/v2/code/${endpoint}/${landscapeToken}/${params.join('/')}`;
    },

    _constructUrlV3: (endpoint: string, ...params: string[]): string => {
      const landscapeToken = get()._getLandscapeToken();
      return `${import.meta.env.VITE_CODE_SERV_URL}/v3/landscapes/${landscapeToken}/${endpoint}/${params.join('/')}`;
    },

    _fetchFromService: async <T>(url: string): Promise<T> => {
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
