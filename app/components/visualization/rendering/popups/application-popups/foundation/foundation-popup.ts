import Component from '@glimmer/component';
import { action } from '@ember/object';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';

interface Args {
  application: Application;
}

export default class FoundationPopup extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @action
  onClick(event: MouseEvent) {
    if (event.shiftKey) {
      event.preventDefault();
    }
  }
}
