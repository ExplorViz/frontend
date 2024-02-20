import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import $ from 'jquery';
import { getOwner } from '@ember/application';
import { htmlSafe } from '@ember/template';
import { tracked } from '@glimmer/tracking';
import ApplicationSearchLogic from 'explorviz-frontend/utils/application-search-logic';
import LocalUser from 'collaboration/services/local-user';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

interface Args {
  removeToolsSidebarComponent(nameOfComponent: string): void;
}
/* eslint-disable require-yield */
export default class ApplicationSearch extends GlimmerComponent<Args> {
  @service('local-user')
  localUser!: LocalUser;

  @service
  applicationRenderer!: ApplicationRenderer;

  @tracked
  searchString: string = '';

  @tracked
  selected: string[] = [];

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
    if (emberPowerSelectObject.length < 1) {
      this.selected = [];
      return;
    }

    this.selected = [...emberPowerSelectObject];

    for (const selectedEntity of emberPowerSelectObject) {
      this.pingEntity(selectedEntity);

      this.searchLogic.highlightEntityMeshByModelId(
        selectedEntity.modelId,
        selectedEntity.applicationModelId
      );
    }
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

  private pingEntity(entity: any) {
    const applicationObject3D = this.applicationRenderer.getApplicationById(
      entity.applicationModelId
    );

    if (applicationObject3D) {
      const mesh = applicationObject3D.getBoxMeshbyModelId(entity.modelId);

      this.localUser.ping(mesh!, mesh!.getWorldPosition(mesh!.position), 2000);
    }
  }
}
