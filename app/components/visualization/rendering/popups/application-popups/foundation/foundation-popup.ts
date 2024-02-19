import Component from '@glimmer/component';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import generateUuidv4 from 'explorviz-frontend/utils/helpers/uuid4-generator';

interface Args {
  application: Application;
}

export default class FoundationPopup extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  htmlIdUnique = generateUuidv4();
}
