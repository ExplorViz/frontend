import { count } from "console";
import { getAllClassesInApplication, getAllPackagesInApplication } from "./application-helpers";
import { StructureLandscapeData, Node, Application, Package, Class, isApplication, isPackage, isClass, Method } from "./landscape-schemes/structure-data";
import { getApplicationFromPackage, getApplicationInLandscapeById } from "./landscape-structure-helpers";
import { cli } from "webpack";
import sha256 from "crypto-js/sha256";
import { DrawableClassCommunication } from "./application-rendering/class-communication-computer";
import { getAncestorPackages, getClassesInPackage } from "./package-helpers";

export function setApplicationNameInLandscapeById(
  landscapeStructure: StructureLandscapeData,
  id: string,
  name: string
){
  const application = getApplicationInLandscapeById(landscapeStructure, id)
  if(application)
    application.name = name;
}

export function setPackageNameById(
  landscapeStructure:StructureLandscapeData,
  id: string,
  name: string
){
  landscapeStructure.nodes.forEach((node) => {
    node.applications.forEach((application) => {
      const allPackagesinApplication = getAllPackagesInApplication(application)

      const packageToRename = allPackagesinApplication.find(pckg => pckg.id === id);

      if(packageToRename) {
        packageToRename.name = name;
      }
    })
  });
}

