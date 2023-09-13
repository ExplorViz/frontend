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

export function removePackageFromApplication(
  landscapeStructure: StructureLandscapeData,
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms?: DrawableClassCommunication[];
    deletedComms?: DrawableClassCommunication[];
  },
  pckgToRemove: Package,
  undo: boolean,
  destinationApplication?: Application,
  isCutOperation?: boolean,
  cuttedMesh?: Package | Class
) {
  const parentPackage = pckgToRemove.parent;

  // if parent is another package then remove current package from parents subpackage list, else remove the whole application
  if (parentPackage) {
    const applicationWrapper: { app: Application | undefined } = {
      app: undefined,
    };
    let deleteApp = false;

    // if parent package has more than 1 element, then remove the current package from its child packages, else check for the next ancestors
    if (parentPackage.subPackages.length + parentPackage.classes.length > 1) {
      wrapper.meshTodelete = pckgToRemove;
      if (undo) {
        parentPackage.subPackages = parentPackage.subPackages.filter(
          (packg) => packg.id != pckgToRemove.id
        );
      }
      //delete pckgToRemove.parent;
    } else {
      // check if there is one ancestor package, that fulfills the condition of having more than 1 child elements. If not then we delete the whole application
      deleteApp = cleanUpAncestor(
        landscapeStructure,
        parentPackage,
        applicationWrapper,
        wrapper,
        undo
      );
    }

    if (deleteApp && applicationWrapper.app) {
      removeApplication(
        landscapeStructure,
        wrapper,
        applicationWrapper.app,
        undo,
        destinationApplication,
        isCutOperation,
        cuttedMesh
      );
    } else if (!deleteApp && wrapper.comms.length > 0) {
      let classesInPackage: Class[] = [];
      if (isCutOperation) {
        if (isClass(cuttedMesh)) {
          classesInPackage = [cuttedMesh];
        } else if (isPackage(cuttedMesh)) {
          classesInPackage = getClassesInPackage(cuttedMesh);
        }
      } else {
        classesInPackage = getClassesInPackage(pckgToRemove);
      }
      //const classesInPackage = isCutOperation? getClassesInPackage(cuttedMesh as Package) : getClassesInPackage(pckgToRemove); ///HIER IST DAS PROBLEM FÜR CUT INSERT!!!!
      if (undo || isCutOperation) {
        // if any class in package is part of a communication and information about source and target app has changed then update it
        updateAffectedCommunications(
          classesInPackage,
          wrapper,
          destinationApplication
        );
      } else {
        // if any class in package is part of a communication then remove it
        removeAffectedCommunications(classesInPackage, wrapper);
      }
    }
  } else {
    const parentApplication = getApplicationFromPackage(
      landscapeStructure,
      pckgToRemove.id
    );

    // if applications only package is this package, then remove whole application, else remove package from applications package list
    if (parentApplication && parentApplication.packages.length <= 1) {
      removeApplication(
        landscapeStructure,
        wrapper,
        parentApplication,
        undo,
        destinationApplication,
        isCutOperation,
        cuttedMesh
      );
    } else if (parentApplication && parentApplication.packages.length > 1) {
      wrapper.meshTodelete = pckgToRemove;
      if (undo) {
        parentApplication.packages = parentApplication.packages.filter(
          (pckg) => pckg.id !== pckgToRemove.id
        );
      }

      if (wrapper.comms.length > 0) {
        // if any class in application is part of a communication then remove it
        const classesInPackage = getClassesInPackage(pckgToRemove);
        if (undo) {
          // if any class in package is part of a communication and information about source and target app has changed then update it
          updateAffectedCommunications(
            classesInPackage,
            wrapper,
            destinationApplication
          );
        } else {
          // if any class in package is part of a communication then remove it
          removeAffectedCommunications(classesInPackage, wrapper);
        }
      }
    }
  }
}

export function removeClassFromPackage(
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
    updatedComms?: DrawableClassCommunication[];
  },
  clazzToRemove: Class,
  undo: boolean,
  destinationApplication?: Application,
  isCutOperation?: boolean
) {
  const parentPackage = clazzToRemove.parent;
  if (parentPackage) {
    if (undo) {
      parentPackage.classes = parentPackage.classes.filter(
        (clzz) => clzz.id != clazzToRemove.id
      );
    }
    if (wrapper.comms.length > 0) {
      if (undo || isCutOperation) {
        updateAffectedCommunications(
          [clazzToRemove],
          wrapper,
          destinationApplication
        );
      } else {
        removeAffectedCommunications([clazzToRemove], wrapper);
      }
    }
  }
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

    removeClassFromPackage(
      commsWrapper,
      clippedClass,
      false,
      destinationApplication,
      true
    );

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

function removeAffectedCommunications(
  classesInApplication: Class[],
  commsWrapper: {
    comms: DrawableClassCommunication[];
    deletedComms?: DrawableClassCommunication[];
  }
) {
  classesInApplication.forEach((clazz) =>
    // (commsWrapper.comms = commsWrapper.comms.filter(
    //   (comm) =>
    //     comm.sourceClass.id !== clazz.id && comm.targetClass.id !== clazz.id
    // ))
    {
      const commsToDelete = commsWrapper.comms.filter(
        (comm) =>
          comm.sourceClass.id === clazz.id || comm.targetClass.id === clazz.id
      );
      commsWrapper.deletedComms?.pushObjects(commsToDelete);
    }
  );
}

function cleanUpAncestor(
  landscapeStructure: StructureLandscapeData,
  parentPackage: Package,
  applicationWrapper: { app: Application | undefined },
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
  },
  isCutOperation?: boolean
) {
  const ancestorPackages = getAncestorPackages(parentPackage);
  /*  case 1: ancestor is the top Package meaning the highest on the hierarchy.
      case 2: there are multiple ancestors. We need to find the nearest ancestor with more than 1 element in it
      case 3: there are no ancestors since the current package is top Package, so we investigate the application
  */
  if (ancestorPackages.length == 1)
    return handleTopPackageAncestor(
      landscapeStructure,
      parentPackage,
      ancestorPackages,
      applicationWrapper,
      wrapper,
      isCutOperation
    );
  else if (ancestorPackages.length > 1)
    return handlePackageAncestors(
      landscapeStructure,
      parentPackage,
      ancestorPackages,
      applicationWrapper,
      wrapper,
      isCutOperation
    );
  else
    return handleApplicationAncestor(
      landscapeStructure,
      parentPackage,
      applicationWrapper,
      wrapper,
      isCutOperation
    );
}

