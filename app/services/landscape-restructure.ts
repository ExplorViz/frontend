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
import { getClassMethodByName } from 'explorviz-frontend/utils/class-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import {
  ChangeLogAction,
  EntryType,
} from 'explorviz-frontend/utils/change-log-entry';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import LinkRenderer from './link-renderer';
import * as THREE from 'three';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';

type MeshModelTextureMapping = {
  action: ChangeLogAction;
  meshType: EntryType;
  texturePath: string;
  originApp: Application;
  pckg?: Package;
  clazz?: Class;
};

type CommModelColorMapping = {
  action: ChangeLogAction;
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

  @tracked
  public restructureMode: boolean = false;

  @tracked
  public landscapeData: LandscapeData | null = null;

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
  @tracked
  classCommunication: DrawableClassCommunication[] = [];

  sourceClass: Class | null = null;

  targetClass: Class | null = null;

  setSourceOrTargetClass(type: string) {
    if (type == 'source' && isClass(this.clippedMesh))
      this.sourceClass = this.clippedMesh;
    else if (type == 'target' && isClass(this.clippedMesh))
      this.targetClass = this.clippedMesh;
  }

  async createCommunication(methodName: string) {
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
      this.changeLog.communicationEntry(
        sourceApp as Application,
        this.sourceClass,
        targetApp as Application,
        this.targetClass,
        methodName,
        this.landscapeData.structureLandscapeData
      );

      this.classCommunication.push(classCommunication);

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 3000));

      this.commModelColorMappings.push({
        action: ChangeLogAction.Communication,
        comm: classCommunication,
        color: new THREE.Color(0xff00a6),
      });

      this.applyColorMappings();
      this.applyTextureMappings();
    }
  }

  toggleRestructureMode() {
    return (this.restructureMode = !this.restructureMode);
  }

  setLandscapeData(newData: LandscapeData | null) {
    this.landscapeData = newData;
  }

  async updateApplicationName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const app = getApplicationInLandscapeById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (app) {
        // Create Changelog Entry
        this.changeLog.renameAppEntry(app, name);

        // Set new Application name
        app.name = name;

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );

        // Wait for changes to take effect
        await new Promise((f) => setTimeout(f, 3000));

        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Rename,
          meshType: EntryType.App,
          texturePath: 'images/hashtag.png',
          originApp: app as Application,
        });

        this.applyColorMappings();
        this.applyTextureMappings();
      }
    }
  }

  async updatePackageName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const pckg = getPackageById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (pckg) {
        const app = this.getAppFromPackage(pckg);

        // Create Changelog Entry
        if (!pckg.parent && app)
          this.changeLog.renamePackageEntry(app, pckg, name);
        else if (pckg.parent && app)
          this.changeLog.renameSubPackageEntry(app, pckg, name);

        // Set new Package name
        pckg.name = name;

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );

        // Wait for changes to take effect
        await new Promise((f) => setTimeout(f, 5000));

        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Rename,
          meshType: EntryType.Package,
          texturePath: 'images/hashtag.png',
          originApp: app as Application,
          pckg: pckg,
        });
        this.applyColorMappings();
        this.applyTextureMappings();
      }
    }
  }

  async updateSubPackageName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const pckg = getPackageById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (pckg) {
        const app = this.getAppFromPackage(pckg);

        // Create Changelog Entry
        if (app) this.changeLog.renameSubPackageEntry(app, pckg, name);

        // Set new Package name
        pckg.name = name;

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );

        // Wait for changes to take effect
        await new Promise((f) => setTimeout(f, 5000));

        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Rename,
          meshType: EntryType.Package,
          texturePath: 'images/hashtag.png',
          originApp: app as Application,
          pckg: pckg,
        });
        this.applyColorMappings();
        this.applyTextureMappings();
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

  async updateClassName(name: string, id: string, appId: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const application = getApplicationInLandscapeById(
        this.landscapeData.structureLandscapeData,
        appId
      );
      if (application) {
        const clazzToRename = setClassName(application, id);

        if (clazzToRename) {
          // Create Changelog Entry
          this.changeLog.renameClassEntry(application, clazzToRename, name);

          // Set new Class name
          clazzToRename.name = name;

          this.trigger(
            'restructureLandscapeData',
            this.landscapeData.structureLandscapeData,
            this.landscapeData.dynamicLandscapeData
          );

          // Wait for changes to take effect
          await new Promise((f) => setTimeout(f, 5000));
          this.meshModelTextureMappings.push({
            action: ChangeLogAction.Rename,
            meshType: EntryType.Clazz,
            texturePath: 'images/hashtag.png',
            originApp: application as Application,
            clazz: clazzToRename,
          });
          this.applyColorMappings();
          this.applyTextureMappings();
        }
      }
    }
  }

  updateOperationName(clazz: Class, originalName: string, newName: string) {
    const opt = getClassMethodByName(clazz, originalName);

    // User created Comms are not found with getClassMethodByName
    const newCommunication = this.classCommunication.find(
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

    this.applyColorMappings();
    this.applyTextureMappings();
  }

  async addApplication(appName: string, language: string) {
    if (this.landscapeData?.structureLandscapeData) {
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
      if (app && pckg && clazz) {
        this.changeLog.createAppEntry(app);
        this.changeLog.createPackageEntry(app, pckg);
        this.changeLog.createClassEntry(app, pckg, clazz);
      }

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 3000));

      this.meshModelTextureMappings.push({
        action: ChangeLogAction.Create,
        meshType: EntryType.App,
        texturePath: 'images/plus.png',
        originApp: app as Application,
        pckg: pckg as Package,
        clazz: clazz as Class,
      });

      this.applyColorMappings();
      this.applyTextureMappings();
    }
    this.newMeshCounter++;
  }

  applyColorMappings() {
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

  applyTextureMappings() {
    this.meshModelTextureMappings.forEach((elem) => {
      const currentAppModel = this.applicationRenderer.getApplicationById(
        elem.originApp?.id as string
      );
      // Apply Plus texture for new created Meshes
      if (elem.action === ChangeLogAction.Create) {
        if (elem.meshType === EntryType.App) {
          currentAppModel?.modelIdToMesh.forEach((mesh) => {
            if (mesh instanceof ClazzMesh) {
              mesh.changeTexture(elem.texturePath, 1);
            } else {
              mesh.changeTexture(elem.texturePath);
            }
          });
        } else if (
          elem.meshType === EntryType.Package ||
          elem.meshType === EntryType.SubPackage
        ) {
          currentAppModel?.modelIdToMesh.forEach((mesh) => {
            const isCorrectComponent =
              mesh instanceof ComponentMesh &&
              mesh.dataModel.id === elem.pckg?.id;
            const isCorrectClass =
              mesh instanceof ClazzMesh && mesh.dataModel.id === elem.clazz?.id;
            if (isCorrectComponent) {
              mesh.changeTexture(elem.texturePath);
            }
            if (isCorrectClass) {
              mesh.changeTexture(elem.texturePath, 1);
            }
          });
        } else if (elem.meshType === EntryType.Clazz) {
          currentAppModel?.modelIdToMesh.forEach((mesh) => {
            const isCorrectClass =
              mesh instanceof ClazzMesh && mesh.dataModel.id === elem.clazz?.id;
            if (isCorrectClass) {
              mesh.changeTexture(elem.texturePath, 1);
            }
          });
        }
        // Apply Minus texture for deleted Meshes
      } else if (elem.action === ChangeLogAction.Delete) {
        if (elem.meshType === EntryType.App) {
          const appliedTexture = this.findAppliedTexture(
            elem.originApp as Application
          );
          if (!appliedTexture) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              mesh.changeTexture(elem.texturePath);
            });
          }
        } else if (
          elem.meshType === EntryType.Package ||
          elem.meshType === EntryType.SubPackage
        ) {
          const appliedTexture = this.findAppliedTexture(elem.pckg as Package);
          if (!appliedTexture) {
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
          }
        } else if (elem.meshType === EntryType.Clazz) {
          const appliedTexture = this.findAppliedTexture(elem.clazz as Class);
          if (!appliedTexture) {
            currentAppModel?.modelIdToMesh.forEach((mesh) => {
              const isCorrectClass =
                mesh instanceof ClazzMesh &&
                mesh.dataModel.id === elem.clazz?.id;
              if (isCorrectClass) {
                mesh.changeTexture(elem.texturePath, 1);
              }
            });
          }
        }
        // Apply Hashtag texture for renamed operations
      } else if (elem.action === ChangeLogAction.Rename) {
        if (elem.meshType === EntryType.App) {
          const appliedTexture = this.findAppliedTexture(elem.originApp);
          if (!appliedTexture) {
            const foundationMesh = currentAppModel?.modelIdToMesh.get(
              elem.originApp.id
            );
            foundationMesh?.changeTexture(elem.texturePath);
          }
        } else if (elem.meshType === EntryType.Package) {
          const appliedTexture = this.findAppliedTexture(elem.pckg as Package);
          if (!appliedTexture) {
            const componentMesh = currentAppModel?.modelIdToMesh.get(
              elem.pckg?.id as string
            );
            componentMesh?.changeTexture(elem.texturePath);
          }
        } else if (elem.meshType === EntryType.Clazz) {
          const appliedTexture = this.findAppliedTexture(elem.clazz as Class);
          if (!appliedTexture) {
            const clazzMesh = currentAppModel?.modelIdToMesh.get(
              elem.clazz?.id as string
            );
            clazzMesh?.changeTexture(elem.texturePath, 1);
          }
        }
        // Apply Slash texture for inserted Meshes
      } else if (elem.action === ChangeLogAction.CutInsert) {
        if (elem.meshType === EntryType.Package) {
          const appliedTexture = this.findAppliedTexture(elem.pckg as Package);
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
        } else if (elem.meshType === EntryType.Clazz) {
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

  private findAppliedTexture(
    elem: Application | Package | Class
  ): MeshModelTextureMapping | undefined {
    return this.meshModelTextureMappings.find(
      (entry) =>
        (entry.originApp === elem ||
          entry.pckg === elem ||
          entry.clazz === elem) &&
        entry.action === ChangeLogAction.Create
    );
  }

  async addSubPackageFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const app = this.getAppFromPackage(pckg);
      if (app) {
        const subPackage = createPackage(this.newMeshCounter);
        const newClass = createClass(this.newMeshCounter);
        newClass.parent = subPackage;
        subPackage.parent = pckg;
        subPackage.classes.push(newClass as Class);
        pckg.subPackages.push(subPackage);

        // Create Changelog Entry
        this.changeLog.createPackageEntry(app, subPackage);
        this.changeLog.createClassEntry(app, subPackage, newClass as Class);

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );

        // Wait for changes to take effect
        await new Promise((f) => setTimeout(f, 3000));

        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Create,
          meshType: EntryType.Package,
          texturePath: 'images/plus.png',
          originApp: app as Application,
          pckg: subPackage as Package,
          clazz: newClass as Class,
        });

        this.applyColorMappings();
        this.applyTextureMappings();
      }
    }
    this.newMeshCounter++;
  }

  async addPackageFromPopup(app: Application) {
    if (this.landscapeData?.structureLandscapeData) {
      const newPckg = createPackage(this.newMeshCounter);
      const newClass = createClass(this.newMeshCounter);
      newClass.parent = newPckg;
      newPckg.classes.push(newClass as Class);
      app.packages.push(newPckg);

      // Create Changelog Entry
      this.changeLog.createPackageEntry(app, newPckg);
      this.changeLog.createClassEntry(app, newPckg, newClass as Class);

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 3000));

      this.meshModelTextureMappings.push({
        action: ChangeLogAction.Create,
        meshType: EntryType.Package,
        texturePath: 'images/plus.png',
        originApp: app as Application,
        pckg: newPckg as Package,
        clazz: newClass as Class,
      });

      this.applyColorMappings();
      this.applyTextureMappings();
    }
    this.newMeshCounter++;
  }

  async addClassFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const app = this.getAppFromPackage(pckg);
      if (app) {
        const clazz = createClass(this.newMeshCounter);
        clazz.parent = pckg;
        pckg.classes.push(clazz as Class);

        // Create Changelog Entry
        this.changeLog.createClassEntry(app, pckg, clazz as Class);

        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );

        // Wait for changes to take effect
        await new Promise((f) => setTimeout(f, 3000));

        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Create,
          meshType: EntryType.Clazz,
          texturePath: 'images/plus.png',
          originApp: app as Application,
          pckg: clazz.parent as Package,
          clazz: clazz as Class,
        });

        this.applyColorMappings();
        this.applyTextureMappings();
      }
    }
    this.newMeshCounter++;
  }

  async deleteAppFromPopup(app: Application) {
    if (this.landscapeData?.structureLandscapeData) {
      // Create wrapper for Communication, since it can change inside the function
      const wrapper = {
        comms: this.classCommunication,
      };

      // Create Changelog Entry
      this.changeLog.deleteAppEntry(app);

      removeApplication(
        this.landscapeData?.structureLandscapeData,
        wrapper,
        app,
        false
      );

      this.storeDeletedAppData(app);

      // Updating Communications
      this.classCommunication = wrapper.comms;

      // Remove all Meshes of the Application
      // const appObject3D: ApplicationObject3D | undefined =
      //   this.applicationRenderer.getApplicationById(app.id);
      // if (appObject3D) {
      //   appObject3D.removeAllEntities();
      //   appObject3D.removeAllCommunication();
      // }

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 5000));

      this.meshModelTextureMappings.push({
        action: ChangeLogAction.Delete,
        meshType: EntryType.App,
        texturePath: 'images/minus.png',
        originApp: app,
      });

      this.applyColorMappings();
      this.applyTextureMappings();
    }
  }

  async deletePackageFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      let app: Application | undefined;
      if (pckg.parent) {
        app = getApplicationFromSubPackage(
          this.landscapeData.structureLandscapeData,
          pckg.id
        );
      } else {
        app = getApplicationFromPackage(
          this.landscapeData.structureLandscapeData,
          pckg.id
        );
      }

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.classCommunication,
        meshTodelete: pckg,
      };

      removePackageFromApplication(
        this.landscapeData.structureLandscapeData,
        wrapper,
        pckg,
        false
      );

      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 5000));

      // Apply the Minus texture either on the whole Application or a Package with its children
      if (isApplication(wrapper.meshTodelete)) {
        // Store all datamodels that are deleted
        this.storeDeletedAppData(wrapper.meshTodelete);

        // Create Changelog Entry
        this.changeLog.deleteAppEntry(wrapper.meshTodelete);

        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Delete,
          meshType: EntryType.App,
          texturePath: 'images/minus.png',
          originApp: wrapper.meshTodelete,
        });
      } else if (isPackage(wrapper.meshTodelete)) {
        this.meshModelTextureMappings.push({
          action: ChangeLogAction.Delete,
          meshType: EntryType.Package,
          texturePath: 'images/minus.png',
          originApp: app as Application,
          pckg: wrapper.meshTodelete,
        });

        this.storeDeletedPackageData(wrapper.meshTodelete);

        // Create Changelog Entry
        if (app && wrapper.meshTodelete.parent) {
          this.changeLog.deleteSubPackageEntry(app, wrapper.meshTodelete);
        } else if (app && !wrapper.meshTodelete.parent) {
          this.changeLog.deletePackageEntry(app, wrapper.meshTodelete);
        }
        // this.classCommunication = wrapper.comms;
        // this.applicationRepo.clear();
        // delete wrapper.meshTodelete.parent;
      }
      this.applyColorMappings();
      this.applyTextureMappings();
    }
  }

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

  async deleteClassFromPopup(clazz: Class) {
    if (this.landscapeData?.structureLandscapeData) {
      const application = getApplicationFromClass(
        this.landscapeData.structureLandscapeData,
        clazz
      );

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.classCommunication,
        meshTodelete: clazz,
      };

      removeClassFromPackage(
        this.landscapeData.structureLandscapeData,
        wrapper,
        clazz,
        false
      );

      // this.classCommunication = wrapper.comms;
      // this.applicationRepo.clear();
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 5000));

      // Apply the Minus texture either on the whole Application, n Package with its children or a Class only
      if (application) {
        if (isClass(wrapper.meshTodelete)) {
          this.meshModelTextureMappings.push({
            action: ChangeLogAction.Delete,
            meshType: EntryType.Clazz,
            texturePath: 'images/minus.png',
            originApp: application as Application,
            clazz: wrapper.meshTodelete,
          });

          // Create Changelog Entry
          this.changeLog.deleteClassEntry(application, clazz);

          this.deletedDataModels.push(wrapper.meshTodelete);
        } else if (isPackage(wrapper.meshTodelete)) {
          this.meshModelTextureMappings.push({
            action: ChangeLogAction.Delete,
            meshType: EntryType.Package,
            texturePath: 'images/minus.png',
            originApp: application as Application,
            pckg: wrapper.meshTodelete,
          });

          this.storeDeletedPackageData(wrapper.meshTodelete);

          // Create Changelog Entry
          if ((wrapper.meshTodelete as Package).parent)
            this.changeLog.deleteSubPackageEntry(
              application,
              wrapper.meshTodelete
            );
          else
            this.changeLog.deletePackageEntry(
              application,
              wrapper.meshTodelete
            );
        } else if (isApplication(wrapper.meshTodelete)) {
          this.meshModelTextureMappings.push({
            action: ChangeLogAction.Delete,
            meshType: EntryType.App,
            texturePath: 'images/minus.png',
            originApp: application as Application,
            clazz: wrapper.meshTodelete,
          });

          this.storeDeletedAppData(wrapper.meshTodelete);

          // Create Changelog Entry
          this.changeLog.deleteAppEntry(wrapper.meshTodelete);
        }
      }

      this.applyColorMappings();
      this.applyTextureMappings();
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

  async insertPackageOrClassFromPopup(destination: Application | Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const getApp: (
        LandscapeData: StructureLandscapeData,
        appChild: Package | Class
      ) => Application | undefined = (landscapeData, appChild) => {
        if (isPackage(appChild)) {
          if (appChild.parent)
            return getApplicationFromSubPackage(landscapeData, appChild.id);
          else return getApplicationFromPackage(landscapeData, appChild.id);
        }

        if (isClass(appChild))
          return getApplicationFromClass(landscapeData, appChild);

        return undefined;
      };

      const app = getApp(
        this.landscapeData.structureLandscapeData,
        this.clippedMesh as Package | Class
      );

      // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
      const wrapper = {
        comms: this.classCommunication,
        meshTodelete: this.clippedMesh as Package | Class,
      };

      const meshTextureMapping: Partial<MeshModelTextureMapping> = {
        action: ChangeLogAction.CutInsert,
        texturePath: 'images/slash.png',
      };

      // Distinguish between clipped Package and clipped Class
      if (isPackage(this.clippedMesh)) {
        meshTextureMapping.meshType = EntryType.Package;
        meshTextureMapping.pckg = this.clippedMesh;

        // Create Changelog Entry
        if (this.clippedMesh.parent && app) {
          this.changeLog.cutAndInsertSubPackageEntry(
            app,
            this.clippedMesh,
            destination,
            this.landscapeData.structureLandscapeData
          );
        } else if (!this.clippedMesh.parent && app) {
          this.changeLog.cutAndInsertPackageEntry(
            app,
            this.clippedMesh,
            destination,
            this.landscapeData.structureLandscapeData
          );
        }

        cutAndInsertPackage(
          this.landscapeData.structureLandscapeData,
          this.clippedMesh,
          destination,
          wrapper
        );
      } else if (isClass(this.clippedMesh) && app) {
        meshTextureMapping.meshType = EntryType.Clazz;
        meshTextureMapping.clazz = this.clippedMesh;

        // Create Changelog Entry
        this.changeLog.cutAndInsertClassEntry(
          app,
          this.clippedMesh,
          destination,
          this.landscapeData.structureLandscapeData
        );

        cutAndInsertClass(
          this.landscapeData.structureLandscapeData,
          this.clippedMesh,
          destination as Package,
          wrapper
        );
      }

      // Create Changelog Entry
      if (wrapper.meshTodelete && wrapper.meshTodelete !== this.clippedMesh) {
        if (isApplication(wrapper.meshTodelete)) {
          const appObject3D: ApplicationObject3D | undefined =
            this.applicationRenderer.getApplicationById(
              wrapper.meshTodelete.id
            );
          if (appObject3D) {
            appObject3D.removeAllEntities();
            appObject3D.removeAllCommunication();
          }
          this.changeLog.deleteAppEntry(wrapper.meshTodelete);
        } else if (isPackage(wrapper.meshTodelete)) {
          if (wrapper.meshTodelete.parent) {
            this.changeLog.deleteSubPackageEntry(
              app as Application,
              wrapper.meshTodelete
            );
          } else {
            this.changeLog.deletePackageEntry(
              app as Application,
              wrapper.meshTodelete
            );
          }
        }
      }

      this.classCommunication = wrapper.comms;
      // this.applicationRepo.clear();
      this.resetClipboard();
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );

      // Wait for changes to take effect
      await new Promise((f) => setTimeout(f, 5000));

      if (isApplication(destination)) {
        meshTextureMapping.originApp = destination;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      } else if (isPackage(destination)) {
        const destinationApp = getApp(
          this.landscapeData.structureLandscapeData,
          destination
        );
        meshTextureMapping.originApp = destinationApp;
        this.meshModelTextureMappings.push(
          meshTextureMapping as MeshModelTextureMapping
        );
      }
      this.applyColorMappings();
      this.applyTextureMappings();
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-restructure': LandscapeRestructure;
  }
}
