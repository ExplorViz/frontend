import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import {
  addFoundationToLandscape,
  addMethodToClass,
  movePackage,
  moveClass,
  removeApplication,
  removeClassFromPackage,
  removePackageFromApplication,
  getClassInApplicationById,
  createPackage,
  createClass,
  changeID,
  copyPackageContent,
  copyClassContent,
  restoreID,
  removeAffectedCommunications,
  canDeleteClass,
  canDeletePackage,
  pastePackage,
  pasteClass,
  duplicateApplication,
} from 'explorviz-frontend/utils/restructure-helper';
import ApplicationRenderer from './application-renderer';
import {
  Application,
  Class,
  Package,
  isApplication,
  isClass,
  isPackage,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  getApplicationFromClass,
  getApplicationFromPackage,
  getApplicationFromSubPackage,
  getApplicationInLandscapeById,
} from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationRepository from './repos/application-repository';
import Changelog from './changelog';
import {
  getClassesInPackage,
  getPackageById,
  getSubPackagesOfPackage,
} from 'explorviz-frontend/utils/package-helpers';
import { getClassById } from 'explorviz-frontend/utils/class-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import {
  RestructureAction,
  EntityType,
} from 'explorviz-frontend/utils/restructure-helper';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import LinkRenderer from './link-renderer';
import * as THREE from 'three';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import UserSettings from './user-settings';
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from 'explorviz-frontend/utils/changelog-entry';
import LandscapeListener from './landscape-listener';
import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';

type MeshModelTextureMapping = {
  action: RestructureAction;
  meshType: EntityType;
  texturePath: string;
  app: Application;
  pckg?: Package;
  clazz?: Class;
};

type CommModelColorMapping = {
  action: RestructureAction;
  comm: AggregatedClassCommunication;
  color: THREE.Color;
};

