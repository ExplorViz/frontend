import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/template';
import { isBlank } from '@ember/utils';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import ApplicationSearchLogic from 'explorviz-frontend/utils/application-search-logic';
import $ from 'jquery';

interface Args {
  removeToolsSidebarComponent(nameOfComponent: string): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @tracked
  searchString: string = '';

  @tracked
  selected: any[] = [];

  searchLogic!: ApplicationSearchLogic;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.searchLogic = new ApplicationSearchLogic(getOwner(this));
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
    // Handle case that entry was removed (user selected already selected class again)
    if (
      this.selected.length > emberPowerSelectObject.length ||
      emberPowerSelectObject.length < 1
    ) {
      this.removeEntry();
      this.selected = [...emberPowerSelectObject];
      return;
    }

    this.selected = [...emberPowerSelectObject];
    const addedEntity = emberPowerSelectObject.slice(-1)[0];

    this.highlightingService.highlightById(
      addedEntity.modelId,
      undefined,
      true
    );
  }

  private removeEntry() {
    if (!this.selected || this.selected.length < 1) {
      return;
    }
    const removedEntry = this.selected.slice(-1)[0];
    this.highlightingService.unhighlightById(removedEntry.modelId);
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
