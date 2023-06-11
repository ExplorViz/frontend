import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { setApplicationNameInLandscapeById, setClassNameById, setPackageNameById } from 'explorviz-frontend/utils/restructure-helper';
import ApplicationRenderer from './application-renderer';

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;
  
  @tracked
  public restructureMode: boolean = false;

  @tracked
  public landscapeData: LandscapeData | null = null;

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
