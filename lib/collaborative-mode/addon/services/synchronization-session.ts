import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import SynchronizeService from 'virtual-reality/services/synchronize';

export default class SynchronizationSession extends Service {

  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('synchronize')
  private synchronizeService!: SynchronizeService;

  // Controlinstance of the connected devices
  private isMain!: boolean;

  // The id of the connected device
  private _deviceId!: number;
  
  // The current configuration of the connected device assoziated with this synchronization session
  private configuration! : any;

  set deviceId(n : number) {
    this._deviceId = n;
    this.isMain = n == 0;
    this.configuration = this.configure(this.isMain);
  }

  /** Configure device if it's a synchronizing device.
   * 
   * @param main 
   * @returns 
   */
  configure(main: boolean) {
    return main ? "no configuration" : "projector " + this._deviceId + " configuration";
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
