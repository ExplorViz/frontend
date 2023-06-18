import { getAllClassesInApplication, getAllPackagesInApplication } from "./application-helpers";
import { StructureLandscapeData, Package, Class } from "./landscape-schemes/structure-data";
import { getApplicationInLandscapeById } from "./landscape-structure-helpers";

export function setApplicationNameInLandscapeById(
  landscapeStructure: StructureLandscapeData,
  id: string,
  name: string
): StructureLandscapeData {
  let application = getApplicationInLandscapeById(landscapeStructure, id)
  if(application)
    application.name = name;
  
  return landscapeStructure;
}

export function setPackageNameById(
  landscapeStructure:StructureLandscapeData,
  id: string,
  name: string
): StructureLandscapeData {
  landscapeStructure.nodes.forEach((node) => {
    node.applications.forEach((application) => {
      const allPackagesinApplication = getAllPackagesInApplication(application)

      let packageToRename = allPackagesinApplication.find(pckg => pckg.id === id);

      if(packageToRename) {
        packageToRename.name = name;
        return landscapeStructure;
      }
    })
  });
  return landscapeStructure;
}

export function setClassNameById(
  landscapeStructure: StructureLandscapeData,
  appId: string,
  id: string,
  name: string
): StructureLandscapeData {
  let application = getApplicationInLandscapeById(landscapeStructure, appId);
  if(application){
    const allClassesInApplication = getAllClassesInApplication(application);
    let classToRename = allClassesInApplication.find(cls => cls.id === id);

    if(classToRename) {
      classToRename.name = name;
    }
  }
  return landscapeStructure
}

export function addPackageToApplication(pckg: Package) {
  const newPckg: Package = {
    id: 'newPackage',
    name: 'newPackage1',
    subPackages: [],
    classes: [],
  };

  const newClass: Class = {
    id: 'class123',
    name: 'My Class23',
    methods: [],
    parent: newPckg
  };

  newPckg.classes.push(newClass);
  pckg.subPackages.push(newPckg);
}

