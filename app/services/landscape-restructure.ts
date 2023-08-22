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
import { getPackageById } from 'explorviz-frontend/utils/package-helpers';
import { getClassMethodByName } from 'explorviz-frontend/utils/class-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('changelog')
  changeLog!: Changelog;

  @tracked
  public restructureMode: boolean = false;

  @tracked
  public landscapeData: LandscapeData | null = null;

  @tracked
  newMeshCounter: number = 1;

  @tracked
  clipboard: string = '';

  @tracked
  clippedMesh: Package | Class | null = null;

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

  createCommunication(methodName: string) {
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
      const classCommunication: DrawableClassCommunication = {
        id: this.sourceClass.name + ' => ' + this.targetClass.name,
        totalRequests: 1,
        sourceClass: this.sourceClass,
        targetClass: this.targetClass,
        operationName: methodName,
        sourceApp: sourceApp,
        targetApp: targetApp,
      };
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
    }
  }

  toggleRestructureMode() {
    return (this.restructureMode = !this.restructureMode);
  }

  setLandscapeData(newData: LandscapeData | null) {
    this.landscapeData = newData;
  }

  updateApplicationName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const app = getApplicationInLandscapeById(
        this.landscapeData.structureLandscapeData,
        id
      );
      if (app) {
        this.changeLog.renameAppEntry(app, name);
        app.name = name;
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  updatePackageName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const pckg = getPackageById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (pckg) {
        const app = this.getAppFromPackage(pckg);
        if (!pckg.parent && app)
          this.changeLog.renamePackageEntry(app, pckg, name);
        else if (pckg.parent && app)
          this.changeLog.renameSubPackageEntry(app, pckg, name);
        pckg.name = name;
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
  }

  updateSubPackageName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const pckg = getPackageById(
        this.landscapeData.structureLandscapeData,
        id
      );

      if (pckg) {
        const app = this.getAppFromPackage(pckg);
        if (app) this.changeLog.renameSubPackageEntry(app, pckg, name);
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

  updateClassName(name: string, id: string, appId: string) {
    if (this.landscapeData?.structureLandscapeData) {
      const application = getApplicationInLandscapeById(
        this.landscapeData.structureLandscapeData,
        appId
      );
      if (application) {
        const clazzToRename = setClassName(application, id);

        if (clazzToRename) {
          this.changeLog.renameClassEntry(application, clazzToRename, name);
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

  updateOperationName(clazz: Class, originalName: string, newName: string) {
    const opt = getClassMethodByName(clazz, originalName);
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
  }

  addApplication(appName: string, language: string) {
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
    }
    this.newMeshCounter++;
  }

  addSubPackageFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const app = this.getAppFromPackage(pckg);
      if (app) {
        const subPackage = createPackage(this.newMeshCounter);
        const newClass = createClass(this.newMeshCounter);
        newClass.parent = subPackage;
        subPackage.parent = pckg;
        subPackage.classes.push(newClass as Class);
        pckg.subPackages.push(subPackage);
        this.changeLog.createPackageEntry(app, subPackage);
        this.changeLog.createClassEntry(app, subPackage, newClass as Class);
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
    this.newMeshCounter++;
  }

  addPackageFromPopup(app: Application) {
    if (this.landscapeData?.structureLandscapeData) {
      const newPckg = createPackage(this.newMeshCounter);
      const newClass = createClass(this.newMeshCounter);
      newClass.parent = newPckg;
      newPckg.classes.push(newClass as Class);
      app.packages.push(newPckg);
      this.changeLog.createPackageEntry(app, newPckg);
      this.changeLog.createClassEntry(app, newPckg, newClass as Class);
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addClassFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const app = this.getAppFromPackage(pckg);
      if (app) {
        const clazz = createClass(this.newMeshCounter);
        clazz.parent = pckg;
        pckg.classes.push(clazz as Class);
        this.changeLog.createClassEntry(app, pckg, clazz as Class);
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
      }
    }
    this.newMeshCounter++;
  }

  deleteAppFromPopup(app: Application) {
    if (this.landscapeData?.structureLandscapeData) {
      // let appl: object = {l: "test"};
      // let wrapper = {
      //   comms: this.classCommunication,
      //   meshTodelete: appl as Application
      // };
      const wrapper = {
        comms: this.classCommunication,
      };
      this.changeLog.deleteAppEntry(app);
      removeApplication(
        this.landscapeData?.structureLandscapeData,
        wrapper,
        app,
        false
      );
      this.classCommunication = wrapper.comms;
      //if(wrapper.meshTodelete && isApplication(wrapper.meshTodelete)) {
      const appObject3D: ApplicationObject3D | undefined =
        this.applicationRenderer.getApplicationById(app.id);
      console.log('found');
      console.log(appObject3D);
      if (appObject3D) {
        appObject3D.removeAllEntities();
        appObject3D.removeAllCommunication();
      }
      //this.applicationRepo.delete(wrapper.app.id);
      //}
      //this.applicationRepo.clear();
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  deletePackageFromPopup(pckg: Package) {
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

      if (isApplication(wrapper.meshTodelete)) {
        this.changeLog.deleteAppEntry(wrapper.meshTodelete);
      } else if (isPackage(wrapper.meshTodelete)) {
        if (app && wrapper.meshTodelete.parent) {
          this.changeLog.deleteSubPackageEntry(app, wrapper.meshTodelete);
        } else if (app && !wrapper.meshTodelete.parent) {
          this.changeLog.deletePackageEntry(app, wrapper.meshTodelete);
        }
        //delete wrapper.meshTodelete.parent;
      }

      this.classCommunication = wrapper.comms;
      this.applicationRepo.clear();
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  deleteClassFromPopup(clazz: Class) {
    if (this.landscapeData?.structureLandscapeData) {
      const application = getApplicationFromClass(
        this.landscapeData.structureLandscapeData,
        clazz
      );
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
      if (application) {
        if (isClass(wrapper.meshTodelete)) {
          this.changeLog.deleteClassEntry(application, clazz);
        } else if (isPackage(wrapper.meshTodelete)) {
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
          this.changeLog.deleteAppEntry(wrapper.meshTodelete);
        }
      }
      this.classCommunication = wrapper.comms;
      this.applicationRepo.clear();
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

  insertPackageOrClassFromPopup(pckg: Application | Package) {
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

      const wrapper = {
        comms: this.classCommunication,
        meshTodelete: this.clippedMesh as Package | Class,
      };

      if (isPackage(this.clippedMesh)) {
        if (this.clippedMesh.parent && app) {
          this.changeLog.cutAndInsertSubPackageEntry(
            app,
            this.clippedMesh,
            pckg,
            this.landscapeData.structureLandscapeData
          );
        } else if (!this.clippedMesh.parent && app) {
          this.changeLog.cutAndInsertPackageEntry(
            app,
            this.clippedMesh,
            pckg,
            this.landscapeData.structureLandscapeData
          );
        }

        cutAndInsertPackage(
          this.landscapeData.structureLandscapeData,
          this.clippedMesh,
          pckg,
          wrapper
        );
      } else if (isClass(this.clippedMesh) && app) {
        this.changeLog.cutAndInsertClassEntry(
          app,
          this.clippedMesh,
          pckg,
          this.landscapeData.structureLandscapeData
        );
        cutAndInsertClass(
          this.landscapeData.structureLandscapeData,
          this.clippedMesh,
          pckg as Package,
          wrapper
        );
      }
      if (wrapper.meshTodelete && wrapper.meshTodelete !== this.clippedMesh) {
        if (isApplication(wrapper.meshTodelete)) {
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
      this.applicationRepo.clear();
      this.resetClipboard();
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
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
