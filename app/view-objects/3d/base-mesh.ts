import * as THREE from 'three';
import calculateColorBrightness from 'explorviz-frontend/utils/helpers/threejs-helpers';
import { MeshLineMaterial } from 'meshline';
import { tracked } from '@glimmer/tracking';
import SemanticZoomManager, {
  SemanticZoomableObject,
  Appearence,
  Recipe,
} from './application/utils/semantic-zoom-manager';

export default abstract class BaseMesh<
    TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
    TMaterial extends THREE.Material | THREE.Material[] = THREE.Material,
  >
  extends THREE.Mesh<TGeometry, TMaterial>
  implements SemanticZoomableObject
{
  @tracked
  highlighted: boolean = false;
  defaultColor: THREE.Color;

  defaultOpacity: number;

  highlightingColor: THREE.Color;

  isHovered = false;

  appearenceLevel: number = 0;

  appearencesMap: Array<Appearence | (() => void)> = [];

  originalAppearence: Recipe | undefined = undefined;

  canUseOrignal: boolean = true;
  overrideVisibility: boolean = false;

  callBeforeAppearenceAboveZero: (currentMesh: THREE.Mesh | undefined) => void =
    () => {};
  callBeforeAppearenceZero: (currentMesh: THREE.Mesh | undefined) => void =
    () => {};

  constructor(
    defaultColor: THREE.Color = new THREE.Color(),
    highlightingColor = new THREE.Color('red'),
    defaultOpacity = 1
  ) {
    super();
    this.defaultColor = defaultColor;
    this.defaultOpacity = defaultOpacity;
    this.highlightingColor = highlightingColor;
  }
  prio: number = 0;
  useOrignalAppearence(yesno: boolean): void {
    this.canUseOrignal = yesno;
  }
  setCallBeforeAppearenceAboveZero(
    fn: (currentMesh: THREE.Mesh | undefined) => void
  ): void {
    this.callBeforeAppearenceAboveZero = fn;
  }
  setCallBeforeAppearenceZero(
    fn: (currentMesh: THREE.Mesh | undefined) => void
  ): void {
    this.callBeforeAppearenceZero = fn;
  }

  saveOriginalAppearence() {
    this.originalAppearence = Recipe.generateFromMesh(this);
  }
  restoreOriginalAppearence() {
    const tmpAppearence = new Appearence();
    if (this.originalAppearence == undefined) return;
    tmpAppearence.setRecipe(this.originalAppearence);
    tmpAppearence.setObject3D(this);
    tmpAppearence.activate();
    this.appearenceLevel = 0;
  }
  restoreAppearence() {
    this.showAppearence(this.appearenceLevel, false, false);
  }
  showAppearence(
    i: number,
    fromBeginningOrig: boolean = true,
    includeOrignalOrig: boolean = true
  ): boolean {
    let targetApNumber: number = i;
    let fromBeginning: boolean = fromBeginningOrig;
    let includeOrignal: boolean = includeOrignalOrig;

    if (!this.visible && !this.overrideVisibility) {
      return true;
    }

    if (this.getCurrentAppearenceLevel() == targetApNumber) {
      return false;
    } else if (this.getCurrentAppearenceLevel() < targetApNumber) {
      fromBeginning = false;
      includeOrignal = false;
    } else if (this.getCurrentAppearenceLevel() > targetApNumber) {
      fromBeginning = true;
      includeOrignal = true;
    }

    if (targetApNumber == 0 && this.originalAppearence != undefined) {
      // return to default look
      this.callBeforeAppearenceZero(this);
      if (this.canUseOrignal) {
        this.restoreOriginalAppearence();
      }
      this.appearencesMap.forEach((v, k) => {
        if (k != 0 && v instanceof Appearence) v.deactivate();
      });
      this.appearenceLevel = targetApNumber;
      return true;
    } else if (targetApNumber == 0 && this.originalAppearence == undefined) {
      // Save Orignal
      if (this.canUseOrignal) {
        this.saveOriginalAppearence();
      }
      this.appearenceLevel = targetApNumber;
      return true;
    }
    // Find the highest available Zoom Level
    const highestAvailableTargetAppearence = Math.max(
      this.getNumberOfLevels() - 1,
      0
    );
    if (highestAvailableTargetAppearence < targetApNumber) {
      targetApNumber = highestAvailableTargetAppearence;
    }
    // Check if the required level is registered, else abort
    if (targetApNumber == 0) {
      //Already handeled 0, since it is the original appearence
      return true;
    }
    const targetAppearence = this.appearencesMap[targetApNumber];
    if (targetAppearence == undefined) return false;
    // throw new Error(
    //   'Requestet Detail Level is not found: ' +
    //     targetApNumber +
    //     ' of ' +
    //     Math.max(this.getNumberOfLevels() - 1, 0)
    // );

    // Possible manipulation before any changes
    this.callBeforeAppearenceAboveZero(this);

    // Start with Original Appearence
    if (includeOrignal && this.canUseOrignal) this.restoreOriginalAppearence();

    // Make sure to return to default Appearence first
    //this.restoreOriginalAppearence();
    if (targetAppearence instanceof Appearence) {
      targetAppearence.activate();
      this.appearencesMap.forEach((v) => {
        if (v != targetAppearence && v instanceof Appearence) v.deactivate();
      });
    } else {
      //console.log(`Calling Function with Level: ${i}`);
      if (fromBeginning || this.appearenceLevel > targetApNumber) {
        this.appearencesMap.forEach((v, idx) => {
          if (idx < targetApNumber) {
            if (v instanceof Appearence) v.activate();
            else v();
          }
        });
      } else if (this.appearenceLevel < targetApNumber) {
        for (
          let index = 1;
          index < targetApNumber - this.appearenceLevel;
          index++
        ) {
          // if (index + this.appearenceLevel < this.appearencesMap.size - 1)
          //   break;
          if (this.appearencesMap[index + this.appearenceLevel] == undefined)
            continue;
          if (
            this.appearencesMap[index + this.appearenceLevel] instanceof
            Appearence
          )
            (
              this.appearencesMap[index + this.appearenceLevel] as Appearence
            ).activate();
          else {
            (this.appearencesMap[index + this.appearenceLevel] as () => void)();
          }
        }
      }
      targetAppearence();
    }

    this.appearenceLevel = targetApNumber;
    return true;
  }
  getCurrentAppearenceLevel(): number {
    return this.appearenceLevel;
  }
  setAppearence(i: number, ap: Appearence | (() => void)): void {
    if (ap instanceof Appearence) ap.setObject3D(this);
    this.appearencesMap[i] = ap;
  }
  getNumberOfLevels(): number {
    return this.appearencesMap.length;
  }

  getPoI(): Array<THREE.Vector3> {
    const worldPos = new THREE.Vector3();
    this.getWorldPosition(worldPos);
    return [worldPos];
  }

  show() {
    if (this.material instanceof THREE.Material) {
      this.material.visible = true;
      this.material.needsUpdate = true;
    }

    this.children.forEach((childObj) => {
      if (childObj instanceof BaseMesh) {
        childObj.show();
      }
    });
  }

  hide() {
    if (this.material instanceof THREE.Material) {
      this.material.visible = false;
      this.material.needsUpdate = true;
    }

    this.children.forEach((childObj) => {
      if (childObj instanceof BaseMesh) {
        childObj.hide();
      }
    });
  }

  get texturePath(): string | null {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      return this.material.map ? this.material.map.image.src : null;
    }
    return null;
  }

  changeTexture(
    texture: THREE.Texture,
    repeatX: number = 5,
    repeatY: number = repeatX
  ) {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(0, 0);
      texture.repeat.set(repeatX, repeatY);

      this.material.map = texture;
      this.material.blending = THREE.NormalBlending;

      this.material.needsUpdate = true;
    }
  }

  changeColor(color: THREE.Color) {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.defaultColor = color;
      this.material.needsUpdate = true;
    }
  }

  highlight() {
    this.highlighted = true;
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = this.highlightingColor;
    }
  }

  unhighlight() {
    this.highlighted = false;
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = this.defaultColor;
    }
  }

  replayBlinkEffect(duration = 1000): void {
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = new THREE.Color('yellow');
    }

    setTimeout(() => {
      if (
        this.material instanceof THREE.MeshLambertMaterial ||
        this.material instanceof THREE.MeshBasicMaterial ||
        this.material instanceof MeshLineMaterial
      ) {
        if (this.highlighted) {
          this.material.color = this.highlightingColor;
        } else {
          this.material.color = this.defaultColor;
        }
      }
    }, duration);
  }

  /**
   * Alters the color of a given mesh such that it is clear which mesh
   * the mouse points at
   *
   * @param colorShift Specifies color shift: <1 is darker and >1 is lighter
   */
  applyHoverEffect(colorShift = 1.1): void {
    if (this.isHovered) return;

    // Calculate and apply brighter color to material ('hover effect')
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = calculateColorBrightness(
        new THREE.Color(this.material.color),
        colorShift
      );
    }
    this.isHovered = true;
  }

  /**
   * Restores original color of mesh which had a hover effect
   */
  resetHoverEffect(): void {
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      const { highlighted, defaultColor, highlightingColor } = this;

      // Restore normal color (depends on highlighting status)
      this.material.color = highlighted ? highlightingColor : defaultColor;
    }
    this.isHovered = false;
  }

  updateColor() {
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      if (this.highlighted) {
        this.material.color = this.highlightingColor;
      } else {
        this.material.color = this.defaultColor;
      }
      this.material.needsUpdate = true;
    }
  }

  changeOpacity(opacity: number) {
    const isTransparent = opacity < 1;
    if (this.material instanceof THREE.Material) {
      this.material.opacity = opacity;
      this.material.transparent = isTransparent;
      this.material.needsUpdate = true;
    }

    this.children.forEach((childObj) => {
      if (childObj instanceof BaseMesh) {
        childObj.changeOpacity(opacity);
      }
    });
  }

  turnOpaque() {
    this.changeOpacity(1.0);
  }

  turnTransparent(opacity = 0.3) {
    this.changeOpacity(opacity);
  }

  deleteFromParent() {
    if (this.parent) {
      this.parent.remove(this);
    }
  }

  /**
   * Disposes the mesh's geometry and material
   * and does so recursively for the child BaseMeshes
   */
  disposeRecursively() {
    this.traverse((child) => {
      if (child instanceof BaseMesh) {
        if (child.geometry) {
          child.geometry.dispose();
          SemanticZoomManager.instance.remove(child);
        }
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else {
          for (let j = 0; j < child.material.length; j++) {
            const material = child.material[j];
            material.dispose();
          }
        }
      }
    });
  }

  set scaleAll(all: number) {
    this.scale.x += all;
    this.scale.y += all;
    this.scale.z += all;
  }
}
