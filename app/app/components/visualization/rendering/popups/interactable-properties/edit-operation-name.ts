import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { next } from '@ember/runloop';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { tracked } from '@glimmer/tracking';
import ClassCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/class-communication';

interface Args {
  communication: ClassCommunication;
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
    this.isSaving = true;
    this.save();
  }

  save() {
    if (this.args.communication.operationName !== this.operationName) {
      this.landscapeRestructure.renameOperation(
        this.args.communication,
        this.operationName
      );
      next(() => (this.isEditing = false));
    } else {
      this.isEditing = false;
    }
  }
}
