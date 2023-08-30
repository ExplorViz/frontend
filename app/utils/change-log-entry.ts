import {
  Application,
  Class,
  isApplication,
  isPackage,
  Package,
  StructureLandscapeData,
} from './landscape-schemes/structure-data';
import {
  getApplicationFromPackage,
  getApplicationFromSubPackage,
} from './landscape-structure-helpers';

export enum MeshAction {
  Create = 'CREATE',
  Rename = 'RENAME',
  Delete = 'DELETE',
  CutInsert = 'CUTINSERT',
  Communication = 'COMMUNICATION',
}

export enum EntityType {
  App = 'APP',
  Package = 'PACKAGE',
  SubPackage = 'SUBPACKAGE',
  Clazz = 'CLAZZ',
}

export class ChangeLogEntry {
  entryType: EntityType | undefined;
  originalAppName?: string;
  app?: Application;
  originalPckgName?: string;
  pckg?: Package;
  originalClazzName?: string;
  clazz?: Class;
  destinationPckg?: Package;
  destinationApp?: Application;
  destinationClass?: Class;
  newName?: string;
  methodName?: string;
  action: MeshAction;
  description: string;

  constructor(
    action: MeshAction,
    app: Application,
    pckg?: Package,
    clazz?: Class,
    newName?: string,
    destination?: Application | Package,
    landscapeStructure?: StructureLandscapeData,
    destinationClass?: Class,
    methodName?: string
  ) {
    this.action = action;
    this.app = app;
    this.pckg = pckg;
    this.clazz = clazz;
    this.newName = newName;
    this.destinationClass = destinationClass;
    this.methodName = methodName;

    if (destination && landscapeStructure)
      this.updateDestination(destination, landscapeStructure);

    if (this.action !== MeshAction.Create) {
      this.originalAppName = app?.name;
      this.originalPckgName = pckg?.name;
      this.originalClazzName = clazz?.name;
    }

    this.entryType = this._entryType;
    this.description = this._description;
  }

  get _description(): string {
    switch (this.action) {
      case MeshAction.Create:
        if (this.entryType === EntityType.App) {
          return `-Create a new Application in "${this.app?.language}" with the name "${this.app?.name}"\n`;
        } else if (this.entryType === EntityType.SubPackage) {
          return `-Create new Subpackage with the name "${this.pckg?.name}" under the Package "${this.pckg?.parent?.name}" inside the Application "${this.app?.name}"\n`;
        } else if (this.entryType === EntityType.Package) {
          return `-Create new Package with the name "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
        } else if (this.entryType === EntityType.Clazz) {
          return `-Create new Class with the name "${this.clazz?.name}" under the package "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
        }
        break;
      case MeshAction.Rename:
        if (this.entryType === EntityType.App) {
          return `-Rename the Application "${this.originalAppName}" to "${this.newName}"\n`;
        } else if (this.entryType === EntityType.SubPackage) {
          return `-Inside the Application "${this.app?.name}" under the Package "${this.pckg?.parent?.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"\n`;
        } else if (this.entryType === EntityType.Package) {
          return `-Inside the Application "${this.app?.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"\n`;
        } else if (this.entryType === EntityType.Clazz) {
          return `-Inside the Application "${this.app?.name}" under the Package "${this.pckg?.name}" rename the Class "${this.originalClazzName}" to "${this.newName}"\n`;
        }
        break;
      case MeshAction.Delete:
        if (this.entryType === EntityType.App) {
          return `-Delete the Application with the name "${this.originalAppName}"\n`;
        } else if (this.entryType === EntityType.SubPackage) {
          return `-Delete the Subpackage with the name "${this.pckg?.name}" under the Package "${this.pckg?.parent?.name}" inside the Application "${this.app?.name}"\n`;
        } else if (this.entryType === EntityType.Package) {
          return `-Delete the Package with the name "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
        } else if (this.entryType === EntityType.Clazz) {
          return `-Delete the Class with the name "${this.clazz?.name}" under the package "${this.pckg?.name}" inside the Application "${this.app?.name}"\n`;
        }
        break;
      case MeshAction.CutInsert:
        if (this.destinationPckg && this.destinationApp) {
          if (
            this.entryType === EntityType.SubPackage &&
            this.pckg &&
            this.app
          ) {
            return `-Move the Subpackage "${this.pckg.name}" from the Application "${this.app.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
          } else if (
            this.entryType === EntityType.Package &&
            this.app &&
            this.pckg
          ) {
            return `-Move the Package "${this.pckg.name}" from the Application "${this.app.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
          } else if (
            this.entryType === EntityType.Clazz &&
            this.app &&
            this.clazz
          ) {
            return `-Move the Class "${this.clazz.name}" under the Package "${this.originalPckgName}" from the Application "${this.app.name}" to the Package "${this.destinationPckg.name}" inside the Application "${this.destinationApp.name}"\n`;
          }
        } else if (!this.destinationPckg && this.destinationApp) {
          if (
            this.entryType === EntityType.SubPackage &&
            this.pckg &&
            this.app
          ) {
            return `-Move the Subpackage "${this.pckg.name}" from the Application "${this.app.name}" inside the Application "${this.destinationApp.name}"\n`;
          } else if (
            this.entryType === EntityType.Package &&
            this.app &&
            this.pckg
          ) {
            return `-Move the Package "${this.pckg.name}" from the Application "${this.app.name}" inside the Application "${this.destinationApp.name}"\n`;
          }
        }
        break;
      case MeshAction.Communication:
        return `-Add a method call "${this.methodName}" from "${this.clazz?.name}" inside the Application "${this.app?.name}" to "${this.destinationClass?.name}" inside the Application "${this.destinationApp?.name} "\n`;
    }
    return '';
  }

  get _originalAppName() {
    return this.originalAppName;
  }

  get _entryType() {
    if (this.app && !this.pckg && !this.clazz) {
      return EntityType.App;
    } else if (this.app && this.pckg && this.pckg.parent && !this.clazz) {
      return EntityType.SubPackage;
    } else if (this.app && this.pckg && !this.clazz) {
      return EntityType.Package;
    } else if (this.app && this.pckg && this.clazz) {
      return EntityType.Clazz;
    }
    return undefined;
  }

  updateOriginalAppName(newName: string) {
    this.originalAppName = newName;
  }

  updateCreateEntry(
    destination: Application | Package,
    landscapeStructure: StructureLandscapeData
  ) {
    if (isApplication(destination)) {
      this.app = destination;
    } else if (isPackage(destination)) {
      this.pckg = destination;
      if (destination.parent && landscapeStructure) {
        this.app = getApplicationFromSubPackage(
          landscapeStructure,
          destination.id
        );
      } else if (!destination.parent && landscapeStructure) {
        this.app = getApplicationFromPackage(
          landscapeStructure,
          destination.id
        );
      }
    }
  }

  updateDestination(
    destination: Application | Package,
    landscapeStructure: StructureLandscapeData
  ) {
    if (isApplication(destination)) {
      this.destinationApp = destination;
    } else if (isPackage(destination)) {
      this.destinationPckg = destination;
      if (destination.parent && landscapeStructure) {
        this.destinationApp = getApplicationFromSubPackage(
          landscapeStructure,
          destination.id
        );
      } else if (!destination.parent && landscapeStructure) {
        this.destinationApp = getApplicationFromPackage(
          landscapeStructure,
          destination.id
        );
      }
    }
  }
}
