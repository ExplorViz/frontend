import Service from '@ember/service';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { useFontRepositoryStore } from 'some-react-lib/src/stores/repos/font-repository';

export default class FontRepository extends Service {
  get font(): Font | null {
    return useFontRepositoryStore.getState().font;
  }

  set font(font: Font) {
    useFontRepositoryStore.setState({ font });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/font-repository': FontRepository;
  }
}