type diverseDataModel =
  | Application
  | Package
  | Class
  | AggregatedClassCommunication;

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('changelog')
  changeLog!: Changelog;

  @service('landscape-listener')
  landscapeListener!: LandscapeListener;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @tracked
  restructureMode: boolean = false;

  @tracked
  landscapeData: LandscapeData | null = null;

  /**
   * Using amount of new Meshes for unique mesh id's
   */
  @tracked
  newMeshCounter: number = 1;

  /**
   * Storing all the Meshes with corresponding texture
   */
  @tracked
  meshModelTextureMappings: MeshModelTextureMapping[] = [];

  /**
   * Storing all Communication Meshes with corresponding color
   */
  @tracked
  commModelColorMappings: CommModelColorMapping[] = [];

  @tracked
  deletedDataModels: diverseDataModel[] = [];

  @tracked
  canvas!: HTMLCanvasElement;

  @tracked
  clipboard: string = '';

  @tracked
  clippedMesh: Package | Class | null = null;

  /**
   * Storing all communications created by user
   */
  @tracked
  createdClassCommunication: AggregatedClassCommunication[] = [];

  /**
   * Storing all communications in the landscape
   */
  @tracked
  allClassCommunications: AggregatedClassCommunication[] = [];

  /**
   * Storing all copied communications
   */
  @tracked
  copiedClassCommunications: Map<string, AggregatedClassCommunication[]> =
    new Map();

  /**
   * Storing all communications that have been updated
   */
  @tracked
  updatedClassCommunications: Map<string, AggregatedClassCommunication[]> =
    new Map();

  /**
   * Storing all communications that will be completely deleted from the visual
   */
  @tracked
  completelyDeletedClassCommunications: Map<
    string,
    AggregatedClassCommunication[]
  > = new Map();

  /**
   * Storing all communication that will be deleted and shown visually
   */
  @tracked
  deletedClassCommunications: AggregatedClassCommunication[] = [];

  @tracked
  sourceClass: Class | null = null;

  @tracked
  targetClass: Class | null = null;

  resetLandscapeRestructure() {
    this.restructureMode = false;
    this.landscapeData = null;
    this.newMeshCounter = 1;
    this.meshModelTextureMappings = [];
    this.commModelColorMappings = [];
    this.deletedDataModels = [];
    this.clipboard = '';
    this.clippedMesh = null;
    this.createdClassCommunication = [];
    this.allClassCommunications = [];
    this.copiedClassCommunications = new Map();
    this.updatedClassCommunications = new Map();
    this.completelyDeletedClassCommunications = new Map();
    this.deletedClassCommunications = [];
    this.sourceClass = null;
    this.targetClass = null;
    this.changeLog.resetChangeLog();
    this.trigger('showChangeLog');

    this.landscapeListener.initLandscapePolling();
  }

  setSourceOrTargetClass(type: string) {
    if (type == 'source' && isClass(this.clippedMesh))
      this.sourceClass = this.clippedMesh;
    else if (type == 'target' && isClass(this.clippedMesh))
      this.targetClass = this.clippedMesh;
  }

  setCommunicationSourceClass(clazz: Class) {
    this.sourceClass = clazz;
  }

  setCommunicationTargetClass(clazz: Class) {
    this.targetClass = clazz;
  }

  addCollaborativeCommunication(
    sourceClassId: string,
    targetClassId: string,
    methodName: string
  ) {
    this.sourceClass = getClassById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      sourceClassId
    ) as Class;
    this.targetClass = getClassById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      targetClassId
    ) as Class;
    this.addCommunication(methodName, true);
  }

  addCommunication(methodName: string, collabMode: boolean = false) {
    if (
      methodName === '' ||
      this.sourceClass === null ||
      this.targetClass === null
    ) {
      AlertifyHandler.showAlertifyError('Missing communication data');
      return;
    }

    if (this.sourceClass === this.targetClass) {
      AlertifyHandler.showAlertifyError('Select 2 different classes');
      return;
    }

    if (!collabMode)
      this.sender.sendRestructureCommunicationMessage(
        this.sourceClass?.id as string,
        this.targetClass?.id as string,
        methodName
      );

    if (
      this.sourceClass &&
      this.targetClass &&
      this.landscapeData?.structureLandscapeData
    ) {
      const sourceApp = getApplicationFromClass(
        this.landscapeData.structureLandscapeData,
        this.sourceClass
      );
      const targetApp = getApplicationFromClass(
        this.landscapeData.structureLandscapeData,
        this.targetClass
      );

      addMethodToClass(this.targetClass, methodName);

      // Create model of communication between two classes
      const classCommunication: AggregatedClassCommunication = {
        id:
          this.sourceClass.name +
          ' => ' +
          this.targetClass.name +
          '|' +
          methodName,
        methodCalls: [],
        isRecursive: this.sourceClass.id === this.targetClass.id,
        isBidirectional: false,
        totalRequests: 1,
        metrics: { normalizedRequestCount: 1 },
        sourceClass: this.sourceClass,
        targetClass: this.targetClass,
        operationName: methodName,
        sourceApp: sourceApp!,
        targetApp: targetApp!,
        addMethodCalls: () => {},
        getClasses: () => [this.sourceClass!, this.targetClass!],
      };

      // Create the Changelog Entry
      this.changeLog.communicationEntry(classCommunication);

      this.createdClassCommunication.pushObject(classCommunication);

      this.commModelColorMappings.push({
        action: RestructureAction.Communication,
        comm: classCommunication,
        color: new THREE.Color(0xbc42f5),
      });
      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  @action
  deleteCommunication(
    comm: AggregatedClassCommunication,
    undo: boolean = false,
    collabMode: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureDeleteCommunicationMessage(undo, comm.id);
    }
    if (undo) {
      const newCreatedComm = comm.id.includes(' => ');
      if (newCreatedComm) {
        this.createdClassCommunication.removeObject(comm);
        this.commModelColorMappings.pop();
      } else {
        this.deletedClassCommunications.removeObject(comm);
        const commMapping = this.commModelColorMappings.popObject();
        const commMesh = this.getCommMesh(commMapping);
        const commColor = new THREE.Color(
          this.userSettings.applicationSettings.communicationColor.value
        );

        commMesh?.changeColor(commColor);
        this.deletedDataModels.removeObject(comm);
      }
    } else {
      const newCreatedComm = comm.id.includes(' => ');
      if (newCreatedComm) {
        this.createdClassCommunication.removeObject(comm);
      } else {
        this.deletedClassCommunications.pushObject(comm);
        this.commModelColorMappings.push({
          action: RestructureAction.Communication,
          comm: comm,
          color: new THREE.Color(0x1c1c1c),
        });
      }

      this.changeLog.deleteCommunicationEntry(comm);
      this.deletedDataModels.pushObject(comm);
    }
    this.trigger('showChangeLog');
    this.trigger(
      'restructureLandscapeData',
      this.landscapeData?.structureLandscapeData,
      this.landscapeData?.dynamicLandscapeData
    );
  }

  @action
  toggleRestructureMode() {
    this.restructureMode = !this.restructureMode;
    this.trigger('restructureMode');
    this.sender.sendRestructureModeUpdate();
  }

  async toggleRestructureModeLocally() {
    this.restructureMode = !this.restructureMode;
    this.trigger('openSettingsSidebar');
    this.trigger('restructureComponent', 'restructure-landscape');
    await new Promise((f) => setTimeout(f, 500));
    this.trigger('restructureMode');
  }

  setLandscapeData(newData: LandscapeData | null) {
    this.landscapeData = newData;
  }

  duplicateApp(app: Application, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode) {
        this.sender.sendRestructureDuplicateAppMessage(app.id);
      }

      const wrapper = {
        idCounter: this.newMeshCounter,
        comms: this.allClassCommunications,
        copiedComms: [],
      };

      const duplicatedApp = duplicateApplication(
        this.landscapeData.structureLandscapeData,
        app,
        wrapper
      );

      this.newMeshCounter++;

      this.changeLog.duplicateAppEntry(duplicatedApp);

      this.meshModelTextureMappings.push({
        action: RestructureAction.CopyPaste,
        meshType: EntityType.App,
        texturePath: 'images/x.png',
        app: duplicatedApp,
      });

      const key = 'DUPLICATED|' + duplicatedApp.id;

      this.copiedClassCommunications.set(key, wrapper.copiedComms);

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  renameApplication(
    name: string,
    id: string,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureUpdate(EntityType.App, id, name, null, undo);

      const app = getApplicationInLandscapeById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (app) {
        if (!undo) {
          // Create Changelog Entry
          this.changeLog.renameAppEntry(app, name);

          this.meshModelTextureMappings.push({
            action: RestructureAction.Rename,
            meshType: EntityType.App,
            texturePath: 'images/hashtag.png',
            app: app as Application,
          });
        } else {
          const undoMapping = this.meshModelTextureMappings.find(
            (mapping) =>
              mapping.action === RestructureAction.Rename &&
              mapping.meshType === EntityType.App &&
              mapping.app === app
          );
          this.meshModelTextureMappings.removeObject(
            undoMapping as MeshModelTextureMapping
          );
        }
        // Set new Application name
        app.name = name;

        this.trigger('showChangeLog');
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  renamePackage(
    name: string,
    id: string,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureUpdate(
          EntityType.Package,
          id,
          name,
          null,
          undo
        );

      const pckg = getPackageById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (pckg) {
        const app = this.getAppFromPackage(pckg);

        if (!undo) {
          // Create Changelog Entry
          if (!pckg.parent && app)
            this.changeLog.renamePackageEntry(app, pckg, name);
          else if (pckg.parent && app)
            this.changeLog.renameSubPackageEntry(app, pckg, name);

          this.meshModelTextureMappings.push({
            action: RestructureAction.Rename,
            meshType: EntityType.Package,
            texturePath: 'images/hashtag.png',
            app: app as Application,
            pckg: pckg,
          });
        } else {
          const undoMapping = this.meshModelTextureMappings.find(
            (mapping) =>
              mapping.action === RestructureAction.Rename &&
              mapping.meshType === EntityType.Package &&
              mapping.app === app &&
              mapping.pckg === pckg
          );

          this.meshModelTextureMappings.removeObject(
            undoMapping as MeshModelTextureMapping
          );
        }

        // Set new Package name
        pckg.name = name;

        this.trigger('showChangeLog');
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  renameSubPackage(
    name: string,
    id: string,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureUpdate(
          EntityType.SubPackage,
          id,
          name,
          null,
          undo
        );

      const pckg = getPackageById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (pckg) {
        const app = this.getAppFromPackage(pckg);

        if (!undo) {
          // Create Changelog Entry
          if (app) this.changeLog.renameSubPackageEntry(app, pckg, name);

          this.meshModelTextureMappings.push({
            action: RestructureAction.Rename,
            meshType: EntityType.Package,
            texturePath: 'images/hashtag.png',
            app: app as Application,
            pckg: pckg,
          });
        } else {
          const undoMapping = this.meshModelTextureMappings.find(
            (mapping) =>
              mapping.action === RestructureAction.Rename &&
              mapping.meshType === EntityType.Package &&
              mapping.app === app &&
              mapping.pckg === pckg
          );
          this.meshModelTextureMappings.removeObject(
            undoMapping as MeshModelTextureMapping
          );
        }

        // Set new Package name
        pckg.name = name;

        this.trigger('showChangeLog');
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  private getAppFromPackage(pckg: Package) {
    let app: Application | undefined;
    if (this.landscapeData?.structureLandscapeData) {
      if (!pckg.parent)
        app = getApplicationFromPackage(
          this.landscapeData.structureLandscapeData,
          pckg.id
        );
      else
        app = getApplicationFromSubPackage(
          this.landscapeData.structureLandscapeData,
          pckg.id
        );
    }
    return app;
  }

  renameClass(
    name: string,
    id: string,
    appId: string,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureUpdate(
          EntityType.Clazz,
          id,
          name,
          appId,
          undo
        );

      const application = getApplicationInLandscapeById(
        this.landscapeData.structureLandscapeData,
        appId
      );
      if (application) {
        const clazzToRename = getClassInApplicationById(application, id);

        if (clazzToRename) {
          if (!undo) {
            // Create Changelog Entry
            this.changeLog.renameClassEntry(application, clazzToRename, name);

            this.meshModelTextureMappings.push({
              action: RestructureAction.Rename,
              meshType: EntityType.Clazz,
              texturePath: 'images/hashtag.png',
              app: application as Application,
              clazz: clazzToRename,
            });
          } else {
            const undoMapping = this.meshModelTextureMappings.find(
              (mapping) =>
                mapping.action === RestructureAction.Rename &&
                mapping.meshType === EntityType.Clazz &&
                mapping.app === application &&
                mapping.clazz === clazzToRename
            );
            this.meshModelTextureMappings.removeObject(
              undoMapping as MeshModelTextureMapping
            );
          }

          // Set new Class name
          clazzToRename.name = name;

          this.trigger('showChangeLog');
          this.trigger(
            'restructureLandscapeData',
            this.landscapeData.structureLandscapeData,
            this.landscapeData.dynamicLandscapeData
          );
        }
      }
    }
  }

  renameOperation(
    communication: AggregatedClassCommunication,
    newName: string,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureRenameOperationMessage(
        communication.id,
        newName,
        undo
      );
    }

    const key = 'RENAMED|' + communication.id;
    const found = this.updatedClassCommunications.has(key);

    if (!undo) {
      this.changeLog.renameOperationEntry(communication, newName);
      communication.operationName = newName;

      // If the communication was not updated before, then create an entry
      if (!found) {
        this.updatedClassCommunications.set(key as string, [communication]);
      }
    } else {
      this.updatedClassCommunications.delete(key);
      communication.operationName = newName;
    }

    this.trigger('showChangeLog');
    this.trigger(
      'restructureLandscapeData',
      this.landscapeData?.structureLandscapeData,
      this.landscapeData?.dynamicLandscapeData
    );
  }

  restoreApplication(
    app: Application,
    undoCutOperation: boolean = false,
    collabMode: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureRestoreAppMessage(app.id, undoCutOperation);
    }

    this.restoreDeletedAppData(app as Application);
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === RestructureAction.Delete &&
        mapping.meshType === EntityType.App &&
        mapping.app === app
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );
    if (undoCutOperation) {
      if (this.createdClassCommunication.length) {
        this.createdClassCommunication.forEach((comm) => {
          if (!comm.sourceApp) {
            comm.sourceApp = app;
          }
          if (!comm.targetApp) {
            comm.targetApp = app;
          }
        });
      }
      restoreID({ entity: app }, 'removed|');
    } else {
      this.completelyDeletedClassCommunications.delete(app.id);
    }

    this.trigger('showChangeLog');
    this.trigger(
      'restructureLandscapeData',
      this.landscapeData?.structureLandscapeData,
      this.landscapeData?.dynamicLandscapeData
    );
  }

  restorePackage(
    pckg: Package,
    undoCutOperation: boolean = false,
    collabMode: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureRestorePackageMessage(
        pckg.id,
        undoCutOperation
      );
    }

    this.restoreDeletedPackageData(pckg as Package);
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === RestructureAction.Delete &&
        mapping.meshType === EntityType.Package &&
        mapping.pckg === pckg
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );

    // Cut or Undo Operation? In case of Cut we also need to restore the communications!
    if (undoCutOperation) {
      const keyToRemove = 'CUTINSERT|' + pckg.id;

      this.updatedClassCommunications.delete(keyToRemove);

      const app = this.getApp(pckg)!;
      if (this.createdClassCommunication.length) {
        this.createdClassCommunication.forEach((comm) => {
          if (!comm.sourceApp) {
            comm.sourceApp = app;
          }
          if (!comm.targetApp) {
            comm.targetApp = app;
          }
        });
      }
      this.removeMeshModelTextureMapping(
        RestructureAction.CutInsert,
        EntityType.Package,
        app as Application,
        pckg
      );
      restoreID({ entity: pckg }, 'removed|');
    } else {
      this.completelyDeletedClassCommunications.delete(pckg.id);
    }

    this.trigger('showChangeLog');
    this.trigger(
      'restructureLandscapeData',
      this.landscapeData?.structureLandscapeData,
      this.landscapeData?.dynamicLandscapeData
    );
  }

  restoreClass(
    app: Application,
    clazz: Class,
    undoCutOperation: boolean = false,
    collabMode: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureRestoreClassMessage(
        app.id,
        clazz.id,
        undoCutOperation
      );
    }

    this.deletedDataModels.removeObject(clazz);
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === RestructureAction.Delete &&
        mapping.meshType === EntityType.Clazz &&
        mapping.app === app &&
        mapping.clazz === clazz
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );
    if (undoCutOperation) {
      const keyToRemove = 'CUTINSERT|' + clazz.id;

      this.updatedClassCommunications.delete(keyToRemove);

      restoreID({ entity: clazz }, 'removed|');
      if (this.createdClassCommunication.length) {
        this.createdClassCommunication.forEach((comm) => {
          // referencing the original app again
          if (!comm.sourceApp) {
            comm.sourceApp = app;
          }
          if (!comm.targetApp) {
            comm.targetApp = app;
          }

          // referencing the original class again
          if (comm.sourceClass.id === clazz.id) {
            comm.sourceClass = clazz;
          }
          if (comm.targetClass.id === clazz.id) {
            comm.targetClass = clazz;
          }
        });
      }
      this.removeMeshModelTextureMapping(
        RestructureAction.CutInsert,
        EntityType.Clazz,
        app,
        clazz.parent,
        clazz
      );
    } else {
      this.completelyDeletedClassCommunications.delete(clazz.id);
    }

    this.trigger('showChangeLog');
    this.trigger(
      'restructureLandscapeData',
      this.landscapeData?.structureLandscapeData,
      this.landscapeData?.dynamicLandscapeData
    );
  }

  removeInsertTexture(element: Package) {
    let app: Application;
    if (element.parent) {
      app = getApplicationFromSubPackage(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        element.id
      ) as Application;
    } else {
      app = getApplicationFromPackage(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        element.id
      ) as Application;
    }
    this.removeMeshModelTextureMapping(
      RestructureAction.CutInsert,
      EntityType.Package,
      app,
      element
    );
  }

  undoDuplicateApp(app: Application) {
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === RestructureAction.CopyPaste &&
        mapping.meshType === EntityType.App &&
        mapping.app === app
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );

    const keyToRemove = 'DUPLICATED|' + app.id;

    this.copiedClassCommunications.delete(keyToRemove);
  }

  undoCopyPackage(app: Application, pckg: Package) {
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === RestructureAction.CopyPaste &&
        mapping.meshType === EntityType.Package &&
        mapping.app === app &&
        mapping.pckg === pckg
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );

    const keyToRemove = 'COPIED|' + pckg.id;

    this.copiedClassCommunications.delete(keyToRemove);
  }

  undoCopyClass(app: Application, clazz: Class) {
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === RestructureAction.CopyPaste &&
        mapping.meshType === EntityType.Clazz &&
        mapping.app === app &&
        mapping.clazz === clazz
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );

    const keyToRemove = 'COPIED|' + clazz.id;

    this.copiedClassCommunications.delete(keyToRemove);
  }

  addApplication(
    appName: string,
    language: string,
    collabMode: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.App,
          RestructureAction.Create,
          appName,
          language,
          null,
          false
        );

      const foundation = addFoundationToLandscape(
        appName,
        language,
        this.newMeshCounter
      );
      const app = foundation.applications.firstObject;
      const pckg = app?.packages.firstObject;
      const clazz = pckg?.classes.firstObject;
      this.landscapeData.structureLandscapeData.nodes.push(foundation);

      // Create Changelog Entry
      this.changeLog.createAppEntry(
        app as Application,
        pckg as Package,
        clazz as Class
      );

      this.meshModelTextureMappings.push({
        action: RestructureAction.Create,
        meshType: EntityType.App,
        texturePath: 'images/plus.png',
        app: app as Application,
        pckg: pckg as Package,
        clazz: clazz as Class,
      });

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  applyColorMappings() {
    if (this.restructureMode) {
      this.commModelColorMappings.forEach((elem) => {
        const commMesh = this.getCommMesh(elem);

        commMesh?.changeColor(elem.color);
      });
    }
  }

  private getCommMesh(elem: CommModelColorMapping) {
    // Distinguish between internal comms and external comms
    if (elem.comm.sourceApp === elem.comm.targetApp) {
      const appModel = this.applicationRenderer.getApplicationById(
        elem.comm.sourceApp?.id as string
      );

      const newCreatedComm = elem.comm.id.includes(' => ');
      if (newCreatedComm) {
        const commMesh = appModel?.commIdToMesh.get(elem.comm.id);
        return commMesh;
      } else {
        // A communication can consist of multiple function calls. The id looks something this: XXX_XXX_operationName
        // The operatioName represents the name of the first function.
        // We need to remove this suffix to get a base ID of the form: XXX_XXX
        const suffixToRemove = '_' + elem.comm.operationName;
        const meshId = elem.comm.id.replace(suffixToRemove, '');

        // Now that we have an Id of the form: XXX_XXX we are only missing the _operationName suffix.
        // We'll look for a key in the 'commIdToMesh' map that starts with our base ID.
        if (appModel) {
          for (const key of appModel.commIdToMesh.keys()) {
            if (key.startsWith(meshId)) {
              return appModel?.commIdToMesh.get(key);
            }
          }
        }

        // Should never happen!

        return undefined;
      }
    } else {
      const commMesh = this.linkRenderer.getLinkById(elem.comm.id);
      return commMesh;
    }
  }

  applyTextureMappings() {
    if (this.restructureMode) {
      this.meshModelTextureMappings.forEach((elem) => {
        const currentAppModel = this.applicationRenderer.getApplicationById(
          elem.app?.id as string
        );
        // Apply Plus texture for new created Meshes
        if (elem.action === RestructureAction.Create) {
          if (elem.meshType === EntityType.App) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              if (mesh instanceof ClazzMesh) {
                mesh.changeTexture(elem.texturePath, 1);
              } else {
                mesh.changeTexture(elem.texturePath);
              }
            });
          } else if (
            elem.meshType === EntityType.Package ||
            elem.meshType === EntityType.SubPackage
          ) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              const isCorrectComponent =
                mesh instanceof ComponentMesh &&
                mesh.dataModel.id === elem.pckg?.id;
              const isCorrectClass =
                mesh instanceof ClazzMesh &&
                mesh.dataModel.id === elem.clazz?.id;
              if (isCorrectComponent) {
                mesh.changeTexture(elem.texturePath);
              }
              if (isCorrectClass) {
                mesh.changeTexture(elem.texturePath, 1);
              }
            });
          } else if (elem.meshType === EntityType.Clazz) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              const isCorrectClass =
                mesh instanceof ClazzMesh &&
                mesh.dataModel.id === elem.clazz?.id;
              if (isCorrectClass) {
                mesh.changeTexture(elem.texturePath, 1);
              }
            });
          }
          // Apply Minus texture for deleted Meshes
        } else if (elem.action === RestructureAction.Delete) {
          if (elem.meshType === EntityType.App) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              mesh.changeTexture(elem.texturePath);
            });
          } else if (
            elem.meshType === EntityType.Package ||
            elem.meshType === EntityType.SubPackage
          ) {
            const allSubPackages = getSubPackagesOfPackage(
              elem.pckg as Package,
              true
            );
            const allClassesInPackage = getClassesInPackage(
              elem.pckg as Package,
              true
            );
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              const isCorrectComponent =
                mesh instanceof ComponentMesh &&
                mesh.dataModel.id === elem.pckg?.id;
              const isCorrectClass =
                mesh instanceof ClazzMesh &&
                mesh.dataModel.id === elem.clazz?.id;
              if (isCorrectComponent || isCorrectClass) {
                mesh.changeTexture(elem.texturePath);
              }
            });
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              allSubPackages.forEach((pckg) => {
                const isCorrectComponent =
                  mesh instanceof ComponentMesh &&
                  mesh.dataModel.id === pckg.id;
                if (isCorrectComponent) {
                  mesh.changeTexture(elem.texturePath);
                }
              });

              allClassesInPackage.forEach((clazz) => {
                const isCorrectClass =
                  mesh instanceof ClazzMesh && mesh.dataModel.id === clazz.id;
                if (isCorrectClass) {
                  mesh.changeTexture(elem.texturePath, 1);
                }
              });
            });
          } else if (elem.meshType === EntityType.Clazz) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              const isCorrectClass =
                mesh instanceof ClazzMesh &&
                mesh.dataModel.id === elem.clazz?.id;
              if (isCorrectClass) {
                mesh.changeTexture(elem.texturePath, 1);
              }
            });
          }
          // Apply Hashtag texture for renamed operations
        } else if (elem.action === RestructureAction.Rename) {
          if (elem.meshType === EntityType.App) {
            const appliedTexture = this.findAppliedTexture(elem.app);
            if (!appliedTexture) {
              const foundationMesh = currentAppModel?.modelIdToMesh.get(
                elem.app.id
              );
              foundationMesh?.changeTexture(elem.texturePath);
            }
          } else if (elem.meshType === EntityType.Package) {
            const appliedTexture = this.findAppliedTexture(
              elem.pckg as Package,
              RestructureAction.CutInsert
            );

            if (!appliedTexture) {
              const componentMesh = currentAppModel?.modelIdToMesh.get(
                elem.pckg?.id as string
              );
              componentMesh?.changeTexture(elem.texturePath);
            }
          } else if (elem.meshType === EntityType.Clazz) {
            const appliedTexture = this.findAppliedTexture(
              elem.clazz as Class,
              RestructureAction.CutInsert
            );
            if (!appliedTexture) {
              const clazzMesh = currentAppModel?.modelIdToMesh.get(
                elem.clazz?.id as string
              );
              clazzMesh?.changeTexture(elem.texturePath, 1);
            }
          }
          // Apply X texture for copied Meshes
        } else if (elem.action === RestructureAction.CopyPaste) {
          if (elem.meshType === EntityType.App) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              if (mesh instanceof ClazzMesh) {
                mesh.changeTexture(elem.texturePath, 1);
              } else {
                mesh.changeTexture(elem.texturePath);
              }
            });
          } else if (elem.meshType === EntityType.Package) {
            const allSubPackages = getSubPackagesOfPackage(
              elem.pckg as Package,
              true
            );
            const allClassesInPackage = getClassesInPackage(
              elem.pckg as Package,
              true
            );

            const componentMesh = currentAppModel?.modelIdToMesh.get(
              elem.pckg?.id as string
            );

            componentMesh?.changeTexture(elem.texturePath);
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              allSubPackages.forEach((pckg) => {
                const isCorrectComponent =
                  mesh instanceof ComponentMesh &&
                  mesh.dataModel.id === pckg.id;
                if (isCorrectComponent) {
                  mesh.changeTexture(elem.texturePath);
                }
              });

              allClassesInPackage.forEach((clazz) => {
                const isCorrectClass =
                  mesh instanceof ClazzMesh && mesh.dataModel.id === clazz.id;
                if (isCorrectClass) {
                  mesh.changeTexture(elem.texturePath, 2);
                }
              });
            });
          } else if (elem.meshType === EntityType.Clazz) {
            const clazzMesh = currentAppModel?.modelIdToMesh.get(
              elem.clazz?.id as string
            );
            clazzMesh?.changeTexture(elem.texturePath, 2);
          }
          // Apply Slash texture for inserted Meshes
        } else if (elem.action === RestructureAction.CutInsert) {
          if (elem.meshType === EntityType.Package) {
            const appliedTexture = this.findAppliedTexture(
              elem.pckg as Package
            );
            if (!appliedTexture) {
              const allSubPackages = getSubPackagesOfPackage(
                elem.pckg as Package,
                true
              );
              const allClassesInPackage = getClassesInPackage(
                elem.pckg as Package,
                true
              );
              const componentMesh = currentAppModel?.modelIdToMesh.get(
                elem.pckg?.id as string
              );
              componentMesh?.changeTexture(elem.texturePath);
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                allSubPackages.forEach((pckg) => {
                  const isCorrectComponent =
                    mesh instanceof ComponentMesh &&
                    mesh.dataModel.id === pckg.id;
                  if (isCorrectComponent) {
                    mesh.changeTexture(elem.texturePath);
                  }
                });

                allClassesInPackage.forEach((clazz) => {
                  const isCorrectClass =
                    mesh instanceof ClazzMesh && mesh.dataModel.id === clazz.id;
                  if (isCorrectClass) {
                    mesh.changeTexture(elem.texturePath, 2);
                  }
                });
              });
            }
          } else if (elem.meshType === EntityType.Clazz) {
            const appliedTexture = this.findAppliedTexture(elem.clazz as Class);
            if (!appliedTexture) {
              const clazzMesh = currentAppModel?.modelIdToMesh.get(
                elem.clazz?.id as string
              );
              clazzMesh?.changeTexture(elem.texturePath, 2);
            }
          }
        }
      });
    }
  }

  private findAppliedTexture(
    elem: Application | Package | Class,
    action?: RestructureAction
  ): MeshModelTextureMapping | undefined {
    return this.meshModelTextureMappings.find(
      (entry) =>
        (entry.app === elem || entry.pckg === elem || entry.clazz === elem) &&
        (entry.action === RestructureAction.Create || entry.action === action)
    );
  }

  addCollaborativeSubPackage(pckgId: string) {
    const pckg = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      pckgId
    );
    this.addSubPackage(pckg as Package, true);
  }

  addSubPackage(pckg: Package, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.SubPackage,
          RestructureAction.Create,
          null,
          null,
          pckg.id,
          false
        );

      const app = this.getAppFromPackage(pckg);
      if (app) {
        const subPackage = createPackage(
          'newPackage' + this.newMeshCounter,
          'New Package ' + this.newMeshCounter
        );
        const newClass = createClass(
          'newClass' + this.newMeshCounter,
          'New Class ' + this.newMeshCounter
        );
        newClass.parent = subPackage;
        subPackage.parent = pckg;
        subPackage.classes.push(newClass as Class);
        pckg.subPackages.push(subPackage);

        // Create Changelog Entry
        this.changeLog.createPackageEntry(app, subPackage, newClass as Class);

        this.meshModelTextureMappings.push({
          action: RestructureAction.Create,
          meshType: EntityType.Package,
          texturePath: 'images/plus.png',
          app: app as Application,
          pckg: subPackage as Package,
          clazz: newClass as Class,
        });

        this.trigger('showChangeLog');
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
    this.newMeshCounter++;
  }

  addCollaborativePackage(appId: string) {
    const app = getApplicationInLandscapeById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      appId
    );
    this.addPackage(app as Application, true);
  }

  addPackage(app: Application, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Package,
          RestructureAction.Create,
          null,
          null,
          app.id,
          false
        );

      const newPckg = createPackage(
        'newPackage' + this.newMeshCounter,
        'New Package ' + this.newMeshCounter
      );
      const newClass = createClass(
        'newClass' + this.newMeshCounter,
        'New Class ' + this.newMeshCounter
      );
      newClass.parent = newPckg;
      newPckg.classes.push(newClass as Class);
      app.packages.push(newPckg);

      // Create Changelog Entry
      this.changeLog.createPackageEntry(app, newPckg, newClass as Class);

      this.meshModelTextureMappings.push({
        action: RestructureAction.Create,
        meshType: EntityType.Package,
        texturePath: 'images/plus.png',
        app: app as Application,
        pckg: newPckg as Package,
        clazz: newClass as Class,
      });

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addCollaborativeClass(pckgId: string) {
    const pckg = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      pckgId
    );
    this.addClass(pckg as Package, true);
  }

  addClass(pckg: Package, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Clazz,
          RestructureAction.Create,
          null,
          null,
          pckg.id,
          false
        );

      const app = this.getAppFromPackage(pckg);
      if (app) {
        const clazz = createClass(
          'newClass' + this.newMeshCounter,
          'New Class ' + this.newMeshCounter
        );
        clazz.parent = pckg;
        pckg.classes.push(clazz as Class);

        // Create Changelog Entry
        this.changeLog.createClassEntry(app, clazz as Class);

        this.meshModelTextureMappings.push({
          action: RestructureAction.Create,
          meshType: EntityType.Clazz,
          texturePath: 'images/plus.png',
          app: app as Application,
          pckg: clazz.parent as Package,
          clazz: clazz as Class,
        });

        this.trigger('showChangeLog');
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
    this.newMeshCounter++;
  }

  deleteCollaborativeApplication(appId: string, undo: boolean) {
    const app = getApplicationInLandscapeById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      appId
    );
    this.deleteApp(app as Application, true, undo);
  }

  deleteApp(
    app: Application,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.App,
          RestructureAction.Delete,
          null,
          null,
          app.id,
          undo
        );

      let shouldUndo = undo;
      if (
        !shouldUndo &&
        (app.id.includes('newApp') || app.id.includes('duplicated'))
      ) {
        shouldUndo = true;
      }
      // Create wrapper for Communication, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        deletedComms: [],
      };

      if (!shouldUndo) {
        const classesInApplication = getAllClassesInApplication(app);
        removeAffectedCommunications(classesInApplication, wrapper);
        this.processDeletedAppData(app);

        // Updating deleted communications

        this.completelyDeletedClassCommunications.set(
          app.id,
          wrapper.deletedComms
        );
      } else {
        removeApplication(this.landscapeData.structureLandscapeData, app);

        // Removes the duplicate texture and comms
        if (app.id.includes('duplicated')) this.undoDuplicateApp(app);

        // Removes existing Changelog entry
        this.changeLog.deleteAppEntry(app, true);

        // Remove all meshes of the application
        const appObject3D: ApplicationObject3D | undefined =
          this.applicationRenderer.getApplicationById(app.id);
        if (appObject3D) {
          appObject3D.removeAllEntities();
          appObject3D.removeAllCommunication();
        }
      }

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  private processDeletedAppData(app: Application) {
    // Create Changelog Entry
    this.changeLog.deleteAppEntry(app);

    // Store all datamodels that are deleted
    this.storeDeletedAppData(app);

    this.meshModelTextureMappings.push({
      action: RestructureAction.Delete,
      meshType: EntityType.App,
      texturePath: 'images/minus.png',
      app: app,
    });
  }

  deleteCollaborativePackage(pckgId: string, undo: boolean) {
    const pckg = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      pckgId
    );
    this.deletePackage(pckg as Package, true, undo);
  }

  deletePackage(
    pckg: Package,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Package,
          RestructureAction.Delete,
          null,
          null,
          pckg.id,
          undo
        );

      const app = this.getApp(pckg) as Application;

      let shouldUndo = undo;

      if (
        (!shouldUndo && pckg.id.includes('newPackage')) ||
        pckg.id.includes('copied')
      ) {
        shouldUndo = true;
      }

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        deletedComms: [],
      };

      if (!shouldUndo) {
        const classesInPackge = getClassesInPackage(pckg);
        removeAffectedCommunications(classesInPackge, wrapper);

        this.completelyDeletedClassCommunications.set(
          pckg.id,
          wrapper.deletedComms
        );

        // Create Changelog Entry
        if (app && pckg.parent) {
          this.changeLog.deleteSubPackageEntry(app, pckg);
        } else if (app && !pckg.parent) {
          this.changeLog.deletePackageEntry(app, pckg);
        }

        this.storeDeletedPackageData(pckg);

        this.meshModelTextureMappings.push({
          action: RestructureAction.Delete,
          meshType: EntityType.Package,
          texturePath: 'images/minus.png',
          app: app as Application,
          pckg: pckg,
        });
      } else {
        if (!canDeletePackage(pckg, app as Application)) {
          AlertifyHandler.showAlertifyError('Package cannot be removed');
          return;
        }
        removePackageFromApplication(pckg, app as Application);

        // Only necessary, when we delete a copy
        if (pckg.id.includes('copied')) this.undoCopyPackage(app, pckg);

        // Removes existing Changelog Entry
        if (pckg.parent) {
          this.changeLog.deleteSubPackageEntry(app as Application, pckg, true);
        } else {
          this.changeLog.deletePackageEntry(app as Application, pckg, true);
        }
      }

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  /**
   * Stores all data models associated with a deleted application. These data models are added to the `deletedDataModels` array
   * for potential future restoration.
   *
   * @param app The application that has been deleted.
   */
  private storeDeletedAppData(app: Application) {
    const allPackages = getAllPackagesInApplication(app);
    const allClasses = getAllClassesInApplication(app);
    this.deletedDataModels.pushObject(app);
    allPackages.forEach((pckg) => {
      this.deletedDataModels.pushObject(pckg);
    });
    allClasses.forEach((clazz) => {
      this.deletedDataModels.pushObject(clazz);
    });
  }

  /**
   * Restores the data models of a deleted application. It searches the `deletedDataModels`
   * array for the application, its associated packages, and classes, and then removes them from the
   * `deletedDataModels` array, effectively restoring them to their inital state.
   *
   * @param app The application that is going to be restored.
   */
  private restoreDeletedAppData(app: Application) {
    this.deletedDataModels.removeObject(app);
    const allPackages = getAllPackagesInApplication(app);
    const allClasses = getAllClassesInApplication(app);
    allPackages.forEach((pckg) => {
      this.deletedDataModels.removeObject(pckg);
    });
    allClasses.forEach((clazz) => {
      this.deletedDataModels.removeObject(clazz);
    });
  }

  /**
   * Stores all data models associated with a deleted package. These data models are added to the `deletedDataModels`
   * array for potential future restoration.
   *
   * @param pckg The package that has been deleted or is intended to be deleted.
   */
  private storeDeletedPackageData(pckg: Package) {
    const allPackages = getSubPackagesOfPackage(pckg, true);
    const allClasses = getClassesInPackage(pckg, true);
    this.deletedDataModels.pushObject(pckg);
    allPackages.forEach((pckg) => {
      this.deletedDataModels.pushObject(pckg);
    });
    allClasses.forEach((clazz) => {
      this.deletedDataModels.pushObject(clazz);
    });
  }

  /**
   * Restores the data models of a deleted package. It searches the `deletedDataModels`
   * array for the package, its associated subpackages, and classes, and then removes them from the
   * `deletedDataModels` array, effectively restoring them to their inital state.
   *
   * @param pckg The package that is going to be restored.
   */
  private restoreDeletedPackageData(pckg: Package) {
    this.deletedDataModels.removeObject(pckg);
    const allPackages = getSubPackagesOfPackage(pckg, true);
    const allClasses = getClassesInPackage(pckg, true);
    allPackages.forEach((pckg) => {
      this.deletedDataModels.removeObject(pckg);
    });
    allClasses.forEach((clazz) => {
      this.deletedDataModels.removeObject(clazz);
    });
  }

  deleteCollaborativeClass(clazzId: string, undo: boolean) {
    const clazz = getClassById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      clazzId
    );
    this.deleteClass(clazz as Class, true, undo);
  }

  deleteClass(
    clazz: Class,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Clazz,
          RestructureAction.Delete,
          null,
          null,
          clazz.id,
          undo
        );

      const application = getApplicationFromClass(
        this.landscapeData.structureLandscapeData,
        clazz
      );

      let shouldUndo = undo;

      if (
        !shouldUndo &&
        (clazz.id.includes('newClass') || clazz.id.includes('copied'))
      ) {
        shouldUndo = true;
      }

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        deletedComms: [],
      };

      if (!shouldUndo) {
        removeAffectedCommunications([clazz], wrapper);

        this.completelyDeletedClassCommunications.set(
          clazz.id,
          wrapper.deletedComms
        );

        this.meshModelTextureMappings.push({
          action: RestructureAction.Delete,
          meshType: EntityType.Clazz,
          texturePath: 'images/minus.png',
          app: application as Application,
          clazz: clazz,
        });

        // Create Changelog Entry
        this.changeLog.deleteClassEntry(application as Application, clazz);

        this.deletedDataModels.pushObject(clazz);
      } else {
        if (!canDeleteClass(clazz)) {
          AlertifyHandler.showAlertifyError('Class cannot be removed');
          return;
        }

        removeClassFromPackage(clazz);

        if (clazz.id.includes('copied'))
          this.undoCopyClass(application as Application, clazz);

        // Removing existing Create Entry
        this.changeLog.deleteClassEntry(
          application as Application,
          clazz,
          true
        );
      }

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  cutPackage(pckg: Package) {
    this.clipboard = pckg.name;
    this.clippedMesh = pckg;
  }

  cutClass(clazz: Class) {
    this.clipboard = clazz.name;
    this.clippedMesh = clazz;
  }

  resetClipboard() {
    this.clipboard = '';
    this.clippedMesh = null;
  }

  pasteCollaborativePackage(
    destinationEntity: string,
    destinationId: string,
    clippedEntityId: string
  ) {
    this.clippedMesh = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      clippedEntityId
    ) as Package;

    if (destinationEntity === 'APP') {
      const app = getApplicationInLandscapeById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        destinationId
      );
      this.pastePackage(app as Application, true);
    } else {
      const pckg = getPackageById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        destinationId
      );
      this.pastePackage(pckg as Package, true);
    }
  }

  pasteCollaborativeClass(destinationId: string, clippedEntityId: string) {
    this.clippedMesh = getClassById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      clippedEntityId
    ) as Class;

    const pckg = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      destinationId
    );
    this.pasteClass(pckg as Package, true);
  }

  insertCollaborativePackagerOrClass(
    destinationEntity: string,
    destinationId: string,
    clippedEntity: string,
    clippedEntityId: string
  ) {
    if (clippedEntity === 'PACKAGE') {
      this.clippedMesh = getPackageById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        clippedEntityId
      ) as Package;
    } else {
      this.clippedMesh = getClassById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        clippedEntityId
      ) as Class;
    }

    if (destinationEntity === 'APP') {
      const app = getApplicationInLandscapeById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        destinationId
      );
      this.movePackageOrClass(app as Application, true);
    } else {
      const pckg = getPackageById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        destinationId
      );
      this.movePackageOrClass(pckg as Package, true);
    }
  }

  getApp(appChild: Package | Class): Application | undefined {
    const landscapeData = this.landscapeData
      ?.structureLandscapeData as StructureLandscapeData;
    if (isPackage(appChild)) {
      if (appChild.parent)
        return getApplicationFromSubPackage(landscapeData, appChild.id);
      else return getApplicationFromPackage(landscapeData, appChild.id);
    }

    if (isClass(appChild))
      return getApplicationFromClass(landscapeData, appChild);

    return undefined;
  }

  pastePackage(
    destination: Application | Package,
    collabMode: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode) {
        if (isApplication(destination)) {
          this.sender.sendRestructureCopyAndPastePackageMessage(
            EntityType.App,
            destination.id,
            this.clippedMesh?.id as string
          );
        } else if (isPackage(destination)) {
          this.sender.sendRestructureCopyAndPastePackageMessage(
            EntityType.Package,
            destination.id,
            this.clippedMesh?.id as string
          );
        }
      }
      const app = this.getApp(this.clippedMesh as Package) as Application;

      const copiedClassCommunications: AggregatedClassCommunication[] = [];

      const wrapper = {
        idCounter: this.newMeshCounter,
        comms: this.allClassCommunications,
        copiedComms: copiedClassCommunications,
      };

      // Copy the clipped package
      const copiedPackage = copyPackageContent(this.clippedMesh as Package);
      if (isPackage(destination)) copiedPackage.parent = destination;

      const meshTextureMapping: Partial<MeshModelTextureMapping> = {
        action: RestructureAction.CopyPaste,
        texturePath: 'images/x.png',
        meshType: EntityType.Package,
        pckg: copiedPackage,
      };

      pastePackage(
        this.landscapeData.structureLandscapeData,
        copiedPackage,
        destination,
        wrapper
      );

      changeID({ entity: copiedPackage }, 'copied' + this.newMeshCounter + '|');

      this.newMeshCounter++;

      if (this.clippedMesh?.parent) {
        this.changeLog.copySubPackageEntry(
          app,
          copiedPackage,
          destination,
          this.clippedMesh as Package,
          this.landscapeData.structureLandscapeData
        );
      } else {
        this.changeLog.copyPackageEntry(
          app,
          copiedPackage,
          destination,
          this.clippedMesh as Package,
          this.landscapeData.structureLandscapeData
        );
      }

      if (isApplication(destination)) {
        meshTextureMapping.app = destination;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      } else if (isPackage(destination)) {
        const destinationApp = this.getApp(destination);
        meshTextureMapping.app = destinationApp;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      }

      const key = 'COPIED|' + copiedPackage.id;

      this.copiedClassCommunications.set(key, wrapper.copiedComms);

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  pasteClass(destination: Package, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode) {
        this.sender.sendRestructureCopyAndPasteClassMessage(
          destination.id,
          this.clippedMesh?.id as string
        );
      }
      const app = this.getApp(this.clippedMesh as Class) as Application;

      const copiedClassCommunications: AggregatedClassCommunication[] = [];

      const wrapper = {
        idCounter: this.newMeshCounter,
        comms: this.allClassCommunications,
        copiedComms: copiedClassCommunications,
      };

      // Copy the clipped class
      const copiedClass = copyClassContent(this.clippedMesh as Class);
      copiedClass.parent = destination;

      const meshTextureMapping: Partial<MeshModelTextureMapping> = {
        action: RestructureAction.CopyPaste,
        texturePath: 'images/x.png',
        meshType: EntityType.Clazz,
        clazz: copiedClass,
      };

      pasteClass(
        this.landscapeData.structureLandscapeData,
        copiedClass,
        destination,
        wrapper
      );

      changeID({ entity: copiedClass }, 'copied' + this.newMeshCounter + '|');

      this.newMeshCounter++;

      this.changeLog.copyClassEntry(
        app,
        copiedClass,
        destination,
        this.clippedMesh as Class,
        this.landscapeData.structureLandscapeData
      );

      const destinationApp = this.getApp(destination);
      meshTextureMapping.app = destinationApp;
      this.meshModelTextureMappings.push(
        meshTextureMapping as MeshModelTextureMapping
      );

      const key = 'COPIED|' + copiedClass.id;

      this.copiedClassCommunications.set(key, wrapper.copiedComms);

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  movePackageOrClass(
    destination: Application | Package,
    collabMode: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode) {
        this.sendCutInsertMessage(destination);
      }

      const app = this.getApp(this.clippedMesh as Package | Class);

      const updatedClassCommunications: AggregatedClassCommunication[] = [];

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        meshTodelete: this.clippedMesh as Package,
        updatedComms: updatedClassCommunications,
      };

      const meshTextureMapping: Partial<MeshModelTextureMapping> = {
        action: RestructureAction.CutInsert,
        texturePath: 'images/slash.png',
      };

      // Distinguish between clipped Package and clipped Class
      if (isPackage(this.clippedMesh)) {
        // Copy the clipped package
        const cuttedPackage = copyPackageContent(this.clippedMesh);
        cuttedPackage.parent = this.clippedMesh.parent;

        // Set the texture to correct mesh
        meshTextureMapping.meshType = EntityType.Package;
        meshTextureMapping.pckg = cuttedPackage;

        movePackage(
          this.landscapeData.structureLandscapeData,
          cuttedPackage,
          destination,
          wrapper
        );

        // Create Changelog Entry
        if (this.clippedMesh.parent && app) {
          this.changeLog.moveSubPackageEntry(
            app,
            cuttedPackage,
            destination,
            wrapper.meshTodelete,
            this.landscapeData.structureLandscapeData
          );
        } else if (!this.clippedMesh.parent && app) {
          this.changeLog.movePackageEntry(
            app,
            cuttedPackage,
            destination,
            wrapper.meshTodelete,
            this.landscapeData.structureLandscapeData
          );
        }

        changeID({ entity: this.clippedMesh }, 'removed|');

        this.meshModelTextureMappings.push({
          action: RestructureAction.Delete,
          meshType: EntityType.Package,
          texturePath: 'images/minus.png',
          app: app as Application,
          pckg: this.clippedMesh,
        });
        this.storeDeletedPackageData(this.clippedMesh);
      } else if (isClass(this.clippedMesh) && app) {
        // Copy the clipped class
        const cuttedClass = copyClassContent(this.clippedMesh);
        cuttedClass.parent = this.clippedMesh.parent;

        // Set the texture to correct mesh
        meshTextureMapping.meshType = EntityType.Clazz;
        meshTextureMapping.clazz = cuttedClass;

        moveClass(
          this.landscapeData.structureLandscapeData,
          cuttedClass,
          destination as Package,
          wrapper
        );

        // Create Changelog Entry
        this.changeLog.moveClassEntry(
          app,
          cuttedClass,
          destination as Package,
          this.clippedMesh,
          this.landscapeData.structureLandscapeData
        );

        changeID({ entity: this.clippedMesh }, 'removed|');

        this.meshModelTextureMappings.push({
          action: RestructureAction.Delete,
          meshType: EntityType.Clazz,
          texturePath: 'images/minus.png',
          app: app as Application,
          pckg: this.clippedMesh.parent,
          clazz: this.clippedMesh,
        });

        this.deletedDataModels.pushObject(this.clippedMesh);
      }

      // const key = this.changeLog.changeLogEntries.lastObject?.id;
      const key = 'CUTINSERT|' + this.clippedMesh?.id;

      this.updatedClassCommunications.set(key, wrapper.updatedComms);

      this.resetClipboard();

      if (isApplication(destination)) {
        meshTextureMapping.app = destination;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      } else if (isPackage(destination)) {
        const destinationApp = this.getApp(destination);
        meshTextureMapping.app = destinationApp;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      }

      this.trigger('showChangeLog');
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  undoBundledEntries(bundledCreateEntries: BaseChangeLogEntry[]) {
    const entry = bundledCreateEntries.firstObject;
    if (entry instanceof AppChangeLogEntry) {
      const { app } = entry;

      this.deleteApp(app as Application, false, true);
    } else if (
      entry instanceof PackageChangeLogEntry ||
      entry instanceof SubPackageChangeLogEntry
    ) {
      const { pckg } = entry;

      this.deletePackage(pckg as Package, false, true);
    }
    this.changeLog.removeEntries(bundledCreateEntries);
  }

  undoEntry(entry: BaseChangeLogEntry) {
    if (entry.action === RestructureAction.Create) {
      if (entry instanceof AppChangeLogEntry) {
        const { app } = entry;
        this.deleteApp(app as Application, false, true);
      } else if (entry instanceof ClassChangeLogEntry) {
        const { clazz } = entry;
        this.deleteClass(clazz as Class, false, true);
      } else if (
        entry instanceof PackageChangeLogEntry ||
        entry instanceof SubPackageChangeLogEntry
      ) {
        const { pckg } = entry;
        this.deletePackage(pckg as Package, false, true);
      } else if (entry instanceof CommunicationChangeLogEntry) {
        const { communication } = entry;
        this.deleteCommunication(
          communication as AggregatedClassCommunication,
          true
        );
      }
    }

    if (entry.action === RestructureAction.Rename) {
      if (entry instanceof AppChangeLogEntry) {
        const { app, originalAppName } = entry;
        this.renameApplication(
          originalAppName as string,
          app?.id as string,
          false,
          true
        );
      } else if (entry instanceof PackageChangeLogEntry) {
        const { pckg, originalPckgName } = entry;
        this.renamePackage(
          originalPckgName as string,
          pckg?.id as string,
          false,
          true
        );
      } else if (entry instanceof SubPackageChangeLogEntry) {
        const { pckg, originalPckgName } = entry;
        this.renameSubPackage(
          originalPckgName as string,
          pckg?.id as string,
          false,
          true
        );
      } else if (entry instanceof ClassChangeLogEntry) {
        const { app, clazz, originalClazzName } = entry;
        this.renameClass(
          originalClazzName as string,
          clazz?.id as string,
          app?.id as string,
          false,
          true
        );
      } else if (entry instanceof CommunicationChangeLogEntry) {
        const { communication, originalOperationName } = entry;
        this.renameOperation(
          communication as AggregatedClassCommunication,
          originalOperationName as string,
          false,
          true
        );
      }
    }

    if (entry.action === RestructureAction.Delete) {
      if (entry instanceof AppChangeLogEntry) {
        const { app } = entry;
        this.changeLog.restoreDeletedEntries(app?.id as string);
        this.restoreApplication(app as Application);
        return;
      } else if (
        entry instanceof PackageChangeLogEntry ||
        entry instanceof SubPackageChangeLogEntry
      ) {
        const { pckg } = entry;
        this.changeLog.restoreDeletedEntries(pckg.id as string);
        this.restorePackage(pckg as Package);
      } else if (entry instanceof ClassChangeLogEntry) {
        const { app, clazz } = entry;
        this.changeLog.restoreDeletedEntries(clazz.id as string);
        this.restoreClass(app as Application, clazz as Class);
      } else if (entry instanceof CommunicationChangeLogEntry) {
        const { communication } = entry;
        this.changeLog.restoreDeletedEntries(communication.id as string);
        this.deleteCommunication(
          communication as AggregatedClassCommunication,
          true
        );
      }

      this.changeLog.removeEntry(entry);
    }

    if (entry.action === RestructureAction.CopyPaste) {
      if (entry instanceof AppChangeLogEntry) {
        const { app } = entry;
        this.deleteApp(app as Application, false, true);
      } else if (
        entry instanceof PackageChangeLogEntry ||
        entry instanceof SubPackageChangeLogEntry
      ) {
        const { pckg } = entry;

        this.deletePackage(pckg as Package, false, true);
      } else if (entry instanceof ClassChangeLogEntry) {
        const { clazz } = entry;
        this.deleteClass(clazz, false, true);
      }
    }

    if (entry.action === RestructureAction.CutInsert) {
      if (
        entry instanceof PackageChangeLogEntry ||
        entry instanceof SubPackageChangeLogEntry
      ) {
        const { original, pckg } = entry;
        this.deletePackage(pckg as Package, false, true);
        if (isApplication(original)) {
          this.restoreApplication(original, true);
        } else if (isPackage(original)) {
          this.restorePackage(original, true);
        }
        //this.removeInsertTexture(pckg as Package);
      } else if (entry instanceof ClassChangeLogEntry) {
        const { original, clazz } = entry;

        // TODO Not working correctly if we created communications. Need to update the affected and created communication (set the source/target class back)
        this.deleteClass(clazz as Class, false, true);
        if (isApplication(original)) {
          this.restoreApplication(original, true);
        } else if (isPackage(original)) {
          this.restorePackage(original, true);
        } else if (isClass(original)) {
          const originApp = getApplicationFromClass(
            this.landscapeData
              ?.structureLandscapeData as StructureLandscapeData,
            original
          );
          this.restoreClass(originApp as Application, original as Class, true);
        }
      }
    }

    this.changeLog.removeEntry(entry);
    this.trigger('showChangeLog');
  }

  removeMeshModelTextureMapping(
    action: RestructureAction,
    entityType: EntityType,
    app: Application,
    pckg?: Package,
    clazz?: Class
  ) {
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === action &&
        mapping.meshType === entityType &&
        mapping.app.id === app.id &&
        mapping.pckg?.id === pckg?.id &&
        mapping.clazz?.id === clazz?.id
    );

    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );
  }

  private sendCutInsertMessage(destination: Application | Package) {
    if (isApplication(destination)) {
      if (isPackage(this.clippedMesh))
        this.sender.sendRestructureCutAndInsertMessage(
          EntityType.App,
          destination.id,
          EntityType.Package,
          this.clippedMesh?.id as string
        );
      else
        this.sender.sendRestructureCutAndInsertMessage(
          EntityType.App,
          destination.id,
          EntityType.Clazz,
          this.clippedMesh?.id as string
        );
    } else {
      if (isPackage(this.clippedMesh))
        this.sender.sendRestructureCutAndInsertMessage(
          EntityType.Package,
          destination.id,
          EntityType.Package,
          this.clippedMesh?.id as string
        );
      else
        this.sender.sendRestructureCutAndInsertMessage(
          EntityType.Package,
          destination.id,
          EntityType.Clazz,
          this.clippedMesh?.id as string
        );
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-restructure': LandscapeRestructure;
  }
}
