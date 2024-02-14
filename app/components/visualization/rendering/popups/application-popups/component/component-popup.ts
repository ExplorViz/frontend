import GlimmerComponent from '@glimmer/component';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

interface Args {
  component: Package;
}

export default class ComponentPopup extends GlimmerComponent<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;
}
