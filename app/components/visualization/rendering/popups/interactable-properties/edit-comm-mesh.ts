import Component from '@glimmer/component';
import { action } from '@ember/object';
//import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';

interface Args {
  aggregatedClassComm: AggregatedClassCommunication;
}

export default class EditCommMesh extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @action
  deleteComm() {
    this.landscapeRestructure.deleteCommunication(
      this.args.aggregatedClassComm
    );
  }

  get isDeleted() {
    return !this.landscapeRestructure.deletedDataModels.some(
      (entity) => entity === this.args.aggregatedClassComm
    );
  }
}
