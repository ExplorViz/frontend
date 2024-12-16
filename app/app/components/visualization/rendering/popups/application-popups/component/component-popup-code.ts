import GlimmerComponent from '@glimmer/component';
import {
  Package,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';

interface Args {
  component: Package;
}

export default class ComponentPopupCode extends GlimmerComponent<Args> {
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
    let result = component.classes.filter((clazz) =>
      clazz.originOfData.includes(TypeOfAnalysis.Static)
    ).length;
    const children = component.subPackages;
    children.forEach((child) => {
      result += this.getClazzesCount(child);
    });
    return result;
  }

  getPackagesCount(component: Package): number {
    let result = component.subPackages.filter((subPack) =>
      subPack.originOfData.includes(TypeOfAnalysis.Static)
    ).length;
    const children = component.subPackages;
    children.forEach((child) => {
      result += this.getPackagesCount(child);
    });
    return result;
  }
}
