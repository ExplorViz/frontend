import Component from '@glimmer/component';
import { next } from '@ember/runloop';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';

interface Args {
  application: Application;
}

export default class ApplicationPopup extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @tracked
  isEditing = false;

  @tracked
  tempName = this.args.application.name;

  @action
  edit() {
    if (this.landscapeRestructure.restructureMode) {
      this.isEditing = true;
      this.tempName = this.args.application.name;
    }
  }

  @action
  save() {
    this.landscapeRestructure.updateApplicationName(
      this.tempName,
      this.args.application.id
    );
    next(() => this.isEditing = false);
  }

  get clazzCount() {
    return getAllClassesInApplication(this.args.application).length;
  }

  get packageCount() {
    return getAllPackagesInApplication(this.args.application).length;
  }
}
