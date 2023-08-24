import Component from '@glimmer/component';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';

interface Args {
  application: Application;
}

export default class FoundationPopup extends Component<Args> {
  get clazzCount() {
    return getAllClassesInApplication(this.args.application).length;
  }

  get packageCount() {
    return getAllPackagesInApplication(this.args.application).length;
  }
}
