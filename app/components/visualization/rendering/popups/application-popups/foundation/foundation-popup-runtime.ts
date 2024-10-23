import Component from '@glimmer/component';
import {
  Application,
  TypeOfAnalysis,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  getAllClassesInApplicationForGivenOrigin,
  getAllPackagesInApplicationForGivenOrigin,
} from 'explorviz-frontend/utils/application-helpers';

interface Args {
  application: Application;
}

export default class FoundationPopup extends Component<Args> {
  get clazzCount() {
    return getAllClassesInApplicationForGivenOrigin(
      this.args.application,
      TypeOfAnalysis.Dynamic
    ).length;
  }

  get packageCount() {
    return getAllPackagesInApplicationForGivenOrigin(
      this.args.application,
      TypeOfAnalysis.Dynamic
    ).length;
  }
}
