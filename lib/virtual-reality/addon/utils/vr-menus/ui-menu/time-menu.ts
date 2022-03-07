import VrTimestampService from 'virtual-reality/services/vr-timestamp';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding, { VRControllerThumbpadHorizontalDirection } from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VrRoomSerializer from '../../../services/vr-room-serializer';
import ArrowbuttonItem from '../items/arrowbutton-item';
import TextItem from '../items/text-item';
import TextbuttonItem from '../items/textbutton-item';
import TitleItem from '../items/title-item';
import UiMenu, { UiMenuArgs } from '../ui-menu';

const MS_PER_SECOND = 1000;
const TIMESTAMP_INTERVAL = 10 * MS_PER_SECOND;

export type TimeMenuArgs = UiMenuArgs & {
  roomSerializer: VrRoomSerializer;
  timestampService: VrTimestampService;
};

export default class TimeMenu extends UiMenu {
  private date: Date;

  private selectButton: TextbuttonItem;

  private roomSerializer: VrRoomSerializer;

  private timeBackButton: ArrowbuttonItem;

  private timeForthButton: ArrowbuttonItem;

  private timestampService: VrTimestampService;

  private timestampTextItem: TextItem;

  constructor({ roomSerializer, timestampService, ...args }: TimeMenuArgs) {
    super(args);

    this.roomSerializer = roomSerializer;
    this.timestampService = timestampService;
    this.date = new Date(timestampService.timestamp);

    const title = new TitleItem({
      text: 'Time',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    this.timestampTextItem = new TextItem({
      text: this.date.toLocaleString(),
      color: '#ffffff',
      fontSize: 28,
      alignment: 'center',
      position: { x: 256, y: 140 },
    });
    this.items.push(this.timestampTextItem);

    this.timeBackButton = new ArrowbuttonItem({
      direction: 'left',
      position: { x: 140, y: 200 },
      width: 50,
      height: 60,
      onTriggerPressed: (value) => {
        this.setDateBackBy(value * TIMESTAMP_INTERVAL);
        this.redrawMenu();
      },
    });
    this.items.push(this.timeBackButton);

    this.timeForthButton = new ArrowbuttonItem({
      direction: 'right',
      position: { x: 326, y: 200 },
      width: 50,
      height: 60,
      onTriggerPressed: (value) => {
        this.setDateForthBy(value * TIMESTAMP_INTERVAL);
        this.redrawMenu();
      },
    });
    this.items.push(this.timeForthButton);

    this.selectButton = new TextbuttonItem({
      text: 'Select',
      position: { x: 100, y: 320 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () => {
        this.applySelectedTimestamp();
        this.closeMenu();
      },
    });
    this.items.push(this.selectButton);

    this.redrawMenu();
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);
    const nextDate = this.date.toLocaleString();
    if (nextDate !== this.timestampTextItem.text) {
      this.timestampTextItem.text = nextDate;
      this.redrawMenu();
    }
  }

  setDateBackBy(timeInMilliseconds: number) {
    this.date.setTime(this.date.getTime() - timeInMilliseconds);
  }

  setDateForthBy(timeInMilliseconds: number) {
    this.date.setTime(this.date.getTime() + timeInMilliseconds);
  }

  private applySelectedTimestamp() {
    this.roomSerializer.preserveRoom(
      () => this.timestampService.updateTimestamp(this.date.getTime()),
      {
        restoreLandscapeData: false,
      },
    );
  }

  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelLeft: 'Earlier', labelRight: 'Later' },
      {
        onThumbpadDown: (_, axes) => {
          switch (VRControllerThumbpadBinding.getHorizontalDirection(axes)) {
            case VRControllerThumbpadHorizontalDirection.LEFT:
              this.setDateBackBy(TIMESTAMP_INTERVAL);
              this.timeBackButton.enableHoverEffectByButton();
              break;
            case VRControllerThumbpadHorizontalDirection.RIGHT:
              this.setDateForthBy(TIMESTAMP_INTERVAL);
              this.timeForthButton.enableHoverEffectByButton();
              break;
            default:
              break;
          }
          this.redrawMenu();
        },
        onThumbpadUp: () => {
          this.timeForthButton.resetHoverEffectByButton();
          this.timeBackButton.resetHoverEffectByButton();
          this.redrawMenu();
        },
      },
    );
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('Select', {
      onButtonDown: () => {
        this.selectButton.enableHoverEffectByButton();
        this.redrawMenu();
      },
      onButtonUp: () => {
        this.applySelectedTimestamp();
        this.closeMenu();
      },
    });
  }
}