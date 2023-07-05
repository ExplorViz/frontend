import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import SynchronizeService from 'virtual-reality/services/synchronize';

export default class SynchronizationSession extends Service {

  // Controlinstance of the connected devices assoziated with this colaboration session
  private _isMain!: boolean;
  
  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('synchronize')
  private synchronizeService!: SynchronizeService;
  
  // The current configuration of the connected device assoziated with this synchronization session
  private configuration! : any;

  set isMain(v: boolean) {
    this._isMain = v;
    this.configuration = this.configure(this._isMain);
  }

  configure(main: boolean) {
    return main ? "no configuration" : "projector configuration";
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
