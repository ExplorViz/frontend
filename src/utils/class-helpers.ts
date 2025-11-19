import { getAllClassesInApplication } from 'explorviz-frontend/src/utils/application-helpers';
import {
  Class,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getAncestorPackages } from 'explorviz-frontend/src/utils/package-helpers';

export function getClassAncestorPackages(classModel: Class) {
  return [classModel.parent, ...getAncestorPackages(classModel.parent)];
}

export function getClassMethodHashCodes(classModel: Class) {
  return classModel.methods.map((method) => method.methodHash);
}

export function getClassMethodByName(classModel: Class, methodName: string) {
  return classModel.methods.find((method) => method.name === methodName);
}

export function getClassById(
  landscapeData: StructureLandscapeData,
  classId: string
) {
  let classModel: Class | undefined;

  if (landscapeData) {
    for (const node of landscapeData.nodes) {
      for (const app of node.applications) {
        const allClasses = getAllClassesInApplication(app);
        classModel = allClasses.find((c) => c.id === classId);
        if (classModel) return classModel;
      }
    }
  }
  return classModel;
}
