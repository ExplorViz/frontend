import Component from '@glimmer/component';
import { next } from '@ember/runloop';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import {
  isApplication,
  isClass,
  isPackage,
} from 'react-lib/src/utils/landscape-schemes/structure-data';

interface Args {
  entity: any;
  appId: string;
}

export default class InteractiveHeader extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @tracked
  isEditing = false;

  @tracked
  name = this.args.entity.name;

  isSaving = false;

  @action
  edit() {
    if (this.landscapeRestructure.restructureMode) {
      this.isEditing = true;
      this.name = this.args.entity.name;
    }
  }

  @action
  handleFocusOut() {
    if (this.isSaving) {
      this.isSaving = false;
    } else {
      this.save();
    }
  }

  @action
  handleEnter() {
    this.isSaving = true;
    this.save();
  }

  save() {
    if (this.args.entity.name !== this.name) {
      if (isApplication(this.args.entity))
        this.landscapeRestructure.renameApplication(
          this.name,
          this.args.entity.id
        );
      else if (isPackage(this.args.entity))
        this.landscapeRestructure.renamePackage(this.name, this.args.entity.id);
      else if (isClass(this.args.entity))
        this.landscapeRestructure.renameClass(
          this.name,
          this.args.entity.id,
          this.args.appId
        );
      next(() => (this.isEditing = false));
    } else {
      this.isEditing = false;
    }
  }
}
