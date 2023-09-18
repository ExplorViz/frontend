import { RestructureAction } from './restructure-helper';
import { DrawableClassCommunication } from './application-rendering/class-communication-computer';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
  isPackage,
} from './landscape-schemes/structure-data';
import {
  getApplicationFromPackage,
  getApplicationFromSubPackage,
} from './landscape-structure-helpers';
import sha256 from 'crypto-js/sha256';
import { tracked } from '@glimmer/tracking';

export abstract class BaseChangeLogEntry {
  id: string;
  action: RestructureAction;
  originalAppName?: string;

  app?: Application;

  @tracked
  newName?: string;

  constructor(id: string, action: RestructureAction, app?: Application) {
    this.id = id;
    this.action = action;
    this.app = app;

    this.originalAppName = app?.name;
  }

  abstract get _logText(): string;
}

export class AppChangeLogEntry extends BaseChangeLogEntry {
  //createdPckg?: PackageChangeLogEntry;

  constructor(action: RestructureAction, app: Application) {
    const id = sha256(action + app.id).toString();
    super(id, action, app);
  }

  get _logText(): string {
    switch (this.action) {
      case RestructureAction.Create:
        return `-Create a new Application in "${this.app?.language}" with the name "${this.app?.name}"\n`;
      case RestructureAction.Rename:
        return `-Rename the Application "${this.originalAppName}" to "${this.newName}"\n`;
      case RestructureAction.Delete:
        return `-Delete the Application with the name "${this.originalAppName}"\n`;
      default:
        return `APP LOG ERROR\n`;
    }
  }
}

export class PackageChangeLogEntry extends BaseChangeLogEntry {
  pckg: Package;
  originalPckgName: string;

  //createdClass?: ClassChangeLogEntry;
  createdWithApp?: AppChangeLogEntry;

  destinationApp?: Application;
  destinationPckg?: Package;

  original?: Package;

  constructor(action: RestructureAction, app: Application, pckg: Package) {
    const id = sha256(action + app.id + pckg.id).toString();
    super(id, action, app);
    this.pckg = pckg;
    this.originalPckgName = pckg.name;
  }

