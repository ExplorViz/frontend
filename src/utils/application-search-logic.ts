import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';

export default function getPossibleEntityNames(name: string) {
  const searchString = name.toLowerCase();

  let allEntities: Map<string, any> = new Map();

  const applications = useApplicationRepositoryStore.getState().getAll();

  for (const application of applications) {
    allEntities = new Map([
      ...allEntities,
      ...application.flatData.packageNameModelMap,
      ...application.flatData.hashCodeClassMap,
    ]);
  }

  const returnValue: any[] = [];
  const returnValueIncludedModelIds: any[] = [];

  const entriesArray = Array.from(allEntities.entries());

  for (let i = 0; i < entriesArray.length; i++) {
    const [, value] = entriesArray[i];

    if (returnValue.length === 10) {
      break;
    }

    if (
      value.fqn.toLowerCase().includes(searchString) &&
      !returnValueIncludedModelIds.includes(value.modelId)
    ) {
      returnValueIncludedModelIds.push(value.modelId);
      returnValue.push(value);
    }
  }

  return returnValue;
}
