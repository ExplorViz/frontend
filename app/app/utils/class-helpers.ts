import { getAllClassesInApplication } from 'some-react-lib/src/utils/application-helpers';
import {
  Class,
  StructureLandscapeData,
} from 'some-react-lib/src/utils/landscape-schemes/structure-data';
import { getAncestorPackages } from 'some-react-lib/src/utils/package-helpers';

export function getClassAncestorPackages(clss: Class) {
  return [clss.parent, ...getAncestorPackages(clss.parent)];
}

export function getClassMethodHashCodes(clss: Class) {
  return clss.methods.map((method) => method.methodHash);
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
  return clazz;
}
