// @ts-ignore
import {
  IntersectableObject,
} from '../interfaces/intersectable-object';
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';
import VRController from 'virtual-reality/utils/vr-controller';
import SearchMenu from 'virtual-reality/utils/vr-menus/search-menu';

export type KeyboardMeshArgs = ThreeMeshUI.KeyboardOptions & {
  userText: ThreeMeshUI.Text;
};

const objsToTest = [];

const colors = {
  keyboardBack: 0x858585,
  panelBack: 0x262626,
  button: 0x363636,
  hovered: 0x1c1c1c,
  selected: 0xffffff,//0x109c5d,
};

export default class KeyboardMesh
  extends ThreeMeshUI.Keyboard
  implements IntersectableObject
{
  userText: ThreeMeshUI.Text;

  constructor({ userText, ...options }: KeyboardMeshArgs) {
    super(options);
    this.userText = userText;
    this.setUpKeyStates();
  }

  setUpKeyStates() {
    this.keys.forEach((key) => {
      objsToTest.push(key);

      key.setupState({
        state: 'idle',
        attributes: {
          offset: 0,
          backgroundColor: new THREE.Color(colors.button),
          backgroundOpacity: 1,
        },
      });

      key.setupState({
        state: 'hovered',
        attributes: {
          offset: 0,
          backgroundColor: new THREE.Color(colors.hovered),
          backgroundOpacity: 1,
        },
      });

      key.setupState({
        state: 'selected',
        attributes: {
          offset: -0.009,
          backgroundColor: new THREE.Color(colors.selected),
          backgroundOpacity: 1,
        },
        // triggered when the user clicked on a keyboard's key
        onSet: () => {
          // if the key have a command (eg: 'backspace', 'switch', 'enter'...)
          // special actions are taken
          if (key.info.command) {
            switch (key.info.command) {
              // switch between panels
              case 'switch':
                this.setNextPanel();
                break;

              // switch between panel charsets (eg: russian/english)
              case 'switch-set':
                this.setNextCharset();
                break;

              case 'enter':
                //this.userText.set({ content: this.userText.content + '\n' }); // not needed since search is interactive
                break;

              case 'space':
                this.userText.set({ content: this.userText.content + ' ' });
                break;

              case 'backspace':
                if (!this.userText.content.length) break;
                this.userText.set({
                  content:
                    this.userText.content.substring(
                      0,
                      this.userText.content.length - 1
                    ) || '',
                });
                break;

              case 'shift':
                this.toggleCase();
                break;
            }

            // print a glyph, if any
          } else if (key.info.input) {
            this.userText.set({
              content: this.userText.content + key.info.input,
            });
          }
          if(this.parent instanceof SearchMenu){
            this.parent.isNewInput = true;
          }
        },
      });
    });
  }

  pressButton(raycaster: THREE.Raycaster) {
    const intersect = this.raycast(raycaster);

    if (intersect && intersect.object.isUI) {
      if (intersect.object.currentState === 'hovered') {
        // Component.setState internally call component.set with the options you defined in component.setupState
        if (intersect.object.states['selected'])
          intersect.object.setState('selected');
      }
    }
  }

  hoverOrUnhoverButton(raycaster: THREE.Raycaster) {
    // Find closest intersecting object
    const intersect = this.raycast(raycaster);

    if (intersect && intersect.object.isUI) {
      // Component.setState internally call component.set with the options you defined in component.setupState
      if (intersect.object.states['hovered'])
        intersect.object.setState('hovered');
    }

    // Update non-targeted buttons state

    objsToTest.forEach((obj) => {
      if ((!intersect || obj !== intersect.object) && obj.isUI) {
        // Component.setState internally call component.set with the options you defined in component.setupState
        if (obj.states['idle']) obj.setState('idle');
      }
    });
  }

  raycast(raycaster: THREE.Raycaster) {
    return objsToTest.reduce((closestIntersection, obj) => {
      if (!this.getObjectById(obj.id)) {
        return closestIntersection;
      }

      const intersection = raycaster.intersectObject(obj, true);

      // if intersection is an empty array, we skip
      if (!intersection[0]) return closestIntersection;

      // if this intersection is closer than any previous intersection, we keep it
      if (
        !closestIntersection ||
        intersection[0].distance < closestIntersection.distance
      ) {
        // Make sure to return the UI object, and not one of its children (text, frame...)
        intersection[0].object = obj;

        return intersection[0];
      }

      return closestIntersection;
    }, null);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  applyHover(controller: VRController | null) {
    const raycaster = controller?.raycaster;
    if (raycaster) this.hoverOrUnhoverButton(raycaster);
  }

  resetHover(controller: VRController | null) {
    const raycaster = controller?.raycaster;
    if (raycaster) this.hoverOrUnhoverButton(raycaster);
  }

  triggerDown(controller: VRController | null) {
    const raycaster = controller?.raycaster;
    if (raycaster) this.pressButton(raycaster);
  }
}
