import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import {
  getAllAncestorComponents,
  openComponentsByList,
} from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';

/**
 * @class ApplicationSearchLogic
 *
 * @module explorviz
 */
export default class ApplicationSearchLogic {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service
  applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  constructor(owner: any) {
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
  }

  getPossibleEntityNames(name: string) {
    const searchString = name.toLowerCase();

    let allEntities: Map<string, any> = new Map();

    const applications = this.applicationRepo.getAll();

    for (const application of applications) {
      allEntities = new Map([...allEntities, ...application.flatData]);
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

  highlightEntityMeshByModelId(modelId: string, applicationModelId: string) {
    const clazzMesh = this.applicationRenderer.getBoxMeshByModelId(
      modelId
    ) as ClazzMesh;

    const applicationObject3D =
      this.applicationRenderer.getApplicationById(applicationModelId);

    if (applicationObject3D) {
      openComponentsByList(
        getAllAncestorComponents(clazzMesh.dataModel),
        applicationObject3D
      );

      this.highlightingService.highlight(clazzMesh, {
        sendMessage: true,
      });
    }
  }
}
