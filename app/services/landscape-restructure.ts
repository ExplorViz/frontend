import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class LandscapeRestructure extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @tracked
  public restructureMode: boolean = false;

  toggleRestructureMode() {
    return (this.restructureMode = !this.restructureMode);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-restructure': LandscapeRestructure;
  }
}
