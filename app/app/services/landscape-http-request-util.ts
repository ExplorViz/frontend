import { inject as service } from '@ember/service';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import ENV from 'explorviz-frontend/config/environment';
import { useAuthStore } from 'react-lib/src/stores/auth';
import LandscapeTokenService from './landscape-token';
import { setOwner } from '@ember/application';

const { spanService } = ENV.backendAddresses;

export default class LandscapeHttpRequestUtil {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  constructor(owner: any) {
    setOwner(this, owner);
  }

  async requestData(startTime: number, intervalInSeconds: number) {
    const endTime = startTime + intervalInSeconds * 1000;

    const structureDataPromise =
      this.requestStructureData(/* startTime, endTime */);
    const dynamicDataPromise = this.requestDynamicData(startTime, endTime);

    const landscapeData = Promise.allSettled([
      structureDataPromise,
      dynamicDataPromise,
    ]);

    return landscapeData;
  }

  requestStructureData(/* fromTimestamp: number, toTimestamp: number */) {
    return new Promise<StructureLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${spanService}/v2/landscapes/${this.tokenService.token.value}/structure`,
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
  }

  requestDynamicData(fromTimestamp: number, toTimestamp: number) {
    return new Promise<DynamicLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${spanService}/v2/landscapes/${this.tokenService.token.value}/dynamic?from=${fromTimestamp}&to=${toTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const dynamicData = (await response.json()) as DynamicLandscapeData;
            resolve(dynamicData);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }
}
