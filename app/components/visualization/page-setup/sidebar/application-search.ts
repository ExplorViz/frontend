import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import $ from 'jquery';
import {
  Application,
  Class,
  isClass,
  isPackage,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { htmlSafe } from '@ember/template';
import { tracked } from '@glimmer/tracking';

interface Args {
  application: Application;
  unhighlightAll(): void;
  highlightModel(entity: Class | Package): void;
  openParents(entity: Class | Package): void;
  closeComponent(component: Package): void;
  removeToolsSidebarComponent(nameOfComponent: string): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

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
  onSelect(emberPowerSelectObject: unknown[]) {
    if (emberPowerSelectObject.length < 1) {
      return;
    }

    this.selected = [...this.selected, emberPowerSelectObject[0]];

    console.log('onselect', this.selected);

    const model = emberPowerSelectObject[0];

    if (isClass(model)) {
      this.args.unhighlightAll();
      this.args.openParents(model);
      this.args.highlightModel(model);
    } else if (isPackage(model)) {
      this.args.unhighlightAll();
      this.args.openParents(model);
      this.args.closeComponent(model);
      this.args.highlightModel(model);
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

    let allEntities: any[] = [];

    const applications = this.applicationRepo.getAll();

    for (const application of applications) {
      allEntities = allEntities.concat(application.flatData);
    }

    const returnValue: any[] = [];

    // TODO use selectedItemComponent
    // https://ember-power-select.com/docs/the-trigger

    for (let i = 0; i < allEntities.length; i++) {
      if (returnValue.length === 10) {
        break;
      }
      const entity = allEntities[i];
      if (entity.fqn.toLowerCase().includes(searchString)) {
        //entity.fqn = entity.fqn.replace(searchString, `${searchString}`);
        returnValue.push(entity);
      }
    }
    return returnValue;
  });
}
