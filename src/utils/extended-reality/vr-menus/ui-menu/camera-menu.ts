import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import VRControllerButtonBinding from 'explorviz-frontend/src/utils/extended-reality/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding from 'explorviz-frontend/src/utils/extended-reality/vr-controller/vr-controller-thumbpad-binding';
import ArrowbuttonItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/arrowbutton-item';
import TextItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/text-item';
import TextbuttonItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/textbutton-item';
import TitleItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/title-item';
import UiMenu, {
  UiMenuArgs,
} from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';

/**
 * The maximum change of the camera's height per frame when the trigger is fully pressed.
 */
const MAX_TRANSLATE_SPEED = 0.02;

export default class CameraMenu extends UiMenu {
  private resetButton: TextbuttonItem;

  private heightTextItem: TextItem;

  private heightUpButton: ArrowbuttonItem;

  private heightDownButton: ArrowbuttonItem;

  constructor({ ...args }: UiMenuArgs) {
    super(args);

    const title = new TitleItem({
      text: 'Camera',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    this.heightTextItem = new TextItem({
      text: useLocalUserStore.getState().getCameraHeight().toFixed(2),
      color: '#ffffff',
      fontSize: 28,
      alignment: 'center',
      position: { x: 256, y: 202 },
    });
    this.items.push(this.heightTextItem);

    this.resetButton = new TextbuttonItem({
      text: 'Reset',
      position: { x: 420, y: 13 },
      width: 65,
      height: 40,
      fontSize: 22,
      buttonColor: '#aaaaaa',
      textColor: '#ffffff',
      hoverColor: '#dc3b00',
      onTriggerDown: () => this.resetCamera(),
    });
    this.items.push(this.resetButton);

    this.heightDownButton = new ArrowbuttonItem({
      direction: 'down',
      position: { x: 100, y: 182 },
      width: 50,
      height: 60,
      onTriggerPressed: (value) => this.heightDown(value),
    });
    this.items.push(this.heightDownButton);

    this.heightUpButton = new ArrowbuttonItem({
      direction: 'up',
      position: { x: 366, y: 182 },
      width: 50,
      height: 60,
      onTriggerPressed: (value) => this.heightUp(value),
    });
    this.items.push(this.heightUpButton);

    this.redrawMenu();
  }

  private translateCamera(deltaHeight: number) {
    useLocalUserStore
      .getState()
      .setCameraHeight(
        useLocalUserStore.getState().getCameraHeight() + deltaHeight
      );
    this.redrawMenu();
  }

  private resetCamera() {
    useLocalUserStore.getState().setCameraHeight(0);
    this.redrawMenu();
  }

  private heightDown(value: number) {
    this.translateCamera(-value * MAX_TRANSLATE_SPEED);
  }

  private heightUp(value: number) {
    this.translateCamera(value * MAX_TRANSLATE_SPEED);
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('Reset', {
      onButtonDown: () => {
        this.resetButton.enableHoverEffectByButton();
        this.resetCamera();
      },
      onButtonUp: () => {
        this.resetButton.resetHoverEffectByButton();
        this.redrawMenu();
      },
    });
  }

  onThumbpadPress(_controller: VRController, axes: number[]) {
    this.heightDownButton.resetHoverEffectByButton();
    this.heightUpButton.resetHoverEffectByButton();
    if (axes[1] > 0) {
      this.heightUpButton.enableHoverEffectByButton();
      this.heightUp(axes[1]);
    } else {
      this.heightDownButton.enableHoverEffectByButton();
      this.heightDown(-axes[1]);
    }
  }

  onUpdateMenu(delta: number) {
    const text = useLocalUserStore.getState().getCameraHeight().toFixed(2);
    if (text !== this.heightTextItem.text) {
      this.heightTextItem.text = text;
      this.redrawMenu();
    }

    super.onUpdateMenu(delta);
  }

  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelUp: 'Up', labelDown: 'Down' },
      {
        onThumbpadPress: (controller, axes) =>
          this.onThumbpadPress(controller, axes),
        onThumbpadUp: () => {
          this.heightDownButton.resetHoverEffectByButton();
          this.heightUpButton.resetHoverEffectByButton();
          this.redrawMenu();
        },
      }
    );
  }
}
