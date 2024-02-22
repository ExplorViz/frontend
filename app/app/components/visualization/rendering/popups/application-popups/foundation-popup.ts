import Component from '@glimmer/component';
import { Application } from 'some-react-lib/src/utils/landscape-schemes/structure-data';

import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'some-react-lib/src/utils/application-helpers';

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
