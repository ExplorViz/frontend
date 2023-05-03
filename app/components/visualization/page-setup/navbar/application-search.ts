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
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';
import { task } from 'ember-concurrency';

interface SearchSeperator {
  name: string;
}

interface Args {
  application: Application;
  unhighlightAll(): void;
  highlightModel(entity: Class | Package): void;
  openParents(entity: Class | Package): void;
  closeComponent(component: Package): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
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

  searchEntity = task({ restartable: true }, async (term: string) => {
    if (isBlank(term)) {
      return [];
    }
    return await this.getPossibleEntityNames.perform(term);
  });

  //TaskGenerator<(Class | Package | SearchSeperator)[]>

  getPossibleEntityNames = task(async (name: string) => {
    const searchString = name.toLowerCase();

    const latestApp = this.args.application;

    // re-calculate since there might be an update to the app (e.g. new class)
    const components = getAllPackagesInApplication(latestApp);
    const clazzes = getAllClassesInApplication(latestApp);
    const entities = [];

    const maxNumberOfCompNames = 20;
    let currentNumberOfCompNames = 0;

    function searchEngineFindsHit(
      clazzNameToCheckAgainst: string,
      searchWord: string
    ) {
      if (searchString.startsWith('*')) {
        const searchName = searchWord.substring(1);
        return clazzNameToCheckAgainst.includes(searchName);
      }
      return clazzNameToCheckAgainst.startsWith(searchWord);
    }

    let isComponentLabelSet = false;

    for (let i = 0; i < components.length; i++) {
      if (currentNumberOfCompNames === maxNumberOfCompNames) {
        break;
      }

      const component = components[i];

      const componentName = component.name.toLowerCase();
      if (searchEngineFindsHit(componentName, searchString)) {
        if (!isComponentLabelSet) {
          isComponentLabelSet = true;
          entities.push({ name: this.componentLabel } as SearchSeperator);
        }
        entities.push(component);
        currentNumberOfCompNames++;
      }
    }

    const maxNumberOfClazzNames = 20;
    let currentNumberOfClazzNames = 0;

    let isClazzLabelSet = false;

    for (let i = 0; i < clazzes.length; i++) {
      if (currentNumberOfClazzNames === maxNumberOfClazzNames) {
        break;
      }

      const clazz = clazzes[i];

      const clazzName = clazz.name.toLowerCase();
      if (searchEngineFindsHit(clazzName, searchString)) {
        if (!isClazzLabelSet) {
          isClazzLabelSet = true;
          entities.push({ name: this.clazzLabel } as SearchSeperator);
        }

        entities.push(clazz);
        currentNumberOfClazzNames++;
      }
    }
    return entities;
  });
}
