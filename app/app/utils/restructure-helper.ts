import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'some-react-lib/src/utils/application-helpers';
import {
  StructureLandscapeData,
  Node,
  Application,
  Package,
  Class,
  isPackage,
  Method,
  isApplication,
} from 'some-react-lib/src/utils/landscape-schemes/structure-data';
import { getApplicationFromPackage } from './landscape-structure-helpers';
import sha256 from 'crypto-js/sha256';
import {
  getAncestorPackages,
  getClassesInPackage,
  getSubPackagesOfPackage,
} from 'some-react-lib/src/utils/package-helpers';
import ClassCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/class-communication';

export enum EntityType {
  App = 'APP',
  Package = 'PACKAGE',
  SubPackage = 'SUBPACKAGE',
  Clazz = 'CLAZZ',
  Communication = 'COMMUNICATION',
}

export enum RestructureAction {
  Create = 'CREATE',
  Rename = 'RENAME',
  Delete = 'DELETE',
  CopyPaste = 'COPYPASTE',
  CutInsert = 'CUTINSERT',
  Communication = 'COMMUNICATION',
}

/**
 * Finds a class from an application based on the class ID.
 *
 * @param app The target application to search within.
 * @param id The ID of the class to retrieve.
 * @returns The class matching the given ID, or undefined if not found.
 */
export function getClassInApplicationById(app: Application, id: string) {
  const allClassesInApplication = getAllClassesInApplication(app);
  const classToRename = allClassesInApplication.find((cls) => cls.id === id);

  return classToRename;
}

/**
 * Adds a new node with an application to the landscape
 *
 * @param appName The name of the new application.
 * @param language The programming language of the application.
 * @param counter A unique identifier to aid in creating unique entities.
 * @returns The newly created node with its child entities.
 */
export function addFoundationToLandscape(
  appName: string,
  language: string,
  counter: number
) {
  const myNode: Node = {
    id: 'newNode ' + counter,
    ipAddress: '192.168.1.' + counter,
    hostName: 'new Node ' + counter,
    applications: [],
  };

  const myApplication: Application = {
    id: 'newApp ' + counter,
    name: appName,
    language: language,
    instanceId: '0',
    parent: myNode,
    packages: [],
  };

  const newPckg = createPackage(
    'newPackage' + counter,
    'New Package ' + counter
  );

  const newClass = createClass('newClass' + counter, 'New Class ' + counter);
  newClass.parent = newPckg;

  newPckg.classes.push(newClass as Class);
  myApplication.packages.push(newPckg);
  myNode.applications.push(myApplication);
  myApplication.parent = myNode;

  return myNode;
}

export function duplicateApplication(
  landscapeData: StructureLandscapeData,
  app: Application,
  wrapper: {
    idCounter: number;
    comms: ClassCommunication[];
    copiedComms: ClassCommunication[];
  }
) {
  const originalNode = app.parent;
  const duplicatedNode: Node = {
    id: originalNode.id,
    ipAddress: originalNode.ipAddress,
    hostName: originalNode.hostName,
    applications: [],
  };

  const duplicatedApp: Application = {
    id: app.id,
    name: app.name,
    language: app.language,
    instanceId: app.instanceId,
    parent: duplicatedNode,
    packages: [],
  };

  duplicatedNode.applications.pushObject(duplicatedApp);

  app.packages.forEach((pckg) => {
    const duplicatedPackage = copyPackageContent(pckg);
    duplicatedApp.packages.pushObject(duplicatedPackage);
  });

  // Copy the communications
  if (wrapper.comms.length > 0) {
    const classesInApp = getAllClassesInApplication(duplicatedApp);

    copyCommunications(classesInApp, wrapper, duplicatedApp);
  }

  changeID({ entity: duplicatedApp }, 'duplicated|');

  landscapeData.nodes.pushObject(duplicatedNode);

  return duplicatedApp;
}

/**
 * Creates a new package with the given ID and name.
 *
 * @param id The unique identifier for the package.
 * @param name The name of the package.
 * @returns A new package object.
 */
export function createPackage(id: string, name: string) {
  const newPckg: Package = {
    id: id,
    name: name,
    subPackages: [],
    classes: [],
  };

  return newPckg;
}

