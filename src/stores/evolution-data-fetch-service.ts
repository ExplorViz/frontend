import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { CommitTree } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

export type EvolutionStructureBatchRequestBody = {
  repositories: {
    repositoryName: string;
    commitHashes: string[];
  }[];
};

interface EvolutionDataFetchState {
  fetchRepositories: () => Promise<string[]>;
  fetchCommitTreeForRepoName(repoName: string): Promise<CommitTree>;
  fetchFlatLandscapeForRepositoriesAndCommits(
    body: EvolutionStructureBatchRequestBody
  ): Promise<FlatLandscape>;
  _getLandscapeToken(): string;
  _constructUrl(endpoint: string, ...params: string[]): string;
  _fetchFromService<T>(url: string): Promise<T>;
  _postJsonToService<T>(url: string, body: unknown): Promise<T>;
}

export const useEvolutionDataFetchServiceStore =
  create<EvolutionDataFetchState>((set, get) => ({
    fetchRepositories: async (): Promise<string[]> => {
      const url = get()._constructUrl('repositories');
      return await get()._fetchFromService<string[]>(url);
    },

    fetchCommitTreeForRepoName: async (
      repoName: string
    ): Promise<CommitTree> => {
      const url = get()._constructUrl('commit-tree', repoName);
      return await get()._fetchFromService<CommitTree>(url);
    },

    fetchFlatLandscapeForRepositoriesAndCommits: async (
      body: EvolutionStructureBatchRequestBody
    ): Promise<FlatLandscape> => {
      const landscapeToken = get()._getLandscapeToken();
      const url = `${import.meta.env.VITE_LANDSCAPE_SERV_URL}/v3/landscapes/${landscapeToken}/structure/evolution/batch`;
      return await get()._postJsonToService<FlatLandscape>(url, body);
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
      return `${import.meta.env.VITE_LANDSCAPE_SERV_URL}/v3/landscapes/${landscapeToken}/${endpoint}/${params.join('/')}`;
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

    _postJsonToService: async <T>(url: string, body: unknown): Promise<T> => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
