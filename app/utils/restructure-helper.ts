import { count } from "console";
import { getAllClassesInApplication, getAllPackagesInApplication } from "./application-helpers";
import { StructureLandscapeData, Node, Application, Package, Class } from "./landscape-schemes/structure-data";
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

export function addFoundationToLandscape(landscapeStructure: StructureLandscapeData, counter: number) {
  let myNode: Partial<Node> = {
      id: 'newNode' + counter,
      ipAddress: '192.168.1.' + counter,
      hostName: 'new Node' + counter,
    };

    const myApplication: Application = {
      id: 'newApp' + counter,
      name: 'New Application',
      language: 'JavaScript',
      instanceId: 'newAppId' + counter,
      parent: myNode as Node,
      packages: [],
    };

    const myPackage: Package = {
      id: 'newPackage' + counter,
      name: 'new Package',
      subPackages: [],
      classes: [],
    };

    const myClass: Class = {
      id: 'newCLass' + counter,
      name: 'New Class',
      methods: [],
      parent: myPackage,
    };

    myPackage.classes.push(myClass);

    myApplication.packages.push(myPackage);

    myNode = {
      ...myNode,
      applications: [myApplication],
    };

    landscapeStructure.nodes.push(myNode as Node);
}

export function addPackageToApplication(pckg: Package, counter: number) {
  const newPckg: Package = {
    id: 'newPackage' + counter,
    name: 'New Package',
    subPackages: [],
    classes: [],
  };

  const newClass: Class = {
    id: 'newPackageClass' + counter,
    name: 'New Package/Class',
    methods: [],
    parent: newPckg
  };

  newPckg.classes.push(newClass);
  pckg.subPackages.push(newPckg);
}

export function addClassToApplication(pckg: Package, counter: number) {
  const newClass: Class = {
    id: 'newClass' + counter,
    name: 'New Class',
    methods: [],
    parent: pckg
  };

  pckg.classes.push(newClass);
}

