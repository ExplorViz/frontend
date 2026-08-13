import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import {
  AnimationFrame,
  AnimationSkeleton,
  AnimationWindow,
  FlatLandscape,
  AnimationDeltaFrame,
  AnimationDeltaWindow,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

interface EvolutionAnimationFetchState {
  fetchAnimationWindow(
    repositoryName: string,
    start?: number,
    count?: number,
    granularity?: number,
    groupBy?: string,
    bucketSize?: number
  ): Promise<AnimationWindow>;

  fetchAnimationDeltaWindow(
    repositoryName: string,
    start?: number,
    count?: number,
    granularity?: number,
    groupBy?: string,
    bucketSize?: number
  ): Promise<AnimationDeltaWindow>;

  fetchAnimationSkeleton(repositoryName: string): Promise<AnimationSkeleton>;
  _getLandscapeToken(): string;
  _constructUrl(endpoint: string, ...params: string[]): string;
  _fetchFromService<T>(url: string): Promise<T>;
}

export const useEvolutionAnimationFetchServiceStore =
  create<EvolutionAnimationFetchState>((set, get) => ({
    fetchAnimationWindow: async (
      repositoryName: string,
      start?: number,
      count?: number,
      granularity?: number,
      groupBy?: string,
      bucketSize?: number
    ): Promise<AnimationWindow> => {
      const base = get()._constructUrl(
        'structure/evolution',
        repositoryName,
        'animation'
      );
      const params = new URLSearchParams();
      if (start !== undefined) params.set('start', String(start));
      if (count !== undefined) params.set('count', String(count));
      if (granularity !== undefined)
        params.set('granularity', String(granularity));
      if (groupBy !== undefined) params.set('groupBy', groupBy);
      if (bucketSize !== undefined)
        params.set('bucketSize', String(bucketSize));
      const query = params.toString();
      const url = query ? `${base}?${query}` : base;
      return await get()._fetchFromService<AnimationWindow>(url);
    },
    fetchAnimationDeltaWindow: async (
      repositoryName: string,
      start?: number,
      count?: number,
      granularity?: number,
      groupBy?: string,
      bucketSize?: number
    ): Promise<AnimationDeltaWindow> => {
      const base = get()._constructUrl(
        'structure/evolution',
        repositoryName,
        'animation',
        'delta'
      );
      const params = new URLSearchParams();
      if (start !== undefined) params.set('start', String(start));
      if (count !== undefined) params.set('count', String(count));
      if (granularity !== undefined)
        params.set('granularity', String(granularity));
      if (groupBy !== undefined) params.set('groupBy', groupBy);
      if (bucketSize !== undefined)
        params.set('bucketSize', String(bucketSize));
      const query = params.toString();
      const url = query ? `${base}?${query}` : base;
      return await get()._fetchFromService<AnimationDeltaWindow>(url);
    },

    fetchAnimationSkeleton: async (
      repositoryName: string
    ): Promise<AnimationSkeleton> => {
      const url = get()._constructUrl(
        'structure/evolution',
        repositoryName,
        'animation',
        'skeleton'
      );
      return await get()._fetchFromService<AnimationSkeleton>(url);
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