/**
 * Creates a new class with the given ID and name.
 *
 * @param id The unique identifier for the class.
 * @param name The name of the class.
 * @returns A new class object.
 */
export function createClass(id: string, name: string) {
  const newClass: Partial<Class> = {
    id: id,
    name: name,
    methods: [],
  };

  return newClass;
}

/**
 * Adds a method to a class. If the method is a copy, the hash code will simply be the method name itself.
 *
 * @param clazz The class to which the method will be added.
 * @param methodName The name of the method.
 * @param isCopy A flag indicating if the method is a copy.
 */
export function addMethodToClass(
  clazz: Class,
  methodName: string,
  isCopy: boolean = false
) {
  const newMethod: Method = !isCopy
    ? {
      name: methodName,
      methodHash: sha256(methodName).toString(),
    }
    : {
      name: methodName,
      methodHash: methodName,
    };

  clazz.methods.push(newMethod);
}

/**
 * Copies package with its content.
 * @param pckgToCopy The package to be copied
 * @returns A new package with copied content
 */
export function copyPackageContent(pckgToCopy: Package): Package {
  // Create a new package with the same ID and name
  const copiedPckg = createPackage(pckgToCopy.id, pckgToCopy.name);

  // Copy each subpackage and then add to the copied class
  for (const subPckg of pckgToCopy.subPackages) {
    const copiedSubPckg = copyPackageContent(subPckg);
    copiedSubPckg.parent = copiedPckg;
    copiedPckg.subPackages.push(copiedSubPckg);
  }

  // Copy each class and then add to the copied package
  for (const clazz of pckgToCopy.classes) {
    const copiedClass = copyClassContent(clazz);
    copiedClass.parent = copiedPckg;
    copiedPckg.classes.push(copiedClass);
  }

  return copiedPckg;
}

/**
 * Copies a class
 * @param clazzToCopy The Class to be copied
 * @returns A new class with with copied content
 */
export function copyClassContent(clazzToCopy: Class) {
  // Create a new class with the same ID and name
  const copiedClass = createClass(clazzToCopy.id, clazzToCopy.name) as Class;

  // Copy each method and add to the copied class
  for (const method of clazzToCopy.methods) {
    addMethodToClass(copiedClass, method.name, true);
  }

  return copiedClass;
}

/**
 * Removes an application in the landscape
 * @param landscapeStructure The landscape data which contains the app
 * @param app The application that needs to be removed
 */
export function removeApplication(
  landscapeStructure: StructureLandscapeData,
  app: Application
) {
  const parentNode = app.parent;

  //If the node contains only of the one application, then delete the whole node, otherwise remove application from node.
  if (parentNode.applications.length <= 1) {
    landscapeStructure.nodes = landscapeStructure.nodes.filter(
      (node) => node.id != parentNode.id
    );
  } else {
    parentNode.applications = parentNode.applications.filter(
      (appl) => appl.id != app.id
    );
  }
}

/**
 * Removes a package within an application
 * @param pckgToRemove The package that needs to be removed
 * @param app The application where the package resides in
 */
export function removePackageFromApplication(
  pckgToRemove: Package,
  app: Application
) {
  const parentPackage = pckgToRemove.parent;

  if (parentPackage) {
    parentPackage.subPackages = parentPackage.subPackages.filter(
      (packg) => packg.id != pckgToRemove.id
    );
  } else {
    app.packages = app.packages.filter((pckg) => pckg.id !== pckgToRemove.id);
  }
}

/**
 * Determines whether a package can be removed or not
 * @param pckgToRemove The package to approve the removal
 * @param app The application where the package resides in
 * @returns Approve of removal
 */
export function canDeletePackage(pckgToRemove: Package, app: Application) {
  const parentPackage = pckgToRemove.parent;
  if (parentPackage) {
    return parentPackage.subPackages.length + parentPackage.classes.length > 1;
  } else {
    return app && app.packages.length > 1;
  }
}

/**
 * Removes a class within a package.
 * @param clazzToRemove The class that needs to be removed
 */
