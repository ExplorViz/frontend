import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { addClassToApplication, addFoundationToLandscape, addPackageToApplication, addSubPackageToPackage, removeApplication, removeClassFromPackage, removePackageFromApplication, setApplicationNameInLandscapeById, setClassNameById, setPackageNameById } from 'explorviz-frontend/utils/restructure-helper';
import ApplicationRenderer from './application-renderer';
import internal from 'stream';
import { Application, Class, Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;
  
  @tracked
  public restructureMode: boolean = false;

  @tracked
  public landscapeData: LandscapeData | null = null;

  @tracked
  highlightedMeshes: Map<string, THREE.Mesh> = new Map();

  @tracked
  newMeshCounter: number = 1;

  toggleRestructureMode() {
    return (this.restructureMode = !this.restructureMode);
  }

  setLandscapeData(newData: LandscapeData | null) {
    this.landscapeData = newData;
    console.log(this.landscapeData);
  }

  updateApplicationName(name: string, id: string) {
    if (this.landscapeData?.structureLandscapeData) {
      this.landscapeData.structureLandscapeData = setApplicationNameInLandscapeById(this.landscapeData.structureLandscapeData, id, name)
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
      console.log();
    } else console.log('No Application with ID: ' + id + ' found!');
  }

  updatePackageName(name: string, id: string) {
    if(this.landscapeData?.structureLandscapeData) {
      this.landscapeData.structureLandscapeData = setPackageNameById(this.landscapeData.structureLandscapeData, id, name)
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    } else console.log('No Package with ID: ' + id + ' found!')
  }

  updateClassName(name: string, id: string, appId: string) {
    if(this.landscapeData?.structureLandscapeData) {
      this.landscapeData.structureLandscapeData = setClassNameById(this.landscapeData.structureLandscapeData, appId, id, name);
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    } else console.log('No Class with ID: ' + id + ' found!')
  }

  addFoundation() {
    if(this.landscapeData?.structureLandscapeData) {
      addFoundationToLandscape(this.landscapeData?.structureLandscapeData, this.newMeshCounter)
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addPackage() {
    let highlightedMesh = this.highlightedMeshes.entries().next().value;
    addPackageToApplication(highlightedMesh[1].dataModel, this.newMeshCounter);
    console.log(highlightedMesh[1].dataModel);
    if(this.landscapeData?.structureLandscapeData) {
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
    if(this.landscapeData?.structureLandscapeData) {
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
    if(this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      );
    }
    this.newMeshCounter++;
  }

  addClass() {
    let highlightedMesh = this.highlightedMeshes.entries().next().value;
    addClassToApplication(highlightedMesh[1].dataModel, this.newMeshCounter);
    console.log(highlightedMesh[1].dataModel);
    if(this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      )
    }
    this.newMeshCounter++;
  }

  addClassFromPopup(pckg: Package) {
    addClassToApplication(pckg, this.newMeshCounter);
    if(this.landscapeData?.structureLandscapeData) {
      this.trigger(
        'restructureLandscapeData',
        this.landscapeData.structureLandscapeData,
        this.landscapeData.dynamicLandscapeData
      )
    }
    this.newMeshCounter++;
  }

  deleteAppFromPopup(app: Application) {
    if(this.landscapeData?.structureLandscapeData) {
      removeApplication(this.landscapeData?.structureLandscapeData, app);
      if(this.landscapeData?.structureLandscapeData) {
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        )
      }
    }
  }

  deletePackageFromPopup(pckg: Package) {
    if(this.landscapeData?.structureLandscapeData) {
      removePackageFromApplication(pckg);
      if(this.landscapeData?.structureLandscapeData) {
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        )
      }
    }
  }

  deleteClassFromPopup(clazz: Class) {
    if(this.landscapeData?.structureLandscapeData) {
      removeClassFromPackage(clazz);
      if(this.landscapeData?.structureLandscapeData) {
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        )
      }
    }
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-restructure': LandscapeRestructure;
  }
}
