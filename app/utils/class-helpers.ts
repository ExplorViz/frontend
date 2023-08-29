import { getAllClassesInApplication } from './application-helpers';
import {
  Class,
  StructureLandscapeData,
} from './landscape-schemes/structure-data';
import { getAncestorPackages } from './package-helpers';

export function getClassAncestorPackages(clss: Class) {
  return [clss.parent, ...getAncestorPackages(clss.parent)];
}

export function getClassMethodHashCodes(clss: Class) {
  return clss.methods.map((method) => method.hashCode);
}

export function getClassMethodByName(clss: Class, methodName: string) {
  return clss.methods.find((method) => method.name === methodName);
}

export function getClassById(
  landscapeData: StructureLandscapeData,
  clssId: string
) {
  let clazz: Class | undefined;

  if (landscapeData) {
    for (const node of landscapeData.nodes) {
      for (const app of node.applications) {
        const allClasses = getAllClassesInApplication(app);
        clazz = allClasses.find((c) => c.id === clssId);
        if (clazz) return clazz;
      }
    }
  }
}