function handleApplicationAncestor(
  landscapeStructure: StructureLandscapeData,
  parentPackage: Package,
  applicationWrapper: { app: Application | undefined },
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
  },
  isCutOperation?: boolean
) {
  //check if the whole application has still more than 1 packages and if so then remove only the top package else the whole application
  applicationWrapper.app = getApplicationFromPackage(
    landscapeStructure,
    parentPackage.id
  );
  return hasAppEnoughPackages(
    applicationWrapper,
    parentPackage,
    wrapper,
    isCutOperation
  );
}

function handlePackageAncestors(
  landscapeStructure: StructureLandscapeData,
  parentPackage: Package,
  ancestorPackages: Package[],
  applicationWrapper: { app: Application | undefined },
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
  },
  isCutOperation?: boolean
) {
  // find an ancestor that has more than 1 element
  const foundPackage: Package | undefined = ancestorPackages.find(
    (pckg) => pckg.subPackages.length + pckg.classes.length > 1
  );
  // when found delete the subpackage with the clipped object inside else check if the whole application has still more
  // packages and if so then remove only the top package else the whole application
  if (foundPackage) {
    let subPackageToRemove = parentPackage;
    const indexOfSubPackage = ancestorPackages.indexOf(foundPackage) - 1;
    if (indexOfSubPackage >= 0)
      subPackageToRemove = ancestorPackages[indexOfSubPackage];
    wrapper.meshTodelete = subPackageToRemove;
    if (isCutOperation) {
      foundPackage.subPackages = foundPackage.subPackages.filter(
        (pckg) => pckg.id != subPackageToRemove.id
      );
    }
    return false;
  } else {
    const topPackage = ancestorPackages[ancestorPackages.length - 1];
    applicationWrapper.app = getApplicationFromPackage(
      landscapeStructure,
      ancestorPackages[ancestorPackages.length - 1].id
    );
    return hasAppEnoughPackages(applicationWrapper, topPackage, wrapper);
  }
  return true;
}

function hasAppEnoughPackages(
  applicationWrapper: { app: Application | undefined },
  topPackage: Package,
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
  },
  isCutOperation?: boolean
) {
  // if the application has enough packages, then remove only the package else mark the app for delete
  if (applicationWrapper.app) {
    if (applicationWrapper.app.packages.length > 1) {
      wrapper.meshTodelete = topPackage;
      if (isCutOperation) {
        applicationWrapper.app.packages =
          applicationWrapper.app.packages.filter(
            (pckg: Package) => pckg.id != topPackage.id
          );
      }
      return false;
    }
  }
  return true;
}

function handleTopPackageAncestor(
  landscapeStructure: StructureLandscapeData,
  parentPackage: Package,
  ancestorPackages: Package[],
  applicationWrapper: { app: Application | undefined },
  wrapper: {
    comms: DrawableClassCommunication[];
    meshTodelete?: Application | Package | Class;
  },
  isCutOperation?: boolean
) {
  const topPackage = ancestorPackages.firstObject;
  // if top package has more than 1 element then remove the subpackage with the clipped object else check if the whole application has still more
  // packages and if so then remove only the top package else the whole application
  if (
    topPackage &&
    topPackage.subPackages.length + topPackage.classes.length > 1
  ) {
    wrapper.meshTodelete = parentPackage;
    if (isCutOperation) {
      topPackage.subPackages = topPackage.subPackages.filter(
        (pckg) => pckg.id != parentPackage.id
      );
    }
    return false;
  } else if (
    topPackage &&
    topPackage?.subPackages.length + topPackage.classes.length <= 1
  ) {
    applicationWrapper.app = getApplicationFromPackage(
      landscapeStructure,
      topPackage.id
    );
    return hasAppEnoughPackages(
      applicationWrapper,
      topPackage,
      wrapper,
      isCutOperation
    );
  }
  return true;
}
