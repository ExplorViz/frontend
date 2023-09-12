import Component from '@glimmer/component';
import { action } from '@ember/object';
//import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';

interface Args {
  drawableClassComm: DrawableClassCommunication;
}

export default class EditCommMesh extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @action
  deleteComm() {
    this.landscapeRestructure.deleteCommunication(this.args.drawableClassComm);
  }

  get isDeleted() {
    return !(this.landscapeRestructure.deletedDataModels.some((entity) => entity === this.args.drawableClassComm));
  }
}
