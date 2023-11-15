import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Application, Class, StructureLandscapeData } from './landscape-schemes/structure-data';
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

export function getAllClassIdsInApplication(application: Application) {
  return getAllClassesInApplication(application).map(
    (containedClass) => containedClass.id
  );
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
  return application.packages.any((component) =>
    packageContainsClass(component, clazz)
  );
}

export function getNodeFromApplication(structure: StructureLandscapeData, app: Application){
  structure.nodes.find(node => node.applications.find(application => application.id === app.id) !== undefined);
}
