import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import {
  addFoundationToLandscape,
  addMethodToClass,
  cutAndInsertPackage,
  cutAndInsertClass,
  removeApplication,
  removeClassFromPackage,
  removePackageFromApplication,
  setClassName,
  createPackage,
  createClass,
  changeID,
  copyPackageContent,
  copyClassContent,
  restoreID,
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
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
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
import {
  getClassById,
  getClassMethodByName,
} from 'explorviz-frontend/utils/class-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import {
  MeshAction,
  EntityType,
} from 'explorviz-frontend/utils/change-log-entry';
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

type MeshModelTextureMapping = {
  action: MeshAction;
  meshType: EntityType;
  texturePath: string;
  originApp: Application;
  pckg?: Package;
  clazz?: Class;
};

type CommModelColorMapping = {
  action: MeshAction;
  comm: DrawableClassCommunication;
  color: THREE.Color;
};

type diverseDataModel = Application | Package | Class;

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('changelog')
  changeLog!: Changelog;

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

  // TODO replace all occurrences with commModelColorMappings.comm and delete this one
  /**
   * Storing all communications created by user
   */
  @tracked
  createdClassCommunication: DrawableClassCommunication[] = [];

  /**
   * Storing all communications in the landscape
   */
  @tracked
  allClassCommunications: DrawableClassCommunication[] = [];

  /**
   * Storing all communications that have been updated
   */
  @tracked
  updatedClassCommunications: DrawableClassCommunication[][] = [];

  @tracked
  deletedClassCommunications: DrawableClassCommunication[][] = [];

  @tracked
  sourceClass: Class | null = null;

  @tracked
  targetClass: Class | null = null;

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

  createCollaborativeCommunication(
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
    this.createCommunication(methodName, true);
  }

  createCommunication(methodName: string, collabMode: boolean = false) {
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

      // Create Communication between 2 Classes
      const classCommunication: DrawableClassCommunication = {
        id: this.sourceClass.name + ' => ' + this.targetClass.name,
        totalRequests: 1,
        sourceClass: this.sourceClass,
        targetClass: this.targetClass,
        operationName: methodName,
        sourceApp: sourceApp,
        targetApp: targetApp,
      };

      // Create the Changelog Entry
      this.changeLog.communicationEntry(classCommunication);

      this.createdClassCommunication.push(classCommunication);

      this.commModelColorMappings.push({
        action: MeshAction.Communication,
        comm: classCommunication,
        color: new THREE.Color(0xff00a6),
      });

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  @action
  deleteCommunication(
    _comm: DrawableClassCommunication | undefined, // Later for deleting existing comms
    undo: boolean = false,
    collabMode: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureDeleteCommunicationMessage(undo);
    }
    if (undo) {
      this.createdClassCommunication.pop();
    }
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

  updateApplicationName(
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
            action: MeshAction.Rename,
            meshType: EntityType.App,
            texturePath: 'images/hashtag.png',
            originApp: app as Application,
          });
        } else {
          const undoMapping = this.meshModelTextureMappings.find(
            (mapping) =>
              mapping.action === MeshAction.Rename &&
              mapping.meshType === EntityType.App &&
              mapping.originApp === app
          );
          this.meshModelTextureMappings.removeObject(
            undoMapping as MeshModelTextureMapping
          );
        }

        // Set new Application name
        app.name = name;

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  updatePackageName(
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
            action: MeshAction.Rename,
            meshType: EntityType.Package,
            texturePath: 'images/hashtag.png',
            originApp: app as Application,
            pckg: pckg,
          });
        } else {
          const undoMapping = this.meshModelTextureMappings.find(
            (mapping) =>
              mapping.action === MeshAction.Rename &&
              mapping.meshType === EntityType.Package &&
              mapping.originApp === app &&
              mapping.pckg === pckg
          );

          this.meshModelTextureMappings.removeObject(
            undoMapping as MeshModelTextureMapping
          );
        }

        // Set new Package name
        pckg.name = name;

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  updateSubPackageName(
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
            action: MeshAction.Rename,
            meshType: EntityType.Package,
            texturePath: 'images/hashtag.png',
            originApp: app as Application,
            pckg: pckg,
          });
        } else {
          const undoMapping = this.meshModelTextureMappings.find(
            (mapping) =>
              mapping.action === MeshAction.Rename &&
              mapping.meshType === EntityType.Package &&
              mapping.originApp === app &&
              mapping.pckg === pckg
          );
          this.meshModelTextureMappings.removeObject(
            undoMapping as MeshModelTextureMapping
          );
        }

        // Set new Package name
        pckg.name = name;

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

  updateClassName(
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
        const clazzToRename = setClassName(application, id);

        if (clazzToRename) {
          if (!undo) {
            // Create Changelog Entry
            this.changeLog.renameClassEntry(application, clazzToRename, name);

            this.meshModelTextureMappings.push({
              action: MeshAction.Rename,
              meshType: EntityType.Clazz,
              texturePath: 'images/hashtag.png',
              originApp: application as Application,
              clazz: clazzToRename,
            });
          } else {
            const undoMapping = this.meshModelTextureMappings.find(
              (mapping) =>
                mapping.action === MeshAction.Rename &&
                mapping.meshType === EntityType.Clazz &&
                mapping.originApp === application &&
                mapping.clazz === clazzToRename
            );
            this.meshModelTextureMappings.removeObject(
              undoMapping as MeshModelTextureMapping
            );
          }

          // Set new Class name
          clazzToRename.name = name;

          this.trigger(
            'restructureLandscapeData',
            this.landscapeData.structureLandscapeData,
            this.landscapeData.dynamicLandscapeData
          );
        }
      }
    }
  }

  updateOperationName(
    clazz: Class,
    originalName: string,
    newName: string,
    collabMode: boolean = false
  ) {
    if (!collabMode) {
      this.sender.sendRestructureRenameOperationMessage(
        clazz.id,
        originalName,
        newName
      );
    }

    const opt = getClassMethodByName(clazz, originalName);

    //User created Comms are not found with getClassMethodByName
    const newCommunication = this.createdClassCommunication.find(
      (comm) => comm.targetClass === clazz && comm.operationName === opt?.name
    );

    if (newCommunication) {
      newCommunication.operationName = newName;
    }

    if (opt) opt.name = newName;

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
        mapping.action === MeshAction.Delete &&
        mapping.meshType === EntityType.App &&
        mapping.originApp === app
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );
    if (undoCutOperation) {
      this.updatedClassCommunications.pop();
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
      this.deletedClassCommunications.pop();
    }
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
        mapping.action === MeshAction.Delete &&
        mapping.meshType === EntityType.Package &&
        mapping.pckg === pckg
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );

    // Cut or Undo Operation? In case of Cut we also need to restore the communications!
    if (undoCutOperation) {
      this.updatedClassCommunications.pop();
      const app = this.getApp(pckg);
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
      restoreID({ entity: pckg }, 'removed|');
      this.removeMeshModelTextureMapping(
        MeshAction.CutInsert,
        EntityType.Package,
        app as Application,
        pckg
      );
    } else {
      this.deletedClassCommunications.pop();
    }

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
        mapping.action === MeshAction.Delete &&
        mapping.meshType === EntityType.Clazz &&
        mapping.originApp === app &&
        mapping.clazz === clazz
    );
    this.meshModelTextureMappings.removeObject(
      undoMapping as MeshModelTextureMapping
    );
    if (undoCutOperation) {
      this.updatedClassCommunications.pop();

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
        MeshAction.CutInsert,
        EntityType.Clazz,
        app,
        clazz.parent,
        clazz
      );
    } else {
      this.deletedClassCommunications.pop();
    }
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
      MeshAction.CutInsert,
      EntityType.Package,
      app,
      element
    );
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
          MeshAction.Create,
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
        action: MeshAction.Create,
        meshType: EntityType.App,
        texturePath: 'images/plus.png',
        originApp: app as Application,
        pckg: pckg as Package,
        clazz: clazz as Class,
      });

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
        // Distinguish between internal comms and external comms
        if (elem.comm.sourceApp === elem.comm.targetApp) {
          const appModel = this.applicationRenderer.getApplicationById(
            elem.comm.sourceApp?.id as string
          );
          const commMesh = appModel?.commIdToMesh.get(elem.comm.id);

          commMesh?.changeColor(elem.color);
        } else {
          const commMesh = this.linkRenderer.getLinkById(elem.comm.id);
          commMesh?.changeColor(elem.color);
        }
      });
    }
  }

  applyTextureMappings() {
    if (this.restructureMode) {
      this.meshModelTextureMappings.forEach((elem) => {
        const currentAppModel = this.applicationRenderer.getApplicationById(
          elem.originApp?.id as string
        );
        // Apply Plus texture for new created Meshes
        if (elem.action === MeshAction.Create) {
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
        } else if (elem.action === MeshAction.Delete) {
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
        } else if (elem.action === MeshAction.Rename) {
          if (elem.meshType === EntityType.App) {
            const appliedTexture = this.findAppliedTexture(elem.originApp);
            if (!appliedTexture) {
              const foundationMesh = currentAppModel?.modelIdToMesh.get(
                elem.originApp.id
              );
              foundationMesh?.changeTexture(elem.texturePath);
            }
          } else if (elem.meshType === EntityType.Package) {
            const appliedTexture = this.findAppliedTexture(
              elem.pckg as Package
            );

            if (!appliedTexture) {
              const componentMesh = currentAppModel?.modelIdToMesh.get(
                elem.pckg?.id as string
              );
              componentMesh?.changeTexture(elem.texturePath);
            }
          } else if (elem.meshType === EntityType.Clazz) {
            const appliedTexture = this.findAppliedTexture(elem.clazz as Class);
            if (!appliedTexture) {
              const clazzMesh = currentAppModel?.modelIdToMesh.get(
                elem.clazz?.id as string
              );
              clazzMesh?.changeTexture(elem.texturePath, 1);
            }
          }
          // Apply Slash texture for inserted Meshes
        } else if (elem.action === MeshAction.CutInsert) {
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
    elem: Application | Package | Class
  ): MeshModelTextureMapping | undefined {
    return this.meshModelTextureMappings.find(
      (entry) =>
        (entry.originApp === elem ||
          entry.pckg === elem ||
          entry.clazz === elem) &&
        entry.action === MeshAction.Create
    );
  }

  addCollaborativeSubPackage(pckgId: string) {
    const pckg = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      pckgId
    );
    this.addSubPackageFromPopup(pckg as Package, true);
  }

  addSubPackageFromPopup(pckg: Package, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.SubPackage,
          MeshAction.Create,
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
          action: MeshAction.Create,
          meshType: EntityType.Package,
          texturePath: 'images/plus.png',
          originApp: app as Application,
          pckg: subPackage as Package,
          clazz: newClass as Class,
        });

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
    this.addPackageFromPopup(app as Application, true);
  }

  addPackageFromPopup(app: Application, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Package,
          MeshAction.Create,
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
        action: MeshAction.Create,
        meshType: EntityType.Package,
        texturePath: 'images/plus.png',
        originApp: app as Application,
        pckg: newPckg as Package,
        clazz: newClass as Class,
      });

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
    this.addClassFromPopup(pckg as Package, true);
  }

  addClassFromPopup(pckg: Package, collabMode: boolean = false) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Clazz,
          MeshAction.Create,
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
          action: MeshAction.Create,
          meshType: EntityType.Clazz,
          texturePath: 'images/plus.png',
          originApp: app as Application,
          pckg: clazz.parent as Package,
          clazz: clazz as Class,
        });

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
    this.deleteAppFromPopup(app as Application, true, undo);
  }

  deleteAppFromPopup(
    app: Application,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.App,
          MeshAction.Delete,
          null,
          null,
          app.id,
          undo
        );

      let shouldUndo = undo;
      if (!shouldUndo && app.id.includes('newApp')) {
        shouldUndo = true;
      }
      // Create wrapper for Communication, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        deletedComms: [],
      };

      removeApplication(
        this.landscapeData?.structureLandscapeData,
        wrapper,
        app,
        shouldUndo
      );

      if (!shouldUndo) {
        this.processDeletedAppData(app);

        // Updating deleted communications
        this.deletedClassCommunications.push(wrapper.deletedComms);
      } else {
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
      action: MeshAction.Delete,
      meshType: EntityType.App,
      texturePath: 'images/minus.png',
      originApp: app,
    });
  }

  deleteCollaborativePackage(pckgId: string, undo: boolean) {
    const pckg = getPackageById(
      this.landscapeData?.structureLandscapeData as StructureLandscapeData,
      pckgId
    );
    this.deletePackageFromPopup(pckg as Package, true, undo);
  }

  deletePackageFromPopup(
    pckg: Package,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Package,
          MeshAction.Delete,
          null,
          null,
          pckg.id,
          undo
        );

      let shouldUndo = undo;

      if (!shouldUndo && pckg.id.includes('newPackage')) {
        shouldUndo = true;
      }

      const app = this.getApp(pckg);

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        meshTodelete: pckg,
        deletedComms: [],
      };

      removePackageFromApplication(
        this.landscapeData.structureLandscapeData,
        wrapper,
        pckg,
        shouldUndo
      );

      if (!shouldUndo) {
        this.deletedClassCommunications.push(wrapper.deletedComms);
        // Create Changelog Entry
        if (app && pckg.parent) {
          this.changeLog.deleteSubPackageEntry(app, pckg);
        } else if (app && !pckg.parent) {
          this.changeLog.deletePackageEntry(app, pckg);
        }

        this.storeDeletedPackageData(pckg);

        this.meshModelTextureMappings.push({
          action: MeshAction.Delete,
          meshType: EntityType.Package,
          texturePath: 'images/minus.png',
          originApp: app as Application,
          pckg: pckg,
        });
      } else {
        if (isApplication(wrapper.meshTodelete)) {
          // Removes existing Changelog Entry
          this.changeLog.deleteAppEntry(wrapper.meshTodelete, true);
        } else if (isPackage(wrapper.meshTodelete)) {
          // Removes existing Changelog Entry
          if (app && wrapper.meshTodelete.parent) {
            this.changeLog.deleteSubPackageEntry(
              app,
              wrapper.meshTodelete,
              true
            );
          } else if (app && !wrapper.meshTodelete.parent) {
            this.changeLog.deletePackageEntry(app, wrapper.meshTodelete, true);
          }
        }
      }

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
    this.deletedDataModels.push(app);
    allPackages.forEach((pckg) => {
      this.deletedDataModels.push(pckg);
    });
    allClasses.forEach((clazz) => {
      this.deletedDataModels.push(clazz);
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
    this.deletedDataModels.push(pckg);
    allPackages.forEach((pckg) => {
      this.deletedDataModels.push(pckg);
    });
    allClasses.forEach((clazz) => {
      this.deletedDataModels.push(clazz);
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
    this.deleteClassFromPopup(clazz as Class, true, undo);
  }

  deleteClassFromPopup(
    clazz: Class,
    collabMode: boolean = false,
    undo: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode)
        this.sender.sendRestructureCreateOrDeleteMessage(
          EntityType.Clazz,
          MeshAction.Delete,
          null,
          null,
          clazz.id,
          undo
        );

      let shouldUndo = undo;

      if (!shouldUndo && clazz.id.includes('newClass')) {
        shouldUndo = true;
      }

      const application = getApplicationFromClass(
        this.landscapeData.structureLandscapeData,
        clazz
      );

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        meshTodelete: clazz,
        deletedComms: [],
      };

      removeClassFromPackage(wrapper, clazz, shouldUndo);

      if (!shouldUndo) {
        this.deletedClassCommunications.push(wrapper.deletedComms);
        this.meshModelTextureMappings.push({
          action: MeshAction.Delete,
          meshType: EntityType.Clazz,
          texturePath: 'images/minus.png',
          originApp: application as Application,
          clazz: clazz,
        });

        // Create Changelog Entry
        this.changeLog.deleteClassEntry(application as Application, clazz);

        this.deletedDataModels.push(clazz);
      } else {
        // Removing existing Create Entry
        if (isClass(wrapper.meshTodelete)) {
          this.changeLog.deleteClassEntry(
            application as Application,
            clazz,
            true
          );
        } else if (isPackage(wrapper.meshTodelete)) {
          if ((wrapper.meshTodelete as Package).parent)
            this.changeLog.deleteSubPackageEntry(
              application as Application,
              wrapper.meshTodelete,
              true
            );
          else
            this.changeLog.deletePackageEntry(
              application as Application,
              wrapper.meshTodelete,
              true
            );
        } else if (isApplication(wrapper.meshTodelete)) {
          this.changeLog.deleteAppEntry(wrapper.meshTodelete, true);
        }
      }

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  cutPackageFromPopup(pckg: Package) {
    this.clipboard = pckg.name;
    this.clippedMesh = pckg;
  }

  cutClassFromPopup(clazz: Class) {
    this.clipboard = clazz.name;
    this.clippedMesh = clazz;
  }

  resetClipboard() {
    this.clipboard = '';
    this.clippedMesh = null;
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
      this.insertPackageOrClassFromPopup(app as Application, true);
    } else {
      const pckg = getPackageById(
        this.landscapeData?.structureLandscapeData as StructureLandscapeData,
        destinationId
      );
      this.insertPackageOrClassFromPopup(pckg as Package, true);
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

  insertPackageOrClassFromPopup(
    destination: Application | Package,
    collabMode: boolean = false
  ) {
    if (this.landscapeData?.structureLandscapeData) {
      if (!collabMode) {
        this.sendCutInsertMessage(destination);
      }

      const app = this.getApp(this.clippedMesh as Package | Class);

      const updatedClassCommunications: DrawableClassCommunication[] = [];

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.allClassCommunications,
        meshTodelete: this.clippedMesh as Application | Package | Class,
        updatedComms: updatedClassCommunications,
      };

      const meshTextureMapping: Partial<MeshModelTextureMapping> = {
        action: MeshAction.CutInsert,
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

        cutAndInsertPackage(
          this.landscapeData.structureLandscapeData,
          cuttedPackage,
          destination,
          wrapper
        );

        // Create Changelog Entry
        if (this.clippedMesh.parent && app) {
          this.changeLog.cutAndInsertSubPackageEntry(
            app,
            cuttedPackage,
            destination,
            wrapper.meshTodelete,
            this.landscapeData.structureLandscapeData
          );
        } else if (!this.clippedMesh.parent && app) {
          this.changeLog.cutAndInsertPackageEntry(
            app,
            cuttedPackage,
            destination,
            wrapper.meshTodelete,
            this.landscapeData.structureLandscapeData
          );
        }

        changeID({ entity: this.clippedMesh }, 'removed|');

        this.meshModelTextureMappings.push({
          action: MeshAction.Delete,
          meshType: EntityType.Package,
          texturePath: 'images/minus.png',
          originApp: app as Application,
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

        cutAndInsertClass(
          this.landscapeData.structureLandscapeData,
          cuttedClass,
          destination as Package,
          wrapper
        );

        // Create Changelog Entry
        this.changeLog.cutAndInsertClassEntry(
          app,
          cuttedClass,
          destination as Package,
          this.clippedMesh,
          this.landscapeData.structureLandscapeData
        );

        changeID({ entity: this.clippedMesh }, 'removed|');

        this.meshModelTextureMappings.push({
          action: MeshAction.Delete,
          meshType: EntityType.Clazz,
          texturePath: 'images/minus.png',
          originApp: app as Application,
          pckg: this.clippedMesh.parent,
          clazz: this.clippedMesh,
        });

        this.deletedDataModels.push(this.clippedMesh);
      }

      this.updatedClassCommunications.push(wrapper.updatedComms);

      this.resetClipboard();

      if (isApplication(destination)) {
        meshTextureMapping.originApp = destination;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      } else if (isPackage(destination)) {
        const destinationApp = this.getApp(destination);
        meshTextureMapping.originApp = destinationApp;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      }

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  removeMeshModelTextureMapping(
    action: MeshAction,
    entityType: EntityType,
    app: Application,
    pckg?: Package,
    clazz?: Class
  ) {
    const undoMapping = this.meshModelTextureMappings.find(
      (mapping) =>
        mapping.action === action &&
        mapping.meshType === entityType &&
        mapping.originApp.id === app.id &&
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
