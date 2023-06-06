import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import { setApplicationInLandscapeById, setApplicationName } from 'explorviz-frontend/utils/restructure-helper';

export default class LandscapeRestructure extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
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
      let application = setApplicationName(this.landscapeData.structureLandscapeData, id, name)
      if (application) {
        this.landscapeData.structureLandscapeData = setApplicationInLandscapeById(this.landscapeData.structureLandscapeData, id, application)
        this.trigger(
          'restructureLandscapeData',
          this.landscapeData.structureLandscapeData,
          this.landscapeData.dynamicLandscapeData
        );
        console.log(application);
      } else console.log('No Application with ID: ' + id + ' found!');
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-restructure': LandscapeRestructure;
  }
}
