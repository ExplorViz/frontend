import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { AnimationFrame } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

interface EvolutionAnimationFetchState {
  fetchAnimationFramesForRepository(
    repositoryName: string
  ): Promise<AnimationFrame[]>;
  _getLandscapeToken() : string;
  _constructUrl(endpoint: string, ...params: string[]): string;
  _fetchFromService<T>(url: string): Promise<T>;
}

export const useEvolutionAnimationFetchServiceStore =
  create<EvolutionAnimationFetchState>((set, get) => ({
    fetchAnimationFramesForRepository: async (
      repositoryName: string
    ): Promise<AnimationFrame[]> => {
      const url = get()._constructUrl(
        'structure/evolution',
        repositoryName,
        'animation'
      );
      return await get()._fetchFromService<AnimationFrame[]>(url);
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
        throw new Error(
          `Fetch failed with status ${response.status}: ${errorText}`
        );
      }

      return (await response.json()) as T;
    },
  }));
