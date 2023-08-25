import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import $ from 'jquery';
import { getOwner } from '@ember/application';
import { htmlSafe } from '@ember/template';
import { tracked } from '@glimmer/tracking';
import ApplicationSearchLogic from 'explorviz-frontend/utils/application-search-logic';

interface Args {
  removeToolsSidebarComponent(nameOfComponent: string): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
  @tracked
  searchString: string = '';

  @tracked
  selected: string[] = [];

  searchLogic!: ApplicationSearchLogic;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.searchLogic = new ApplicationSearchLogic(getOwner(this));
    console.log(this.searchLogic);
  }

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

    this.searchLogic.highlightEntityMeshByModelId(
      firstEntity.modelId,
      firstEntity.applicationModelId
    );
  }

  @action
  close() {
    this.args.removeToolsSidebarComponent('application-search');
  }

  @action
  searchEntity(term: string) {
    if (isBlank(term)) {
      return [];
    }

    // used for highlighting of substring in found matches
    this.searchString = term;

    return this.searchLogic.getPossibleEntityNames(term);
  }
}
