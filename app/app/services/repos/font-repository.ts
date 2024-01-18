import Service from '@ember/service';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

export default class FontRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  font!: Font;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/font-repository': FontRepository;
  }
}
