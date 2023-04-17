import { Application, Class } from './landscape-schemes/structure-data';
import {
  getSubPackagesOfPackage,
  packageContainsClass,
} from './package-helpers';

export function getAllPackagesInApplication(application: Application) {
  return [
    ...application.packages,
    ...application.packages.map((pckg) => getSubPackagesOfPackage(pckg)).flat(),
  ];
}

export function getAllClassesInApplication(application: Application) {
  return getAllPackagesInApplication(application)
    .map((pckg) => pckg.classes)
    .flat();
}

export function getAllMethodsInApplication(application: Application) {
  return getAllClassesInApplication(application)
    .map((clss) => clss.methods)
    .flat();
}

export function getAllMethodHashCodesInApplication(application: Application) {
  return getAllMethodsInApplication(application)
    .map((method) => method.hashCode)
    .flat();
}

export function applicationHasClass(application: Application, clazz: Class) {
  return application.packages.some((component: any) =>
    packageContainsClass(component, clazz)
  );
}
