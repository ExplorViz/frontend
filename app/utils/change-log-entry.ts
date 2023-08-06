import {
  Application,
  Class,
  Package,
} from './landscape-schemes/structure-data';

export enum ChangeLogAction {
  Create = 'CREATE',
  Rename = 'RENAME',
  Delete = 'DELETE',
}

export enum EntryType {
  App = 'APP',
  Package = 'PACKAGE',
  SubPackage = 'SUBPACKAGE',
  Clazz = 'CLAZZ',
}

export class ChangeLogEntry {
  entryType: EntryType | undefined;
  originalAppName?: string;
  app: Application;
  originalPckgName?: string;
  pckg?: Package;
  originalClazzName?: string;
  clazz?: Class;
  newName?: string;
  action: ChangeLogAction;
  description: string;

  constructor(
    action: ChangeLogAction,
    app: Application,
    pckg?: Package,
    clazz?: Class,
    newName?: string
  ) {
    this.action = action;
    this.app = app;
    this.pckg = pckg;
    this.clazz = clazz;
    this.newName = newName;

    if (this.action !== ChangeLogAction.Create) {
      this.originalAppName = app.name;
      this.originalPckgName = pckg?.name;
      this.originalClazzName = clazz?.name;
    }

    this.entryType = this._entryType;
    this.description = this._description;
  }

  get _description(): string {
    switch (this.action) {
      case ChangeLogAction.Create:
        if (this.app && !this.pckg && !this.clazz) {
          return `Create a new Application with the name "${this.app.name}"`;
        } else if (this.app && this.pckg && this.pckg.parent && !this.clazz) {
          return `Create new Subpackage with the name "${this.pckg.name}" under the Package "${this.pckg.parent.name}" inside the Application "${this.app.name}"`;
        } else if (this.app && this.pckg && !this.clazz) {
          return `Create new Package with the name "${this.pckg.name}" inside the Application "${this.app.name}"`;
        } else if (this.app && this.pckg && this.clazz) {
          return `Create new Class with the name "${this.clazz.name}" under the package "${this.pckg.name}" inside the Application "${this.app.name}"`;
        }
        break;
      case ChangeLogAction.Rename:
        if (this.app && !this.pckg && !this.clazz) {
          return `Rename the Application "${this.originalAppName}" to "${this.newName}"`;
        } else if (this.app && this.pckg && this.pckg.parent && !this.clazz) {
          return `Inside the Application "${this.app.name}" under the Package "${this.pckg.parent.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"`;
        } else if (this.app && this.pckg && !this.clazz) {
          return `Inside the Application "${this.app.name}" rename the Package "${this.originalPckgName}" to "${this.newName}"`;
        } else if (this.app && this.pckg && this.clazz) {
          return `Inside the Application "${this.app.name}" under the Package "${this.pckg.name}" rename the Class "${this.originalClazzName}" to "${this.newName}"`;
        }
        break;
      case ChangeLogAction.Delete:
        if (this.app && !this.pckg && !this.clazz) {
          return `Delete the Application with the name "${this.app.name}"`;
        } else if (this.app && this.pckg && this.pckg.parent && !this.clazz) {
          return `Delete the Subpackage with the name "${this.pckg.name}" under the Package "${this.pckg.parent.name}" inside the Application "${this.app.name}"`;
        } else if (this.app && this.pckg && !this.clazz) {
          return `Delete the Package with the name "${this.pckg.name}" inside the Application "${this.app.name}"`;
        } else if (this.app && this.pckg && this.clazz) {
          return `Delete the Class with the name "${this.clazz.name}" under the package "${this.pckg.name}" inside the Application "${this.app.name}"`;
        }
        break;
    }
    return '';
  }

  get _entryType() {
    if (this.app && !this.pckg && !this.clazz) {
      return EntryType.App;
    } else if (this.app && this.pckg && this.pckg.parent && !this.clazz) {
      return EntryType.SubPackage;
    } else if (this.app && this.pckg && !this.clazz) {
      return EntryType.Package;
    } else if (this.app && this.pckg && this.clazz) {
      return EntryType.Clazz;
    }
    return undefined;
  }
}
