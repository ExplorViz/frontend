import { getAllPackagesInApplication } from './application-helpers';
import {
  Package,
  Class,
  StructureLandscapeData,
} from './landscape-schemes/structure-data';

/**
 * Returns the package's classes
 */
export function getClassesInPackage(pckg: Package, recursive = true): Class[] {
  if (!recursive) {
    return [...pckg.classes];
  }

  return [
    ...pckg.classes,
    ...pckg.subPackages
      .map((subPackage) => getClassesInPackage(subPackage))
      .flat(),
  ];
}

/**
 * Returns the package's sub-packages
 */
export function getSubPackagesOfPackage(
  pckg: Package,
  recursive = true
): Package[] {
  if (!recursive) {
    return [...pckg.subPackages];
  }

  return [
    ...pckg.subPackages,
    ...pckg.subPackages
      .map((subPackage) => getSubPackagesOfPackage(subPackage))
      .flat(),
  ];
}

/**
 * Returns an array of ancestor packages sorted and starting
 * with the package's parent at index 0, if parent exists
 */
export function getAncestorPackages(pckg: Package): Package[] {
  if (!pckg.parent) {
    return [];
  }

  return [pckg.parent, ...getAncestorPackages(pckg.parent)];
}

export function packageContainsClass(
  component: Package,
  clazz: Class
): boolean {
  return (
    component.classes.includes(clazz) ||
    (component.subPackages.length > 0 &&
      component.subPackages.some((subPackage) =>
        packageContainsClass(subPackage, clazz)
      ))
  );
}

export function getPackageById(
  landscapeStructure: StructureLandscapeData,
  id: string
): Package | undefined {
  for (const node of landscapeStructure.nodes) {
    for (const application of node.applications) {
      const allPackagesinApplication = getAllPackagesInApplication(application);

      const possibleMatch = allPackagesinApplication.find(
        (pckg) => pckg.id === id
      );

      if (possibleMatch) {
        return possibleMatch;
      }
    }
  }

  return undefined;
}
