import { MeshAction } from './restructure-helper';
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

export abstract class BaseChangeLogEntry {
  id: string;
  action: MeshAction;
  originalAppName?: string;
  app?: Application;
  originalPckgName?: string;
  pckg?: Package;
  originalClazzName?: string;
  clazz?: Class;

  wasInserted?: boolean;

  originalOperationName?: string;
  communication?: DrawableClassCommunication;

  constructor(
    action: MeshAction,
    app?: Application,
    pckg?: Package,
    clazz?: Class,
    communication?: DrawableClassCommunication
  ) {
    this.id = sha256(
      action + app?.id + pckg?.id + clazz?.id + communication?.id
    ).toString();
    this.action = action;
    this.app = app;
    this.pckg = pckg;
    this.clazz = clazz;
    this.communication = communication;

    this.originalAppName = app?.name;
    this.originalPckgName = pckg?.name;
    this.originalClazzName = clazz?.name;
    this.originalOperationName = communication?.operationName;
  }

  abstract get _logText(): string;

  set _wasInserted(wasInserted: boolean) {
    this.wasInserted = wasInserted;
  }
}

export class AppChangeLogEntry extends BaseChangeLogEntry {
  createdPckg?: PackageChangeLogEntry;

  newName?: string;

  constructor(action: MeshAction, app: Application) {
    super(action, app);
  }

  get _logText(): string {
    switch (this.action) {
      case MeshAction.Create:
        return `-Create a new Application in "${this.app?.language}" with the name "${this.app?.name}"\n`;
      case MeshAction.Rename:
        return `-Rename the Application "${this.originalAppName}" to "${this.newName}"\n`;
      case MeshAction.Delete:
        return `-Delete the Application with the name "${this.originalAppName}"\n`;
      default:
        return `APP LOG ERROR\n`;
    }
  }

  set _createdPckg(pckgEntry: PackageChangeLogEntry) {
    this.createdPckg = pckgEntry;
  }
}

export class PackageChangeLogEntry extends BaseChangeLogEntry {
  createdClass?: ClassChangeLogEntry;
  createdWithApp?: AppChangeLogEntry;

  newName?: string;

  destinationApp?: Application;
  destinationPckg?: Package;

  origin?: Application | Package;

  constructor(action: MeshAction, app: Application, pckg: Package) {
    super(action, app, pckg);
  }

  get _logText(): string {
    switch (this.action) {
      case MeshAction.Create:
        return `-Create new Package with the name "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
      case MeshAction.Rename:
        return `-Inside the Application "${this.app?.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"\n`;
      case MeshAction.Delete:
        return `-Delete the Package with the name "${this.originalPckgName}" inside the Application "${this.app?.name}"\n`;
      case MeshAction.CutInsert:
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

  set _createdClass(classEntry: ClassChangeLogEntry) {
    this.createdClass = classEntry;
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

  updateOrigin(
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

  setOrigin(origin: Application | Package | Class) {
    this.origin = origin as Application | Package;
  }
}

export class SubPackageChangeLogEntry extends BaseChangeLogEntry {
  createdClass?: ClassChangeLogEntry;

  newName?: string;

  destinationApp?: Application;
  destinationPckg?: Package;

  origin?: Application | Package;

  constructor(action: MeshAction, app: Application, pckg: Package) {
    super(action, app, pckg);
  }

  get _logText(): string {
    switch (this.action) {
      case MeshAction.Create:
        return `-Create new Subpackage with the name "${this.pckg?.name}" under the Package "${this.pckg?.parent?.name}" inside the Application "${this.app?.name}"\n`;
      case MeshAction.Rename:
        return `-Inside the Application "${this.app?.name}" under the Package "${this.pckg?.parent?.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"\n`;
      case MeshAction.Delete:
        return `-Delete the Subpackage with the name "${this.originalPckgName}" under the Package "${this.pckg?.parent?.name}" inside the Application "${this.app?.name}"\n`;
      case MeshAction.CutInsert:
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

  set _createdClass(classEntry: ClassChangeLogEntry) {
    this.createdClass = classEntry;
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

  updateOrigin(
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

  setOrigin(origin: Application | Package | Class) {
    this.origin = origin as Application | Package;
  }
}

export class ClassChangeLogEntry extends BaseChangeLogEntry {
  createdWithPackage?: PackageChangeLogEntry | SubPackageChangeLogEntry;

  newName?: string;

  destinationApp?: Application;
  destinationPckg?: Package;

  origin?: Application | Package | Class;

  constructor(action: MeshAction, app: Application, clazz: Class) {
    super(action, app, clazz.parent, clazz);
  }

  set _createdWithPackage(
    packageEntry: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) {
    this.createdWithPackage = packageEntry;
  }

  get _logText(): string {
    switch (this.action) {
      case MeshAction.Create:
        return `-Create new Class with the name "${this.clazz?.name}" under the package "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
      case MeshAction.Rename:
        return `-Inside the Application "${this.app?.name}" under the Package "${this.pckg?.name}" rename the Class "${this.originalClazzName}" to "${this.newName}"\n`;
      case MeshAction.Delete:
        return `-Delete the Class with the name "${this.originalClazzName}" under the package "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
      case MeshAction.CutInsert:
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

  updateOrigin(destination: Package, landscapeData: StructureLandscapeData) {
    this.pckg = destination;
    if (destination.parent)
      this.app = getApplicationFromSubPackage(landscapeData, destination.id);
    else this.app = getApplicationFromPackage(landscapeData, destination.id);
  }

  setOrigin(origin: Application | Package | Class) {
    this.origin = origin;
  }
}

export class CommunicationChangeLogEntry extends BaseChangeLogEntry {
  newName?: string;

  constructor(action: MeshAction, communication: DrawableClassCommunication) {
    super(action, undefined, undefined, undefined, communication);
  }

  get _logText(): string {
    switch (this.action) {
      case MeshAction.Create:
        return `-Add a method call "${this.communication?.operationName}" from "${this.communication?.sourceClass.name}" inside the Application "${this.communication?.sourceApp?.name}" to "${this.communication?.targetClass.name}" inside the Application "${this.communication?.targetApp?.name} "\n`;
      case MeshAction.Rename:
        return `-Rename the method call "${this.originalOperationName}" to "${this.newName}" in "${this.communication?.sourceClass.name}" of Application "${this.communication?.sourceApp?.name}" targeting "${this.communication?.targetClass.name}" in Application "${this.communication?.targetApp?.name}"\n`;
      case MeshAction.Delete:
        return `-Delete the method call "${this.originalOperationName}" from "${this.communication?.sourceClass.name}" inside the Application "${this.communication?.sourceApp?.name}" to "${this.communication?.targetClass.name}" inside the Application "${this.communication?.targetApp?.name} "\n`;
      default:
        return `COMMUNICATION LOG ERROR\n`;
    }
  }
}