  get _logText(): string {
    switch (this.action) {
      case RestructureAction.Create:
        return `-Create new Package with the name "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
      case RestructureAction.Rename:
        return `-Inside the Application "${this.app?.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"\n`;
      case RestructureAction.Delete:
        return `-Delete the Package with the name "${this.originalPckgName}" inside the Application "${this.app?.name}"\n`;
      case RestructureAction.CopyPaste:
        if (this.destinationPckg && this.destinationApp) {
          return `-Copy the Package "${this.pckg?.name}" from the Application "${this.app?.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
        } else if (!this.destinationPckg && this.destinationApp) {
          return `-Copy the Package "${this.pckg?.name}" from the Application "${this.app?.name}" inside the Application "${this.destinationApp.name}"\n`;
        }
        return `Unhandled CutInsert case`;
      case RestructureAction.CutInsert:
        if (this.destinationPckg && this.destinationApp) {
          return `-Move the Package "${this.pckg?.name}" from the Application "${this.app?.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
        } else if (!this.destinationPckg && this.destinationApp) {
          return `-Move the Package "${this.pckg?.name}" from the Application "${this.app?.name}" inside the Application "${this.destinationApp.name}"\n`;
        }
        return `Unhandled CutInsert case`;
      default:
        return `PACKAGE LOG ERROR\n`;
    }
  }

  set _createdWithApp(appEntry: AppChangeLogEntry) {
    this.createdWithApp = appEntry;
  }

  setDestination(
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    if (isPackage(destination)) {
      this.destinationPckg = destination;
      if (destination.parent)
        this.destinationApp = getApplicationFromSubPackage(
          landscapeData,
          destination.id
        );
      else
        this.destinationApp = getApplicationFromPackage(
          landscapeData,
          destination.id
        );
    } else {
      this.destinationApp = destination;
    }
  }

  updateOriginApp(
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    if (isPackage(destination)) {
      if (destination.parent)
        this.app = getApplicationFromSubPackage(landscapeData, destination.id);
      else this.app = getApplicationFromPackage(landscapeData, destination.id);
    } else {
      this.app = destination;
    }
  }

  setOriginal(original: Package) {
    this.original = original;
  }
}

export class SubPackageChangeLogEntry extends BaseChangeLogEntry {
  pckg: Package;
  originalPckgName: string;

  //createdClass?: ClassChangeLogEntry;

  destinationApp?: Application;
  destinationPckg?: Package;

  original?: Package;

  constructor(action: RestructureAction, app: Application, pckg: Package) {
    const id = sha256(action + app.id + pckg.id).toString();
    super(id, action, app);
    this.pckg = pckg;
    this.originalPckgName = pckg.name;
  }

  get _logText(): string {
    switch (this.action) {
      case RestructureAction.Create:
        return `-Create new Subpackage with the name "${this.pckg?.name}" under the Package "${this.pckg?.parent?.name}" inside the Application "${this.app?.name}"\n`;
      case RestructureAction.Rename:
        return `-Inside the Application "${this.app?.name}" under the Package "${this.pckg?.parent?.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"\n`;
      case RestructureAction.Delete:
        return `-Delete the Subpackage with the name "${this.originalPckgName}" under the Package "${this.pckg?.parent?.name}" inside the Application "${this.app?.name}"\n`;
      case RestructureAction.CopyPaste:
        if (this.destinationPckg && this.destinationApp) {
          return `-Copy the Subpackage "${this.pckg?.name}" from the Application "${this.app?.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
        } else if (!this.destinationPckg && this.destinationApp) {
          return `-Copy the Subpackage "${this.pckg?.name}" from the Application "${this.app?.name}" inside the Application "${this.destinationApp.name}"\n`;
        }
        return `Unhandled CutInsert case`;
      case RestructureAction.CutInsert:
        if (this.destinationPckg && this.destinationApp) {
          return `-Move the Subpackage "${this.pckg?.name}" from the Application "${this.app?.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
        } else if (!this.destinationPckg && this.destinationApp) {
          return `-Move the Subpackage "${this.pckg?.name}" from the Application "${this.app?.name}" inside the Application "${this.destinationApp.name}"\n`;
        }
        return `Unhandled CutInsert case`;
      default:
        return `SUBPACKAGE LOG ERROR\n`;
    }
  }

  setDestination(
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    if (isPackage(destination)) {
      this.destinationPckg = destination;
      if (destination.parent)
        this.destinationApp = getApplicationFromSubPackage(
          landscapeData,
          destination.id
        );
      else
        this.destinationApp = getApplicationFromPackage(
          landscapeData,
          destination.id
        );
    } else {
      this.destinationApp = destination;
    }
  }

  updateOriginApp(
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    if (isPackage(destination)) {
      if (destination.parent)
        this.app = getApplicationFromSubPackage(landscapeData, destination.id);
      else this.app = getApplicationFromPackage(landscapeData, destination.id);
    } else {
      this.app = destination;
    }
  }

  setOriginal(original: Package) {
    this.original = original;
  }
}

export class ClassChangeLogEntry extends BaseChangeLogEntry {
  pckg: Package;
  originalPckgName: string;

  clazz: Class;
  originalClazzName: string;

  createdWithPackage?: PackageChangeLogEntry | SubPackageChangeLogEntry;

  destinationApp?: Application;
  destinationPckg?: Package;

  original?: Class;

  constructor(action: RestructureAction, app: Application, clazz: Class) {
    const id = sha256(action + app.id + clazz.parent.id + clazz.id).toString();
    super(id, action, app);
    this.pckg = clazz.parent;
    this.clazz = clazz;

    this.originalPckgName = clazz.parent.name;
    this.originalClazzName = clazz.name;
  }

  set _createdWithPackage(
    packageEntry: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) {
    this.createdWithPackage = packageEntry;
  }

  get _logText(): string {
    switch (this.action) {
      case RestructureAction.Create:
        return `-Create new Class with the name "${this.clazz?.name}" under the package "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
      case RestructureAction.Rename:
        return `-Inside the Application "${this.app?.name}" under the Package "${this.pckg?.name}" rename the Class "${this.originalClazzName}" to "${this.newName}"\n`;
      case RestructureAction.Delete:
        return `-Delete the Class with the name "${this.originalClazzName}" under the package "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
      case RestructureAction.CopyPaste:
        return `-Copy the Class "${this.clazz?.name}" under the Package "${this.pckg?.name}" from the Application "${this.app?.name}" to the Package "${this.destinationPckg?.name}" inside the Application "${this.destinationApp?.name}"\n`;
      case RestructureAction.CutInsert:
        return `-Move the Class "${this.clazz?.name}" under the Package "${this.pckg?.name}" from the Application "${this.app?.name}" to the Package "${this.destinationPckg?.name}" inside the Application "${this.destinationApp?.name}"\n`;
      default:
        return `CLASS LOG ERROR\n`;
    }
  }

  setDestination(destination: Package, landscapeData: StructureLandscapeData) {
    this.destinationPckg = destination;
    if (destination.parent)
      this.destinationApp = getApplicationFromSubPackage(
        landscapeData,
        destination.id
      );
    else
      this.destinationApp = getApplicationFromPackage(
        landscapeData,
        destination.id
      );
  }

  updateOriginApp(destination: Package, landscapeData: StructureLandscapeData) {
    this.pckg = destination;
    if (destination.parent)
      this.app = getApplicationFromSubPackage(landscapeData, destination.id);
    else this.app = getApplicationFromPackage(landscapeData, destination.id);
  }

  setOriginal(original: Class) {
    this.original = original;
  }
}

export class CommunicationChangeLogEntry extends BaseChangeLogEntry {
  communication: DrawableClassCommunication;
  originalOperationName: string;

  constructor(
    action: RestructureAction,
    communication: DrawableClassCommunication
  ) {
    const id = sha256(action + communication.id).toString();
    super(id, action, undefined);
    this.communication = communication;
    this.originalOperationName = communication?.operationName;
  }

  get _logText(): string {
    switch (this.action) {
      case RestructureAction.Create:
        return `-Add a method call "${this.communication?.operationName}" from "${this.communication?.sourceClass.name}" inside the Application "${this.communication?.sourceApp?.name}" to "${this.communication?.targetClass.name}" inside the Application "${this.communication?.targetApp?.name} "\n`;
      case RestructureAction.Rename:
        return `-Rename the method call "${this.originalOperationName}" to "${this.newName}" in "${this.communication?.sourceClass.name}" of Application "${this.communication?.sourceApp?.name}" targeting "${this.communication?.targetClass.name}" in Application "${this.communication?.targetApp?.name}"\n`;
      case RestructureAction.Delete:
        return `-Delete the method call "${this.originalOperationName}" from "${this.communication?.sourceClass.name}" inside the Application "${this.communication?.sourceApp?.name}" to "${this.communication?.targetClass.name}" inside the Application "${this.communication?.targetApp?.name} "\n`;
      default:
        return `COMMUNICATION LOG ERROR\n`;
    }
  }
}
