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

  get name() {
    return this.args.component.name;
  }

  get clazzCount() {
    return this.getClazzesCount(this.args.component);
  }

  get packageCount() {
    return this.getPackagesCount(this.args.component);
  }

  getClazzesCount(component: Package): number {
    let result = component.classes.length;
    const children = component.subPackages;
    children.forEach((child) => {
      result += this.getClazzesCount(child);
    });
    return result;
  }

  getPackagesCount(component: Package): number {
    let result = component.subPackages.length;
    const children = component.subPackages;
    children.forEach((child) => {
      result += this.getPackagesCount(child);
    });
    return result;
  }
}
