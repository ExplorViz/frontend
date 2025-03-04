import { create } from 'zustand';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import * as ENV from 'react-lib/src/env';
import { useAuthStore } from './auth';
import { useLandscapeTokenStore } from './landscape-token';

const spanService = ENV.SPAN_SERV_URL;

interface LandscapeHTTPRequestUtilState {
  requestData: (
    startTime: number,
    intervalInSeconds: number
  ) => Promise<
    [
      PromiseSettledResult<StructureLandscapeData>,
      PromiseSettledResult<DynamicLandscapeData>,
    ]
  >;
  requestStructureData: (/* fromTimestamp: number, toTimestamp: number */) => Promise<StructureLandscapeData>;
  requestDynamicData: (
    fromTimestamp: number,
    toTimestamp: number
  ) => Promise<DynamicLandscapeData>;
}

export const useLandscapeHTTPRequestUtilStateStore =
  create<LandscapeHTTPRequestUtilState>((set, get) => ({
    requestData: async (startTime: number, intervalInSeconds: number) => {
      const endTime = startTime + intervalInSeconds * 1000;

      const structureDataPromise =
        get().requestStructureData(/* startTime, endTime */);
      const dynamicDataPromise = get().requestDynamicData(startTime, endTime);

      const landscapeData = Promise.allSettled([
        structureDataPromise,
        dynamicDataPromise,
      ]);

      return landscapeData;
    },

    requestStructureData:
      (/* fromTimestamp: number, toTimestamp: number */) => {
        return new Promise<StructureLandscapeData>((resolve, reject) => {
          if (useLandscapeTokenStore.getState().token === null) {
            reject(new Error('No landscape token selected'));
            return;
          }
          fetch(
            `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/structure`,
            {
              headers: {
                Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
                'Access-Control-Allow-Origin': '*',
              },
            }
          )
            .then(async (response: Response) => {
              if (response.ok) {
                const structureData =
                  (await response.json()) as StructureLandscapeData;
                structureData.k8sNodes = structureData.k8sNodes || [];
                resolve(structureData);
              } else {
                reject();
              }
            })
            .catch((e) => reject(e));
        });
      },

    requestDynamicData: (fromTimestamp: number, toTimestamp: number) => {
      return new Promise<DynamicLandscapeData>((resolve, reject) => {
        if (useLandscapeTokenStore.getState().token === null) {
          reject(new Error('No landscape token selected'));
          return;
        }
        fetch(
          `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/dynamic?from=${fromTimestamp}&to=${toTimestamp}`,
          {
            headers: {
              Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
          .then(async (response: Response) => {
            if (response.ok) {
              const dynamicData =
                (await response.json()) as DynamicLandscapeData;
              resolve(dynamicData);
            } else {
              reject();
            }
          })
          .catch((e) => reject(e));
      });
    },
  }));
