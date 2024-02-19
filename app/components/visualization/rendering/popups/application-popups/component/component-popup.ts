import GlimmerComponent from '@glimmer/component';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import generateUuidv4 from 'explorviz-frontend/utils/helpers/uuid4-generator';

interface Args {
  component: Package;
}

export default class ComponentPopup extends GlimmerComponent<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  htmlIdUnique = generateUuidv4();
}
