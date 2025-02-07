import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import $ from 'jquery';
import { htmlSafe } from '@ember/template';
import { tracked } from '@glimmer/tracking';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import getPossibleEntityNames from 'explorviz-frontend/utils/application-search-logic';

/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent {
  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @tracked
  searchString: string = '';

  @tracked
  selected: any[] = [];

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
  initPowerSelect() {
    // Remove arrow from powerselect
    $('.ember-power-select-status-icon').remove();

    // Place cursor into text input field
    const inputField = document.querySelector(
      '.ember-power-select-trigger-multiple-input'
    );
    if (inputField instanceof HTMLInputElement) {
      inputField.focus();
    }
  }

  @action
  onSelect(emberPowerSelectObject: any[]) {
    // Handle case that entry was removed (user selected already selected class again)
    if (
      this.selected.length > emberPowerSelectObject.length ||
      emberPowerSelectObject.length < 1
    ) {
      this.removeEntry(this.selected, emberPowerSelectObject);
      return;
    }

    this.selected = [...emberPowerSelectObject];
    const addedEntity = emberPowerSelectObject.slice(-1)[0];

    this.localUser.pingByModelId(
      addedEntity.modelId,
      addedEntity.applicationModelId,
      { durationInMs: 3500, nonrestartable: true }
    );
  }

  @action
  onClick(clickedElement: any) {
    if (!clickedElement) {
      return;
    }
    this.localUser.pingByModelId(
      clickedElement.modelId,
      clickedElement.applicationModelId,
      { durationInMs: 3500, nonrestartable: true }
    );
  }

  @action
  highlightAllSelectedEntities() {
    for (const selectedEntity of this.selected) {
      this.highlightingService.highlightById(
        selectedEntity.modelId,
        undefined,
        true
      );
    }
  }

  @action
  pingAllSelectedEntities() {
    for (const selectedEntity of this.selected) {
      this.localUser.pingByModelId(
        selectedEntity.modelId,
        selectedEntity.applicationModelId,
        { durationInMs: 3500, nonrestartable: true }
      );
    }
  }

  private removeEntry(oldSelection: any[], newSelection: any[]) {
    if (!oldSelection || oldSelection.length < 1 || !newSelection) {
      return;
    }

    /*const removedEntries = oldSelection.filter(
      (x) => !newSelection.includes(x)
    );
    if (removedEntries.length > 0) {
      // Expecting only one entry to be removed
      this.highlightingService.unhighlightById(removedEntries[0].modelId);
    }*/
    this.selected = [...newSelection];
  }

  @action
  searchEntity(term: string) {
    if (isBlank(term)) {
      return [];
    }

    // used for highlighting of substring in found matches
    this.searchString = term;

    return getPossibleEntityNames(term);
  }
}
