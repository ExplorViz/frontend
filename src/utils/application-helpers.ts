import {
  Application,
  Class,
  Package,
  TypeOfAnalysis,
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

export function getAllPackageIdsInApplications(
  applications: Application | Application[]
): string[] {
  const apps = applications instanceof Array ? applications : [applications];
  let packageIds: string[] = [];
  apps.forEach((app) => {
    packageIds = packageIds.concat(
      getAllPackagesInApplication(app).map(
        (containedPackage) => containedPackage.id
      )
    );
  });
  return packageIds;
}

export function getAllPackagesInApplicationForGivenOrigin(
  application: Application,
  originOfData: TypeOfAnalysis
): Package[] {
  const staticPackages: Package[] = [];

  function collectStaticPackages(pkg: Package) {
    if (pkg.originOfData.includes(originOfData)) {
      staticPackages.push(pkg);
    }
    pkg.subPackages.forEach(collectStaticPackages);
  }

  application.packages.forEach(collectStaticPackages);

  return staticPackages;
}

export function getAllClassesInApplication(application: Application) {
  return getAllPackagesInApplication(application)
    .map((pckg) => pckg.classes)
    .flat();
}

export function getAllClassesInApplications(
  applications: Application | Application[]
): Class[] {
  const apps = applications instanceof Array ? applications : [applications];
  let classes: Class[] = [];
  apps.forEach((app) => {
    classes = classes.concat(getAllClassesInApplication(app));
  });
  return classes;
}

export function getAllClassesInApplicationForGivenOrigin(
  application: Application,
  originOfData: TypeOfAnalysis
): Class[] {
  const staticClasses: Class[] = [];

  function collectStaticClasses(pkg: Package) {
    pkg.classes.forEach((clazz) => {
      if (clazz.originOfData.includes(originOfData)) {
        staticClasses.push(clazz);
      }
    });

    pkg.subPackages.forEach(collectStaticClasses);
  }

  application.packages.forEach(collectStaticClasses);

  return staticClasses;
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
