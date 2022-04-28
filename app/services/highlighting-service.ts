import Service, { inject as service } from '@ember/service';

export default class HighlightingService extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('local-vr-user')
  private localUser!: LocalVrUser;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }
  // normal class body definition here
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'highlighting-service': HighlightingService;
  }
}
