import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import $ from 'jquery';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { htmlSafe } from '@ember/template';
import { tracked } from '@glimmer/tracking';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import {
  getAllAncestorComponents,
  openComponentsByList,
} from 'explorviz-frontend/utils/application-rendering/entity-manipulation';

interface Args {
  removeToolsSidebarComponent(nameOfComponent: string): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service
  applicationRenderer!: ApplicationRenderer;

  componentLabel = '-- Components --';

  clazzLabel = '-- Classes --';

  @tracked
  searchString: string = '';

  @tracked
  selected: string[] = [];

  @action
  formatEntry(potentialResult: string) {
    if (this.selected && this.selected.length < 0) {
      return this.selected;
    }

    if (potentialResult) {
      return htmlSafe(
        potentialResult.replace(
          new RegExp(this.searchString, 'gi'),
          `<strong>$&</strong>`
        )
      );
    }

    return this.selected;
  }

  @action
  /* eslint-disable-next-line class-methods-use-this */
  removePowerselectArrow() {
    $('.ember-power-select-status-icon').remove();
  }

  @action
  onSelect(emberPowerSelectObject: any[]) {
    if (emberPowerSelectObject.length < 1) {
      this.selected = [];
      return;
    }

    this.selected = [...emberPowerSelectObject];

    const firstEntity = emberPowerSelectObject[0];

    console.log('onselect', firstEntity.modelId);

    const clazzModel = (
      this.applicationRenderer.getBoxMeshByModelId(
        firstEntity.modelId
      ) as ClazzMesh
    ).dataModel;

    const applicationObject3D = this.applicationRenderer.getApplicationById(
      firstEntity.applicationModelId
    );

    if (applicationObject3D) {
      openComponentsByList(
        getAllAncestorComponents(clazzModel),
        applicationObject3D
      );

      this.applicationRenderer.highlightModel(
        clazzModel,
        firstEntity.applicationModelId
      );
    }
  }

  @action
  close() {
    this.args.removeToolsSidebarComponent('application-search');
  }

  searchEntity = task({ restartable: true }, async (term: string) => {
    if (isBlank(term)) {
      return [];
    }
    this.searchString = term;

    return await this.getPossibleEntityNames.perform(term);
  });

  getPossibleEntityNames = task(async (name: string) => {
    const searchString = name.toLowerCase();

    let allEntities: Map<string, any> = new Map();

    const applications = this.applicationRepo.getAll();

    for (const application of applications) {
      allEntities = new Map([...allEntities, ...application.flatData]);
    }

    const returnValue: any[] = [];

    const entriesArray = Array.from(allEntities.entries());

    for (let i = 0; i < entriesArray.length; i++) {
      const [, value] = entriesArray[i];

      if (returnValue.length === 10) {
        break;
      }

      if (value.fqn.toLowerCase().includes(searchString)) {
        returnValue.push(value);
      }
    }

    return returnValue;
  });
}
