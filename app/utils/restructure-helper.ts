import { count } from "console";
import { getAllClassesInApplication, getAllPackagesInApplication } from "./application-helpers";
import { StructureLandscapeData, Node, Application, Package, Class, isApplication, isPackage, isClass } from "./landscape-schemes/structure-data";
import { getApplicationFromPackage, getApplicationInLandscapeById } from "./landscape-structure-helpers";
import { cli } from "webpack";

export function setApplicationNameInLandscapeById(
  landscapeStructure: StructureLandscapeData,
  id: string,
  name: string
): StructureLandscapeData {
  const application = getApplicationInLandscapeById(landscapeStructure, id)
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

      const packageToRename = allPackagesinApplication.find(pckg => pckg.id === id);

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
  const application = getApplicationInLandscapeById(landscapeStructure, appId);
  if(application){
    const allClassesInApplication = getAllClassesInApplication(application);
    const classToRename = allClassesInApplication.find(cls => cls.id === id);

    if(classToRename) {
      classToRename.name = name;
    }
  }
  return landscapeStructure
}

export function addFoundationToLandscape(landscapeStructure: StructureLandscapeData, counter: number) {
  const myNode: Node = {
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
    
    myApplication.parent = myNode;

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
  newPckg.parent = pckg;
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
  newClass.parent = pckg;
}

export function removeApplication(landscapeStructure: StructureLandscapeData, app: Application) {
  
  const parentNode = app.parent;

  // If the node contains only of the one application, then delete the whole node, otherwise remove application from node.
  if(parentNode.applications.length <= 1)
    landscapeStructure.nodes = landscapeStructure.nodes.filter(node => node.id != parentNode.id);
  else
    parentNode.applications = parentNode.applications.filter(appl => appl.id != app.id);
  
  app.packages = [];
}

export function removePackageFromApplication(landscapeStructure: StructureLandscapeData, pckg: Package) {
  const parentPackage = pckg.parent;

  // if parent is another package then remove current package from parents subpackage list, else remove the whole application
  if(parentPackage) {
    parentPackage.subPackages = parentPackage.subPackages.filter(packg => packg.id != pckg.id);
  } else {
    const parentApplication = getApplicationFromPackage(landscapeStructure, pckg.id);

    // if applications only package is this package, then remove whole application, else remove package from applications package list
    if(parentApplication && parentApplication.packages.length <= 1){
      removeApplication(landscapeStructure, parentApplication);
    } else if (parentApplication && parentApplication.packages.length > 1){
      parentApplication.packages = parentApplication.packages.filter(packg => packg.id !== pckg.id);
      delete pckg.parent;
    }
  }
}

export function removeClassFromPackage(clazz: Class) {
  const parentPackage = clazz.parent;
  if(parentPackage)
    parentPackage.classes = parentPackage.classes.filter(clzz => clzz.id != clazz.id);
}


export function cutAndInsertPackageOrClass(clipped: any, destination: any, landscapeStructure: StructureLandscapeData) {
  const parentPackage = clipped.parent;

  if(parentPackage) {
    if(isPackage(clipped)) {
      if(isPackage(parentPackage)) {
        parentPackage.subPackages = parentPackage?.subPackages.filter((packg: Package) => packg.id != clipped.id);
      }
      if(isPackage(destination)) {
        destination.subPackages.push(clipped);
        clipped.parent = destination;
      } else if(isApplication(destination)) {
        destination.packages.push(clipped);
        delete clipped.parent;
      }
    } else if(isClass(clipped)) {
      parentPackage.classes = parentPackage.classes.filter((clzz: Class) => clzz.id != clipped.id);
      destination.classes.push(clipped);
    }
  } else {
    const parentApplication = getApplicationFromPackage(landscapeStructure, clipped.id);
    if(parentApplication && parentApplication.packages.length <= 1){
      removeApplication(landscapeStructure, parentApplication);
    } else if (parentApplication && parentApplication.packages.length > 1){
      parentApplication.packages = parentApplication.packages.filter(packg => packg.id !== clipped.id);
    }
    if(isPackage(destination)){
      destination.subPackages.push(clipped);
      clipped.parent = destination;
    } else if(isApplication(destination)){ 
      destination.packages.push(clipped);
      delete clipped.parent;
    }
  }
}
