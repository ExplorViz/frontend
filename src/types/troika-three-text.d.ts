declare module 'troika-three-text' {
  import type { Mesh } from 'three';

  /** SDF text mesh used by `@react-three/drei` `<Text />`. */
  export class Text extends Mesh {
    text: string;
  }
}
