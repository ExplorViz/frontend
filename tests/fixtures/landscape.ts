import type { Comm } from '../../src/utils/landscape-schemes/dynamic/communication';
import type {
  Building,
  City,
  District,
} from '../../src/utils/landscape-schemes/flat-landscape';

export const city: City = {
  id: 'city',
  name: 'Shop',
  type: 'code',
  telemetryKey: 'service.shop',
  buildingIds: [],
  districtIds: ['district'],
  allContainedBuildingIds: ['building'],
  allContainedDistrictIds: ['district'],
};
export const district: District = {
  id: 'district',
  name: 'checkout',
  type: 'code',
  telemetryKey: 'shop.checkout',
  parentCityId: city.id,
  buildingIds: ['building'],
  districtIds: [],
};
export const building: Building = {
  id: 'building',
  name: 'Payment',
  type: 'code',
  telemetryKey: 'shop.checkout.Payment',
  parentCityId: city.id,
  parentDistrictId: district.id,
};
export const communication: Comm = {
  id: 'call',
  sourceEntityKey: 'shop.checkout.Payment',
  targetEntityKey: 'db',
  isBidirectional: false,
  fromUnixNano: 0n,
  toUnixNano: 100n,
  metrics: { count: 3 },
};
