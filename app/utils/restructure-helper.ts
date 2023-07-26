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
  let myNode: Node = {
      id: 'newNode' + counter,
      ipAddress: '192.168.1.' + counter,
      hostName: 'new Node' + counter,
      applications: []
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

    myNode.applications.push(myApplication);

    landscapeStructure.nodes.push(myNode as Node);
}

export function addSubPackageToPackage(pckg: Package, counter: number) {
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

export function addPackageToApplication(app: Application, counter: number) {
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
  app.packages.push(newPckg);
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

export function removeApplication(landscapeStructure: StructureLandscapeData, app: Application) {
  
  var parentNode = app.parent;
  console.log("parent: ");
  console.log(parentNode);
  //parentNode.applications = parentNode.applications.filter(appl => appl.id != app.id);
  landscapeStructure.nodes = landscapeStructure.nodes.filter(node => node.id != parentNode.id);
  app.packages = [];
}

export function removePackageFromApplication(pckg: Package) {
  var parentPackage = pckg.parent;
  console.log("parent: ");
  console.log(parentPackage);
  if(parentPackage)
    parentPackage.subPackages = parentPackage.subPackages.filter(packg => packg.id != pckg.id);
}

export function removeClassFromPackage(clazz: Class) {
  var parentPackage = clazz.parent;
  console.log("parent: ");
  console.log(parentPackage);
  if(parentPackage)
    parentPackage.classes = parentPackage.classes.filter(clzz => clzz.id != clazz.id);
}

