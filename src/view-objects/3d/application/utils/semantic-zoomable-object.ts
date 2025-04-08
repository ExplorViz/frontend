import { Mesh } from 'three';
import { Appearence } from './semantic-zoom-appearance';

/**
 * Semantic zoomable object Interface
 */
export interface SemanticZoomableObject {
  // Should be the visibility property of the Mesh
  visible: boolean;
  //Prio higher is more urgent. Lower is less urgent. Defaults to 0
  prio: number;
  // Overrides the default behaviour such that if it is not visibile, it does not get triggered
  // Now gets triggered even if not visible (maybe makes it visible).
  overrideVisibility: boolean;
  canUseOrignal: boolean;
  // appearenceLevel number i is == 0 default appearence
  //              > 0 if appearence selected
  //              < 0 hide all and itsself
  //appearenceLevel: number;
  // Callback that triggers before the activation of any Appearence that is not 0
  callBeforeAppearenceAboveZero: (currentMesh: Mesh | undefined) => void;
  // Callback that is triggered before the default Appearence gets restored
  callBeforeAppearenceZero: (currentMesh: Mesh | undefined) => void;
  // Maps a Number 0-inf to one Appearence
  //appearencesMap: Map<number, Appearence>;
  // Displays the Appearence i
  showAppearence(
    i: number,
    fromBeginning: boolean,
    includeOrignal: boolean
  ): boolean;
  // Return the currently active Appearence Level
  getCurrentAppearenceLevel(): number;
  // Regsiters a new Appearence for an index i
  setAppearence(i: number, ap: Appearence | (() => void)): void;
  // Returns the number of available level of Appearences - 1 (-1 because of the default Appearence of 0)
  getNumberOfLevels(): number;
  // saveOriginalAppearence saves the orignal appearence
  saveOriginalAppearence(): void;
  // Callback Setter
  setCallBeforeAppearenceAboveZero(
    fn: (currentMesh: Mesh | undefined) => void
  ): void;
  // Callback Setter
  setCallBeforeAppearenceZero(
    fn: (currentMesh: Mesh | undefined) => void
  ): void;
  // true (default) allows to trigger the orignal appearence save/restore,
  // with false it does not trigger the orignal, therefor not usefull in combination with any Recipe
  useOrignalAppearence(yesno: boolean): void;
  // Clustering Business
  // getPoI stands for getPointsOfInterest and represents a list of
  // interresting points of a 3d Object in the absolute world.
  //
  getPoI(): Array<THREE.Vector3>;
}
