import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export function useLiveCity(cityId: string): City | undefined {
  return useModelStore((state) => state.cities[cityId]);
}

export function useLiveDistrict(districtId: string): District | undefined {
  return useModelStore((state) => state.districts[districtId]);
}

export function useLiveBuildings() {
  return useModelStore((state) => state.buildings);
}
