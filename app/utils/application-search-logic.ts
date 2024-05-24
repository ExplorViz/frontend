import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';

/**
 * @class ApplicationSearchLogic
 *
 * @module explorviz
 */
export default class ApplicationSearchLogic {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  constructor(owner: any) {
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
  }

  getPossibleEntityNames(name: string) {
    const searchString = name.toLowerCase();

    let allEntities: Map<string, any> = new Map();

    const applications = this.applicationRepo.getAll();

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
}
