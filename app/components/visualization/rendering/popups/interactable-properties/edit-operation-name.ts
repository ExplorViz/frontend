import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { next } from '@ember/runloop';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { tracked } from '@glimmer/tracking';

interface Args {
  communication: DrawableClassCommunication;
}

export default class EditOperationName extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @tracked
  isEditing = false;

  @tracked
  operationName = this.args.communication.operationName;

  isSaving = false;

  @action
  edit() {
    if (this.landscapeRestructure.restructureMode) {
      this.isEditing = true;
      this.operationName = this.args.communication.operationName;
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
    console.log('enter');
    this.isSaving = true;
    this.save();
  }

  save() {
    if (this.args.communication.operationName !== this.operationName) {
      this.landscapeRestructure.updateOperationName(
        this.args.communication.targetClass,
        this.args.communication.operationName,
        this.operationName
      );
      next(() => (this.isEditing = false));
      console.log(this.args.communication.targetClass);
    } else {
      this.isEditing = false;
    }
  }
}
