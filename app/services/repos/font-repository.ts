import Service from '@ember/service';

export default class FontRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  font!: THREE.Font;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/font-repository': FontRepository;
  }
}
