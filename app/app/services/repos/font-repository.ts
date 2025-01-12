import Service from '@ember/service';
import { useFontRepositoryStore } from 'react-lib/src/stores/repos/font-repository';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

export default class FontRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  // font!: Font;
  get font(): Font {
    return useFontRepositoryStore.getState().font!;
  }

  set font(value: Font) {
    useFontRepositoryStore.setState({ font: value });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/font-repository': FontRepository;
  }
}
