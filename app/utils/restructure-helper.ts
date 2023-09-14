import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from './application-helpers';
import {
  StructureLandscapeData,
  Node,
  Application,
  Package,
  Class,
  isPackage,
  Method,
  isApplication,
  isClass,
} from './landscape-schemes/structure-data';
import { getApplicationFromPackage } from './landscape-structure-helpers';
import sha256 from 'crypto-js/sha256';
import { DrawableClassCommunication } from './application-rendering/class-communication-computer';
import {
  getAncestorPackages,
  getClassesInPackage,
  getSubPackagesOfPackage,
} from './package-helpers';

export enum EntityType {
  App = 'APP',
  Package = 'PACKAGE',
  SubPackage = 'SUBPACKAGE',
  Clazz = 'CLAZZ',
  Communication = 'COMMUNICATION',
}

export enum MeshAction {
  Create = 'CREATE',
  Rename = 'RENAME',
  Delete = 'DELETE',
  CutInsert = 'CUTINSERT',
  Communication = 'COMMUNICATION',
}

export function setClassName(app: Application, id: string) {
  const allClassesInApplication = getAllClassesInApplication(app);
  const classToRename = allClassesInApplication.find((cls) => cls.id === id);

  return classToRename;
}

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

export function createPackage(id: string, name: string) {
  const newPckg: Package = {
    id: id,
    name: name,
    subPackages: [],
    classes: [],
  };

  return newPckg;
}

export function createClass(id: string, name: string) {
  const newClass: Partial<Class> = {
    id: id,
    name: name,
    methods: [],
  };

  return newClass;
}

export function addMethodToClass(
  clazz: Class,
  methodName: string,
  isCopy: boolean = false
) {
  const newMethod: Method = !isCopy
    ? {
        name: methodName,
        hashCode: sha256(methodName).toString(),
      }
    : {
        name: methodName,
        hashCode: methodName,
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

export function removeApplication(
  landscapeStructure: StructureLandscapeData,
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms?: DrawableClassCommunication[];
    deletedComms?: DrawableClassCommunication[];
  },
  app: Application,
  undo: boolean,
  destinationApplication?: Application,
  isCutOperation?: boolean,
  cuttedMesh?: Package | Class
) {
  if (wrapper.comms.length > 0) {
    let classesInApplication: Class[] = [];
    if (isCutOperation) {
      if (isClass(cuttedMesh)) {
        classesInApplication = [cuttedMesh];
      } else if (isPackage(cuttedMesh)) {
        classesInApplication = getClassesInPackage(cuttedMesh);
      }
    } else {
      classesInApplication = getAllClassesInApplication(app);
    }
    if (undo || isCutOperation) {
      // if any class in application is part of a communication and information about source and target app has changed then update it
      updateAffectedCommunications(
        classesInApplication,
        wrapper,
        destinationApplication
      );
    } else {
      // if any class in application is part of a communication then remove it
      removeAffectedCommunications(classesInApplication, wrapper);
    }
  }

  if (undo) {
    const parentNode = app.parent;
    // If the node contains only of the one application, then delete the whole node, otherwise remove application from node.
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

  wrapper.meshTodelete = app;
  // if (commsWrapper.app) {
  //   commsWrapper.app = app;
  // }

  //app.packages = [];
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

/**
 * Cuts a specified package from its current location in the landscape structure and inserts it into a given destination,
 * which can be another package or an application. The class communications are appropriately updated.
 * @param landscapeStructure The data structure representing the current state of the landscape.
 * @param clippedPackage The package that is intended to be moved.
 * @param clipToDestination The destination where the package should be inserted. This can be either an application or another package.
 * @param wrapper Contains data on drawable class communications and an optional mesh object that might need deletion
 *                after the package move operation.
 */
export function cutAndInsertPackage(
  landscapeStructure: StructureLandscapeData,
  clippedPackage: Package,
  clipToDestination: Application | Package,
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms: DrawableClassCommunication[];
  }
) {
  const parentPackage = wrapper.meshTodelete?.parent as Package;

  // Determine if the package to be moved has a parent package. If it doesn't it means the package is directly under the application
  if (parentPackage) {
    let destinationApplication: Application | undefined;

    if (isPackage(clipToDestination)) {
      // Get the main application containing the destination package
      const firstPackage = getAncestorPackages(clipToDestination);
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

      // Insert the package to be moved under the destination package
      insertClipToDestinationPackage(clipToDestination, clippedPackage);
    } else {
      // If the destination is an application, insert the package directly under it
      inserClipToDestinationApp(clipToDestination, clippedPackage);
      destinationApplication = clipToDestination;
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
  } else {
    let destinationApplication: Application | undefined;

    if (isPackage(clipToDestination)) {
      // Get the main application containing the destination package
      const firstPackage = getAncestorPackages(clipToDestination);
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

      // Insert the package to be moved under the destination package
      insertClipToDestinationPackage(clipToDestination, clippedPackage);
    } else {
      destinationApplication = clipToDestination;
      inserClipToDestinationApp(clipToDestination, clippedPackage);
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
}

/**
 * Moves a class from its current package and inserts it into a selected package.
 *
 * @param landscapeStructure The data structure representing the current state of the landscape.
 * @param clippedClass The class to be moved.
 * @param clipToDestination The destination package where the class will be moved to.
 * @param commsWrapper Contains an array of class communications.
 */
export function cutAndInsertClass(
  landscapeStructure: StructureLandscapeData,
  clippedClass: Class,
  clipToDestination: Package,
  commsWrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms?: DrawableClassCommunication[];
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
          method.hashCode = id + method.hashCode;
        });
      }
    });
  } else {
    wrapper.entity.id = id + wrapper.entity.id;
    if (wrapper.entity.methods.length) {
      wrapper.entity.methods.forEach((method) => {
        method.hashCode = id + method.hashCode;
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
          method.hashCode = removePrependFromID(method.hashCode, prependID);
        });
      }
    });
  } else {
    wrapper.entity.id = removePrependFromID(wrapper.entity.id, prependID);
    if (wrapper.entity.methods.length) {
      wrapper.entity.methods.forEach((method) => {
        method.hashCode = removePrependFromID(method.hashCode, prependID);
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
    comms: DrawableClassCommunication[];
    updatedComms?: DrawableClassCommunication[];
  },
  destinationApplication: Application | undefined
) {
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

function inserClipToDestinationApp(
  clipToDestination: Application,
  clippedPackage: Package
) {
  clipToDestination.packages.push(clippedPackage);
  delete clippedPackage.parent;
}

function insertClipToDestinationPackage(
  clipToDestination: Package,
  clippedPackage: Package
) {
  clipToDestination.subPackages.push(clippedPackage);
  clippedPackage.parent = clipToDestination;
}

export function removeAffectedCommunications(
  classesInApplication: Class[],
  commsWrapper: {
    comms: DrawableClassCommunication[];
    deletedComms?: DrawableClassCommunication[];
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
