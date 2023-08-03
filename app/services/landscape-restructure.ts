import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import {
  addClassToApplication,
  addFoundationToLandscape,
  addMethodToClass,
  addPackageToApplication,
  addSubPackageToPackage,
  cutAndInsertPackage,
  cutAndInsertClass,
  removeApplication,
  removeClassFromPackage,
  removePackageFromApplication,
  setApplicationNameInLandscapeById,
  setClassNameById,
  setPackageNameById,
} from 'explorviz-frontend/utils/restructure-helper';
import ApplicationRenderer from './application-renderer';
import {
  Application,
  Class,
  Package,
  isClass,
  isPackage,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { getApplicationFromClass } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationRepository from './repos/application-repository';

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @tracked
  public restructureMode: boolean = false;

  @tracked
  public landscapeData: LandscapeData | null = null;

  @tracked
  highlightedMeshes: Map<string, THREE.Mesh> = new Map();

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
      addMethodToClass(this.sourceClass, methodName);
      const classCommunication: DrawableClassCommunication = {
        id: this.sourceClass.name + ' => ' + this.targetClass.name,
        totalRequests: 1,
        sourceClass: this.sourceClass,
        targetClass: this.targetClass,
        operationName: methodName,
        sourceApp: sourceApp,
        targetApp: targetApp,
      };
      this.classCommunication.push(classCommunication);
      console.log(this.classCommunication);
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
    console.log(this.landscapeData);
  }

  updateApplicationName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      setApplicationNameInLandscapeById(
        this.landscapeData.structureLandscapeData,
        id,
        name
      );
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    } else console.log('No Application with ID: ' + id + ' found!');
  }

  updatePackageName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      setPackageNameById(this.landscapeData.structureLandscapeData, id, name);
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    } else console.log('No Package with ID: ' + id + ' found!');
  }

  updateClassName(name: string, id: string, appId: string) {
    if (this.landscapeData?.structureLandscapeData) {
      setClassNameById(
        this.landscapeData.structureLandscapeData,
        appId,
        id,
        name
      );
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    } else console.log('No Class with ID: ' + id + ' found!');
  }

  addFoundation() {
    if (this.landscapeData?.structureLandscapeData) {
      addFoundationToLandscape(
        this.landscapeData?.structureLandscapeData,
        this.newMeshCounter
      );
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addPackage() {
    const highlightedMesh = this.highlightedMeshes.entries().next().value;
    addPackageToApplication(highlightedMesh[1].dataModel, this.newMeshCounter);
    console.log(highlightedMesh[1].dataModel);
    if (this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addSubPackageFromPopup(pckg: Package) {
    addSubPackageToPackage(pckg, this.newMeshCounter);
    if (this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addPackageFromPopup(app: Application) {
    addPackageToApplication(app, this.newMeshCounter);
    if (this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addClass() {
    const highlightedMesh = this.highlightedMeshes.entries().next().value;
    addClassToApplication(highlightedMesh[1].dataModel, this.newMeshCounter);
    console.log(highlightedMesh[1].dataModel);
    if (this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addClassFromPopup(pckg: Package) {
    addClassToApplication(pckg, this.newMeshCounter);
    if (this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  deleteAppFromPopup(app: Application) {
    if (this.landscapeData?.structureLandscapeData) {
      /*let appl: object = {l: "test"};
      let wrapper = {
        comms: this.classCommunication,
        app: appl
      };*/
      const wrapper = {
        comms: this.classCommunication,
      };
      removeApplication(
        this.landscapeData?.structureLandscapeData,
        wrapper,
        app,
        false
      );
      this.classCommunication = wrapper.comms;
      /*if(isApplication(wrapper.app)) {
        this.applicationRenderer.removeApplicationLocally(wrapper.app.id);
        let vrobj: ApplicationObject3D | undefined = this.applicationRenderer.getApplicationById(wrapper.app.id);
        const appdata = this.applicationRepo.getById(wrapper.app.id);
        console.log("found");
        console.log(vrobj);
        if(vrobj) {
          vrobj.removeAllEntities();
          vrobj.removeAllCommunication();
          this.applicationRenderer.
        }
        //this.applicationRepo.delete(wrapper.app.id);
      }*/
      this.applicationRepo.clear();
      console.log(this.applicationRepo);
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
  }

  deletePackageFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const wrapper = { comms: this.classCommunication };
      removePackageFromApplication(
        this.landscapeData.structureLandscapeData,
        wrapper,
        pckg,
        false
      );
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
      const wrapper = { comms: this.classCommunication };
      removeClassFromPackage(
        this.landscapeData.structureLandscapeData,
        wrapper,
        clazz,
        false
      );
      this.classCommunication = wrapper.comms;
      console.log(this.classCommunication);
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

  insertPackageOrClassFromPopup(pckg: Package) {
    if (this.landscapeData?.structureLandscapeData) {
      const wrapper = { comms: this.classCommunication };
      if (isPackage(this.clippedMesh))
        cutAndInsertPackage(
          this.landscapeData.structureLandscapeData,
          this.clippedMesh,
          pckg,
          wrapper
        );
      else if (isClass(this.clippedMesh))
        cutAndInsertClass(
          this.landscapeData.structureLandscapeData,
          this.clippedMesh,
          pckg,
          wrapper
        );
      console.log(wrapper.comms);
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