export function setClassNameById(
  landscapeStructure: StructureLandscapeData,
  appId: string,
  id: string,
  name: string
){
  const application = getApplicationInLandscapeById(landscapeStructure, appId);
  if(application){
    const allClassesInApplication = getAllClassesInApplication(application);
    const classToRename = allClassesInApplication.find(cls => cls.id === id);

    if(classToRename) {
      classToRename.name = name;
    }
  }
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

export function addMethodToClass(clazz: Class, methodName: string) {
  const newMethod: Method = {
    name: methodName,
    hashCode: sha256(methodName).toString()
  };
  clazz.methods.push(newMethod);
}

export function removeApplication(landscapeStructure: StructureLandscapeData, commsWrapper: { comms: DrawableClassCommunication[] }, app: Application, isCutOperation: boolean, destinationApplication?: Application) {
  const parentNode = app.parent;

  if(commsWrapper.comms.length > 0) {
    const classesInApplication = getAllClassesInApplication(app);
    if(isCutOperation) {
      // if any class in application is part of a communication and information about source and target app has changed then update it
      updateAffectedCommunications(classesInApplication, commsWrapper, destinationApplication);
    } else {
      // if any class in application is part of a communication then remove it
      removeAffectedCommunications(classesInApplication, commsWrapper);
    }
  }

  // If the node contains only of the one application, then delete the whole node, otherwise remove application from node.
  if(parentNode.applications.length <= 1) {
    landscapeStructure.nodes = landscapeStructure.nodes.filter(node => node.id != parentNode.id);
  } else {
    parentNode.applications = parentNode.applications.filter(appl => appl.id != app.id);
  }
  
  app.packages = [];
}

export function removePackageFromApplication(landscapeStructure: StructureLandscapeData, commsWrapper: { comms: DrawableClassCommunication[] }, pckgToRemove: Package, isCutOperation: boolean, destinationApplication?: Application) {
  const parentPackage = pckgToRemove.parent;

  // if parent is another package then remove current package from parents subpackage list, else remove the whole application
  if(parentPackage) {
    let applicationWrapper: {app: Application | undefined} = {app: undefined};
    let deleteApp = false;

    if(parentPackage.subPackages.length + parentPackage.classes.length > 1) {
      parentPackage.subPackages = parentPackage.subPackages.filter(packg => packg.id != pckgToRemove.id);
    } else {
      deleteApp = cleanUpAncestor(landscapeStructure, parentPackage, applicationWrapper);
    }

    if(deleteApp && applicationWrapper.app) {
      removeApplication(landscapeStructure, commsWrapper, applicationWrapper.app, isCutOperation, destinationApplication);
    } else if(!deleteApp && commsWrapper.comms.length > 0) {
      const classesInPackage = getClassesInPackage(pckgToRemove);
      if(isCutOperation) {
        // if any class in package is part of a communication and information about source and target app has changed then update it
        updateAffectedCommunications(classesInPackage, commsWrapper, destinationApplication);
      } else {
        // if any class in package is part of a communication then remove it
        removeAffectedCommunications(classesInPackage, commsWrapper)
      }
    }
  } else {
    const parentApplication = getApplicationFromPackage(landscapeStructure, pckgToRemove.id);

    // if applications only package is this package, then remove whole application, else remove package from applications package list
    if(parentApplication && parentApplication.packages.length <= 1){
      removeApplication(landscapeStructure, commsWrapper, parentApplication, isCutOperation, destinationApplication);
    } else if (parentApplication && parentApplication.packages.length > 1){
      parentApplication.packages = parentApplication.packages.filter(pckg => pckg.id !== pckgToRemove.id);
      delete pckgToRemove.parent;

      if(commsWrapper.comms.length > 0) {
        // if any class in application is part of a communication then remove it
        const classesInPackage = getClassesInPackage(pckgToRemove);
        if(isCutOperation) {
          // if any class in package is part of a communication and information about source and target app has changed then update it
          updateAffectedCommunications(classesInPackage, commsWrapper, destinationApplication);
        } else {
          // if any class in package is part of a communication then remove it
          removeAffectedCommunications(classesInPackage, commsWrapper)
        }
      }
    }
  }
}

export function removeClassFromPackage(landscapeStructure: StructureLandscapeData, commsWrapper: { comms: DrawableClassCommunication[] }, clazzToRemove: Class, isCutOperation: boolean, destinationApplication?: Application) {
  const parentPackage = clazzToRemove.parent;
  if(parentPackage) {

    // if parent Package has more than 1 element, then remove the class from it else remove the parent Package
    if(parentPackage.subPackages.length + parentPackage.classes.length > 1) {
      parentPackage.classes = parentPackage.classes.filter(clzz => clzz.id != clazzToRemove.id);
      if(commsWrapper.comms.length > 0) {
        if(isCutOperation) {
          // if class in package is part of a communication and information about source and target app has changed then update it
          commsWrapper.comms.forEach(comms => {
            if (comms.sourceClass.id === clazzToRemove.id)
              comms.sourceApp = destinationApplication;
            else if (comms.targetClass.id === clazzToRemove.id)
              comms.targetApp = destinationApplication;
          });
        } else {
          // if class in package is part of a communication then remove it
          commsWrapper.comms.filter(comm => comm.sourceClass.id !== clazzToRemove.id && comm.targetClass.id !== clazzToRemove.id);
        }
      }
    } else {
      removePackageFromApplication(landscapeStructure, commsWrapper, parentPackage, isCutOperation, destinationApplication);
    }
  }
}

export function cutAndInsertPackage(landscapeStructure: StructureLandscapeData, clippedPackage: Package, clipToDestination: Application | Package,  commsWrapper: { comms: DrawableClassCommunication[] }) {
  const parentPackage = clippedPackage.parent;

  if(parentPackage) {

    let destinationApplication: Application | undefined;
    // if the destination is a package, then push the clipped object in its subpackage, else push it in the applications packages
    if(isPackage(clipToDestination)) {
      const firstPackage = getAncestorPackages(clipToDestination);
      if(firstPackage.length > 0)
        destinationApplication = getApplicationFromPackage(landscapeStructure, firstPackage[firstPackage.length-1].id);
      else
        destinationApplication = getApplicationFromPackage(landscapeStructure, clipToDestination.id);
      insertClipToDestinationPackage(clipToDestination, clippedPackage);
    } else {
      inserClipToDestinationApp(clipToDestination, clippedPackage);
      destinationApplication = clipToDestination;
    }

    if(parentPackage.subPackages.length + parentPackage.classes.length <= 1) {
      removePackageFromApplication(landscapeStructure, commsWrapper, parentPackage, true, destinationApplication);
    } else {
      parentPackage.subPackages = parentPackage.subPackages.filter((packg: Package) => packg.id != clippedPackage.id);
      if(commsWrapper.comms.length > 0) {
        const classesInPackage = getClassesInPackage(clippedPackage);
        updateAffectedCommunications(classesInPackage, commsWrapper, destinationApplication);
      }
    }
  } else {
    const application = getApplicationFromPackage(landscapeStructure, clippedPackage.id);
    let destinationApplication: Application | undefined;

    // if the destination is a package, then push the clipped object in its subpackage, else push it in the applications packages
    if(isPackage(clipToDestination)) {
      const firstPackage = getAncestorPackages(clipToDestination);
      if(firstPackage.length > 0)
        destinationApplication = getApplicationFromPackage(landscapeStructure, firstPackage[firstPackage.length-1].id);
      else
        destinationApplication = getApplicationFromPackage(landscapeStructure, clipToDestination.id);
      insertClipToDestinationPackage(clipToDestination, clippedPackage);
    } else {
      destinationApplication = clipToDestination;
      inserClipToDestinationApp(clipToDestination, clippedPackage);
    }

    if(application && application.packages.length <= 1) {
      removeApplication(landscapeStructure, commsWrapper, application, true, destinationApplication);
    } else if(application && application.packages.length > 1) {
      // remove clipped object from parent application packages
      application.packages = application.packages.filter(packg => packg.id !== clippedPackage.id);

      // if any class in package is part of a communication and information about source and target app has changed then update it
      if(commsWrapper.comms.length > 0) {
        const classesInPackage = getClassesInPackage(clippedPackage);
        updateAffectedCommunications(classesInPackage, commsWrapper, destinationApplication);
      }
    }
  }
}

export function cutAndInsertClass(landscapeStructure: StructureLandscapeData, clippedClass: Class, clipToDestination: Package, commsWrapper: { comms: DrawableClassCommunication[] }) {
  const parentPackage = clippedClass.parent;

  if(isPackage(clipToDestination)) {
    let destinationApplication: Application | undefined;
    const firstPackage = getAncestorPackages(clipToDestination);
      
    // find application of destination
    if(firstPackage.length > 0)
      destinationApplication = getApplicationFromPackage(landscapeStructure, firstPackage[firstPackage.length-1].id);
    else
      destinationApplication = getApplicationFromPackage(landscapeStructure, clipToDestination.id);
      
    if(parentPackage.subPackages.length + parentPackage.classes.length <= 1) {
      removePackageFromApplication(landscapeStructure, commsWrapper, parentPackage, true, destinationApplication);
    } else {
      removeClassFromPackage(landscapeStructure, commsWrapper, clippedClass, true, destinationApplication);
    }

    clipToDestination.classes.push(clippedClass);
    clippedClass.parent = clipToDestination;
  } 
}

function updateAffectedCommunications(classesInPackage: Class[], commsWrapper: { comms: DrawableClassCommunication[]; }, destinationApplication: Application | undefined) {
  classesInPackage.forEach(clazz => commsWrapper.comms.forEach(comms => {
    if (comms.sourceClass.id === clazz.id)
      comms.sourceApp = destinationApplication;
    else if (comms.targetClass.id === clazz.id)
      comms.targetApp = destinationApplication;
  }));
}

function inserClipToDestinationApp(clipToDestination: Application, clippedPackage: Package) {
  clipToDestination.packages.push(clippedPackage);
  delete clippedPackage.parent;
}

function insertClipToDestinationPackage(clipToDestination: Package, clippedPackage: Package) {
  clipToDestination.subPackages.push(clippedPackage);
  clippedPackage.parent = clipToDestination;
}

function removeAffectedCommunications(classesInApplication: Class[], commsWrapper: { comms: DrawableClassCommunication[]; }) {
  classesInApplication.forEach(clazz => commsWrapper.comms = commsWrapper.comms.filter(comm => comm.sourceClass.id !== clazz.id && comm.targetClass.id !== clazz.id));
}

function cleanUpAncestor(landscapeStructure: StructureLandscapeData, parentPackage: Package, applicationWrapper: {app: Application | undefined}) {
  const ancestorPackages = getAncestorPackages(parentPackage);

  /*  case 1: ancestor is the top Package meaning the highest on the hierarchy.
      case 2: there are multiple ancestors. We need to find the nearest ancestor with more than 1 element in it
      case 3: there are no ancestors since the current package is top Package, so we investigate the application
  */
  if(ancestorPackages.length == 1)
    return handleTopPackageAncestor(landscapeStructure, parentPackage, ancestorPackages, applicationWrapper);
  else if (ancestorPackages.length > 1)
    return handlePackageAncestors(landscapeStructure, parentPackage, ancestorPackages, applicationWrapper);
  else
    return handleApplicationAncestor(landscapeStructure, parentPackage, applicationWrapper);
}

function handleApplicationAncestor(landscapeStructure: StructureLandscapeData, parentPackage: Package, applicationWrapper: {app: Application | undefined}) {
  //check if the whole application has still more than 1 packages and if so then remove only the top package else the whole application
  applicationWrapper.app = getApplicationFromPackage(landscapeStructure, parentPackage.id);
  return removeUnecessaryPackages(applicationWrapper, parentPackage);
}

function handlePackageAncestors(landscapeStructure: StructureLandscapeData, parentPackage: Package, ancestorPackages: Package[], applicationWrapper: {app: Application | undefined}) {
  // find an ancestor that has more than 1 element
  let foundPackage: Package | undefined;
  foundPackage = ancestorPackages.find(pckg => pckg.subPackages.length + pckg.classes.length > 1);

  // when found delete the subpackage with the clipped object inside else check if the whole application has still more
  // packages and if so then remove only the top package else the whole application
  if(foundPackage) {
    let subPackageToRemove = parentPackage;
    const indexOfSubPackage = ancestorPackages.indexOf(foundPackage) - 1;
    if(indexOfSubPackage >= 0)
      subPackageToRemove = ancestorPackages[indexOfSubPackage];
    foundPackage.subPackages = foundPackage.subPackages.filter(pckg => pckg.id != subPackageToRemove.id);
    return false;
  } else {
    const topPackage = ancestorPackages[ancestorPackages.length - 1];
    applicationWrapper.app = getApplicationFromPackage(landscapeStructure, ancestorPackages[ancestorPackages.length - 1].id);
    return removeUnecessaryPackages(applicationWrapper, topPackage);
  }
  return true;
}

function removeUnecessaryPackages(applicationWrapper: { app: Application | undefined }, topPackage: Package) {
  if (applicationWrapper.app) {
    if (applicationWrapper.app.packages.length > 1) {
      applicationWrapper.app.packages = applicationWrapper.app.packages.filter((pckg: Package) => pckg.id != topPackage.id);
      return false;
    }
  }
  return true;
}

function handleTopPackageAncestor(landscapeStructure: StructureLandscapeData, parentPackage: Package, ancestorPackages: Package[], applicationWrapper: {app: Application | undefined}) {
  const topPackage = ancestorPackages.firstObject;

  // if top package has more than 1 element then remove the subpackage with the clipped object else check if the whole application has still more
  // packages and if so then remove only the top package else the whole application
  if(topPackage && topPackage.subPackages.length + topPackage.classes.length > 1) {
    topPackage.subPackages = topPackage.subPackages.filter(pckg => pckg.id != parentPackage.id);
    return false;
  } else if(topPackage && topPackage?.subPackages.length + topPackage.classes.length <= 1){
    applicationWrapper.app = getApplicationFromPackage(landscapeStructure, topPackage.id);
    return removeUnecessaryPackages(applicationWrapper, topPackage);
  }
  return true;
}