export function removeClassFromPackage(clazzToRemove: Class) {
  const parentPackage = clazzToRemove.parent;
  if (parentPackage) {
    parentPackage.classes = parentPackage.classes.filter(
      (clzz) => clzz.id != clazzToRemove.id
    );
  }
}

/**
 * Determines whether a class can be removed or not
 * @param clazzToRemove The class to approve of the removal
 * @returns Approval of removal
 */
export function canDeleteClass(clazzToRemove: Class) {
  const parentPackage = clazzToRemove.parent;
  return parentPackage.classes.length + parentPackage.subPackages.length > 1;
}

// TODO this and cutAndInsertPackage have almost identical code! Needs to be refactored!!!!
export function pastePackage(
  landscapeStructure: StructureLandscapeData,
  copiedPackage: Package,
  pasteToDestination: Application | Package,
  wrapper: {
    idCounter: number;
    comms: ClassCommunication[];
    copiedComms: ClassCommunication[];
  }
) {
  let destinationApplication: Application | undefined;

  if (isPackage(pasteToDestination)) {
    // Get the main application containing the destimination package
    const firstPackage = getAncestorPackages(pasteToDestination);
    if (firstPackage.length > 0)
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        firstPackage[firstPackage.length - 1].id
      );
    else
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        pasteToDestination.id
      );

    // Insert the package to be moved under the destination package
    insertPackageToPackage(pasteToDestination, copiedPackage);
  } else {
    // If the destination is an application, insert the package directly under it
    insertPackageToApplication(pasteToDestination, copiedPackage);
    destinationApplication = pasteToDestination;
  }

  // Copy the communications
  if (wrapper.comms.length > 0) {
    const classesInPackage = getClassesInPackage(copiedPackage);

    copyCommunications(classesInPackage, wrapper, destinationApplication);
  }
}

export function pasteClass(
  landscapeStructure: StructureLandscapeData,
  copiedClass: Class,
  pasteToDestination: Package,
  commsWrapper: {
    idCounter: number;
    comms: ClassCommunication[];
    copiedComms: ClassCommunication[];
  }
) {
  // Verify if the destination is a package
  if (isPackage(pasteToDestination)) {
    let destinationApplication: Application | undefined;
    const firstPackage = getAncestorPackages(pasteToDestination);

    // Find the application of destination package
    if (firstPackage.length > 0)
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        firstPackage[firstPackage.length - 1].id
      );
    else
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        pasteToDestination.id
      );

    if (commsWrapper.comms.length) {
      copyCommunications([copiedClass], commsWrapper, destinationApplication);
    }

    // Add the copied class to the destination package's classes
    pasteToDestination.classes.push(copiedClass);
    copiedClass.parent = pasteToDestination;
  }
}

/**
 * Cuts a specified package from its current location in the landscape structure and inserts it into a given destination,
 * which can be another package or an application. The class communications are appropriately updated.
 * @param landscapeStructure The data structure representing the current state of the landscape.
 * @param clippedPackage The package that is intended to be moved.
 * @param destination The destination where the package should be inserted. This can be either an application or another package.
 * @param wrapper Contains data on aggregated class communications and an optional mesh object that might need deletion
 *                after the package move operation.
 */
export function movePackage(
  landscapeStructure: StructureLandscapeData,
  clippedPackage: Package,
  destination: Application | Package,
  wrapper: {
    comms: ClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms: ClassCommunication[];
  }
) {
  let destinationApplication: Application | undefined;

  if (isPackage(destination)) {
    // Get the main application containing the destimination package
    const firstPackage = getAncestorPackages(destination);
    if (firstPackage.length > 0)
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        firstPackage[firstPackage.length - 1].id
      );
    else
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        destination.id
      );

    // Insert the package to be moved under the destination package
    insertPackageToPackage(destination, clippedPackage);
  } else {
    // If the destination is an application, insert the package directly under it
    insertPackageToApplication(destination, clippedPackage);
    destinationApplication = destination;
  }

  // Update communications if the package contains classes involved in communications
  if (wrapper.comms.length > 0) {
    const classesInPackage = getClassesInPackage(clippedPackage);

    updateAffectedCommunications(
      classesInPackage,
      wrapper,
      destinationApplication
    );
  }
}

