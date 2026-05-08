import {
  Application,
  Class,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  getSubPackagesOfPackage,
  packageContainsClass,
} from 'explorviz-frontend/src/utils/package-helpers';

export function getAllPackagesInApplication(application: Application) {
  return [
    ...application.packages,
    ...application.packages.map((pckg) => getSubPackagesOfPackage(pckg)).flat(),
  ];
}

export function getAllClassesInApplication(application: Application) {
  const classes = getAllPackagesInApplication(application)
    .map((pckg) => pckg.classes)
    .flat();
  if (application.classes) {
    classes.push(...application.classes);
  }
  return classes;
}

export function getAllClassIdsInApplication(application: Application) {
  return getAllClassesInApplication(application).map(
    (containedClass) => containedClass.id
  );
}

export function getAllClassIdsInApplications(
  applications: Application | Application[]
) {
  const apps = applications instanceof Array ? applications : [applications];
  let classIds: string[] = [];
  apps.forEach((app) => {
    classIds = classIds.concat(getAllClassIdsInApplication(app));
  });
  return classIds;
}

export function getAllMethodsInApplication(application: Application) {
  return getAllClassesInApplication(application)
    .map((clss) => clss.methods)
    .flat();
}

export function getAllMethodHashCodesInApplication(application: Application) {
  return getAllMethodsInApplication(application)
    .map((method) => method.methodHash)
    .flat();
}

export function applicationHasClass(application: Application, clazz: Class) {
  return application.packages.some((component) =>
    packageContainsClass(component, clazz)
  );
}
