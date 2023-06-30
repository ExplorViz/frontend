import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';

export default class SynchronizationSession extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  // Count of remoteUsers in assoziated collaboration session
  deviceCount! : number;
  
  @service('local-user')
  private localUser!: LocalUser;
  
  // The current configuration of the connected device assoziated with this synchronization session
  configuration! : any;

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