/**
 * Moves a class from its current package and inserts it into a selected package.
 *
 * @param landscapeStructure The data structure representing the current state of the landscape.
 * @param clippedClass The class to be moved.
 * @param clipToDestination The destination package where the class will be moved to.
 * @param commsWrapper Contains an array of class communications.
 */
export function moveClass(
  landscapeStructure: StructureLandscapeData,
  clippedClass: Class,
  clipToDestination: Package,
  commsWrapper: {
    comms: ClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms?: ClassCommunication[];
  }
) {
  // Verify if the destination is a package
  if (isPackage(clipToDestination)) {
    let destinationApplication: Application | undefined;
    const firstPackage = getAncestorPackages(clipToDestination);

    // Find the application of destination package
    if (firstPackage.length > 0)
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        firstPackage[firstPackage.length - 1].id
      );
    else
      destinationApplication = getApplicationFromPackage(
        landscapeStructure,
        clipToDestination.id
      );

    if (commsWrapper.comms.length) {
      updateAffectedCommunications(
        [clippedClass],
        commsWrapper,
        destinationApplication
      );
    }

    // Add the moved class to the destination package's classes
    clipToDestination.classes.push(clippedClass);
    clippedClass.parent = clipToDestination;
  }
}

export function changeID(
  wrapper: { entity: Application | Package | Class },
  id: string
) {
  if (isApplication(wrapper.entity)) {
    const node = wrapper.entity.parent;
    node.id = id + node.id;

    wrapper.entity.id = id + wrapper.entity.id;

    const allPackages = getAllPackagesInApplication(wrapper.entity);
    const allClasses = getAllClassesInApplication(wrapper.entity);

    allPackages.forEach((pckg) => {
      pckg.id = id + pckg.id;
    });

    allClasses.forEach((clazz) => {
      clazz.id = id + clazz.id;
    });
  } else if (isPackage(wrapper.entity)) {
    const allSubPackages = getSubPackagesOfPackage(wrapper.entity, true);
    const allClassesInPackge = getClassesInPackage(wrapper.entity, true);

    wrapper.entity.id = id + wrapper.entity.id;

    allSubPackages.forEach((pckg) => {
      pckg.id = id + pckg.id;
    });

    allClassesInPackge.forEach((clazz) => {
      clazz.id = id + clazz.id;
      if (clazz.methods.length) {
        clazz.methods.forEach((method) => {
          method.methodHash = id + method.methodHash;
        });
      }
    });
  } else {
    wrapper.entity.id = id + wrapper.entity.id;
    if (wrapper.entity.methods.length) {
      wrapper.entity.methods.forEach((method) => {
        method.methodHash = id + method.methodHash;
      });
    }
  }
}

export function restoreID(
  wrapper: { entity: Application | Package | Class },
  prependID: string
) {
  if (isApplication(wrapper.entity)) {
    const allPackages = getAllPackagesInApplication(wrapper.entity);
    const allClasses = getAllClassesInApplication(wrapper.entity);

    allPackages.forEach((pckg) => {
      pckg.id = removePrependFromID(pckg.id, prependID);
    });

    allClasses.forEach((clazz) => {
      clazz.id = removePrependFromID(clazz.id, prependID);
    });
  } else if (isPackage(wrapper.entity)) {
    const allSubPackages = getSubPackagesOfPackage(wrapper.entity, true);
    const allClassesInPackage = getClassesInPackage(wrapper.entity, true);

    wrapper.entity.id = removePrependFromID(wrapper.entity.id, prependID);

    allSubPackages.forEach((pckg) => {
      pckg.id = removePrependFromID(pckg.id, prependID);
    });

    allClassesInPackage.forEach((clazz) => {
      clazz.id = removePrependFromID(clazz.id, prependID);
      if (clazz.methods.length) {
        clazz.methods.forEach((method) => {
          method.methodHash = removePrependFromID(method.methodHash, prependID);
        });
      }
    });
  } else {
    wrapper.entity.id = removePrependFromID(wrapper.entity.id, prependID);
    if (wrapper.entity.methods.length) {
      wrapper.entity.methods.forEach((method) => {
        method.methodHash = removePrependFromID(method.methodHash, prependID);
      });
    }
  }
}

