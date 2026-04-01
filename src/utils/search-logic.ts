import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  Building,
  City,
  District,
  isCity,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export default function getPossibleEntityNames(name: string) {
  const searchString = name.toLowerCase();

  const allEntities = new Map<string, City | District | Building>([
    ...Object.entries(useModelStore.getState().cities),
    ...Object.entries(useModelStore.getState().districts),
    ...Object.entries(useModelStore.getState().buildings),
  ]);

  const returnValue: any[] = [];
  const returnValueIncludedModelIds: any[] = [];

  const entriesArray = Array.from(allEntities.entries());

  for (let i = 0; i < entriesArray.length; i++) {
    const [, value] = entriesArray[i];

    if (returnValue.length === 10) {
      break;
    }

    if (
      (value.name.toLowerCase().includes(searchString) ||
        value.fqn?.toLowerCase().includes(searchString)) &&
      !returnValueIncludedModelIds.includes(value.id)
    ) {
      returnValueIncludedModelIds.push(value.id);
      returnValue.push({
        fqn: value.fqn,
        modelId: value.id,
        applicationName: isCity(value)
          ? value.name
          : useModelStore.getState().getCity(value.parentCityId)?.name,
      });
    }
  }

  return returnValue;
}
