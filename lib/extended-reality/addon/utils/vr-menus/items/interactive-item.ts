import Item, { ItemArgs } from './item';

export type InteractiveItemArgs = ItemArgs & {
  onHover?: () => void;
  onTriggerDown?: () => void;
  onTriggerPressed?: (value: number) => void;
};

export default abstract class InteractiveItem extends Item {
  private hoveredByButton = false;

  private hoveredByRay = false;

  readonly onHover: (() => void) | undefined = undefined;

  readonly onTriggerDown: (() => void) | undefined = undefined;

  readonly onTriggerPressed: ((value: number) => void) | undefined = undefined;

  constructor({
    onHover,
    onTriggerDown,
    onTriggerPressed,
    ...args
  }: InteractiveItemArgs) {
    super(args);
    this.onHover = onHover;
    this.onTriggerDown = onTriggerDown;
    this.onTriggerPressed = onTriggerPressed;
  }

  get isHovered() {
    return this.hoveredByButton || this.hoveredByRay;
  }

  enableHoverEffect() {
    this.hoveredByRay = true;
  }

  resetHoverEffect() {
    this.hoveredByRay = false;
  }

  enableHoverEffectByButton() {
    this.hoveredByButton = true;
  }

  resetHoverEffectByButton() {
    this.hoveredByButton = false;
  }
}
