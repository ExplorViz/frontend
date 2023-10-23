import Component from '@glimmer/component';
import { action } from '@ember/object';
//import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';

interface Args {
  classCommunication: ClassCommunication;
}

export default class EditCommMesh extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @action
  deleteComm() {
    this.landscapeRestructure.deleteCommunication(this.args.classCommunication);
  }

  get isDeleted() {
    return !this.landscapeRestructure.deletedDataModels.some(
      (entity) => entity === this.args.classCommunication
    );
  }
}