function removePrependFromID(changedID: string, prepend: string) {
  if (changedID.startsWith(prepend)) {
    return changedID.substring(prepend.length);
  }
  return changedID;
}

function updateAffectedCommunications(
  classesInPackage: Class[],
  commsWrapper: {
    comms: ClassCommunication[];
    updatedComms?: ClassCommunication[];
  },
  destinationApplication: Application | undefined
) {
  if (!destinationApplication) return;

  classesInPackage.forEach((clazz) =>
    commsWrapper.comms.forEach((comms) => {
      if (comms.sourceClass.id === clazz.id) {
        comms.sourceClass = clazz;
        comms.sourceApp = destinationApplication;
        commsWrapper.updatedComms?.push(comms);
      } else if (comms.targetClass.id === clazz.id) {
        comms.targetClass = clazz;
        comms.targetApp = destinationApplication;
        commsWrapper.updatedComms?.push(comms);
      }
    })
  );
}

function copyCommunications(
  classesInPackage: Class[],
  commsWrapper: {
    idCounter: number;
    comms: ClassCommunication[];
    copiedComms: ClassCommunication[];
  },
  destinationApplication: Application | undefined
) {
  const copiedCommsMap = new Map();
  classesInPackage.forEach((clazz) =>
    commsWrapper.comms.forEach((comms) => {
      if (
        comms.sourceClass.id === clazz.id ||
        comms.targetClass.id === clazz.id
      ) {
        let copiedComms;
        // If this communication has already been copied, retrieve the copy from the map, otherwise create a new copy and store it in the map
        if (copiedCommsMap.has(comms.id)) {
          copiedComms = copiedCommsMap.get(comms.id);
        } else {
          copiedComms = copyCommunication(comms, commsWrapper.idCounter);
          copiedCommsMap.set(comms.id, copiedComms);
        }

        if (comms.sourceClass.id === clazz.id) {
          copiedComms.sourceClass = clazz;
          copiedComms.sourceApp = destinationApplication;
        }
        if (comms.targetClass.id === clazz.id) {
          copiedComms.targetClass = clazz;
          copiedComms.targetApp = destinationApplication;
        }
      }
    })
  );
  commsWrapper.copiedComms = Array.from(copiedCommsMap.values());
}

function copyCommunication(commToCopy: ClassCommunication, idCounter: number) {
  const comm: ClassCommunication = {
    id: 'copied' + idCounter + '|' + commToCopy.id,
    isRecursive: commToCopy.isRecursive,
    isBidirectional: commToCopy.isBidirectional,
    methodCalls: commToCopy.methodCalls,
    totalRequests: commToCopy.totalRequests,
    metrics: commToCopy.metrics,
    sourceClass: commToCopy.sourceClass,
    targetClass: commToCopy.targetClass,
    operationName: 'copied' + idCounter + '|' + commToCopy.operationName,
    sourceApp: commToCopy.sourceApp,
    targetApp: commToCopy.targetApp,
    addMethodCalls: () => { },
    getClasses: () => [commToCopy.sourceClass, commToCopy.targetClass],
  };

  return comm;
}

function insertPackageToApplication(
  destinationApp: Application,
  clippedPackage: Package
) {
  destinationApp.packages.push(clippedPackage);
  delete clippedPackage.parent;
}

function insertPackageToPackage(
  destinationPckg: Package,
  clippedPackage: Package
) {
  destinationPckg.subPackages.push(clippedPackage);
  clippedPackage.parent = destinationPckg;
}

export function removeAffectedCommunications(
  classesInApplication: Class[],
  commsWrapper: {
    comms: ClassCommunication[];
    deletedComms?: ClassCommunication[];
  }
) {
  classesInApplication.forEach((clazz) => {
    const commsToDelete = commsWrapper.comms.filter(
      (comm) =>
        comm.sourceClass.id === clazz.id || comm.targetClass.id === clazz.id
    );
    commsWrapper.deletedComms?.pushObjects(commsToDelete);
  });
}
