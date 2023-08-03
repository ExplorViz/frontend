import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
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

  get clazzCount() {
    return getAllClassesInApplication(this.args.application).length;
  }

  get packageCount() {
    return getAllPackagesInApplication(this.args.application).length;
  }
}
