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

interface Args {
  application: Application;
  unhighlightAll(): void;
  highlightModel(entity: Class | Package): void;
  openParents(entity: Class | Package): void;
  closeComponent(component: Package): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  componentLabel = '-- Components --';

  clazzLabel = '-- Classes --';

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
    console.log('close');
  }

  searchEntity = task({ restartable: true }, async (term: string) => {
    if (isBlank(term)) {
      return [];
    }
    return await this.getPossibleEntityNames.perform(term);
  });

  getPossibleEntityNames = task(async (name: string) => {
    const searchString = name.toLowerCase();

    let allEntities: any[] = [];

    const applications = this.applicationRepo.getAll();

    for (const application of applications) {
      allEntities = allEntities.concat(application.flatData);
    }

    //console.log(allEntities);

    const returnValue: any[] = [];

    // TODO use selectedItemComponent
    // https://ember-power-select.com/docs/the-trigger

    allEntities.forEach((entity) => {
      if (entity.fqn.toLowerCase().includes(searchString)) {
        //entity.fqn = entity.fqn.replace(searchString, `${searchString}`);
        returnValue.push(entity);
      }
    });

    //console.log(returnValue);

    return returnValue;
  });
}
