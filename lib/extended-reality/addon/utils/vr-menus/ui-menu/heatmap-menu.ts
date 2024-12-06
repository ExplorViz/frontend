import { action } from '@ember/object';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import VRControllerButtonBinding from '../../vr-controller/vr-controller-button-binding';
import { DetachableMenu } from '../detachable-menu';
import RectangleItem from '../items/rectangle-item';
import TextItem from '../items/text-item';
import UiMenu, { DEFAULT_MENU_RESOLUTION, UiMenuArgs } from '../ui-menu';
import { EntityType } from 'collaboration/utils/web-socket-messages/types/entity-type';

export type HeatmapMenuArgs = UiMenuArgs & {
  heatmapConfiguration: HeatmapConfiguration;
};

export default class HeatmapMenu extends UiMenu implements DetachableMenu {
  private heatmapConfiguration: HeatmapConfiguration;

  private entryItems: Map<string, TextItem>;

  constructor({
    resolution = {
      width: 1.5 * DEFAULT_MENU_RESOLUTION,
      height: DEFAULT_MENU_RESOLUTION,
    },
    heatmapConfiguration,
    ...args
  }: HeatmapMenuArgs) {
    super({ resolution, ...args });
    this.heatmapConfiguration = heatmapConfiguration;
    this.entryItems = new Map<string, TextItem>();
  }

  getDetachId(): string {
    return 'heatmap-menu';
  }

  getEntityType(): EntityType {
    return 'heatmap-menu';
  }

  onCloseMenu() {
    super.onCloseMenu();
    this.heatmapConfiguration.deactivate();
  }

  opened = false;

  onOpenMenu() {
    super.onOpenMenu();
    if (this.opened) {
      return;
    }
    this.opened = true;

    this.heatmapConfiguration.activate();

    const content = this.getContent();
    const titleBackground = new RectangleItem({
      position: { x: 0, y: 0 },
      width: this.resolution.width,
      height: 66,
      color: '#777777',
    });
    this.items.push(titleBackground);

    const title = new TextItem({
      text: content.title,
      color: '#ffffff',
      fontSize: 30,
      alignment: 'center',
      position: { x: this.resolution.width / 2, y: 20 },
    });
    this.items.push(title);

    let offset = 100;

    content.entries.forEach(({ key }) => {
      const keyTextItem = new TextItem({
        text: key,
        color: '#ffffff',
        fontSize: 26,
        position: { x: 20, y: offset },
      });
      this.items.push(keyTextItem);

      const valueTextItem = new TextItem({
        text: '',
        color: '#ffffff',
        fontSize: 26,
        alignment: 'right',
        position: { x: 768 - 20, y: offset },
      });
      this.items.push(valueTextItem);
      this.entryItems.set(key, valueTextItem);

      offset += 70;
    });

    // this.redrawMenu();
  }

  getContent() {
    const min = this.heatmapConfiguration.selectedMetric?.min || '0';
    const max = this.heatmapConfiguration.selectedMetric?.max || '0';
    return {
      title: 'Heatmap',
      entries: [
        {
          key: 'Metric',
          value: this.heatmapConfiguration.selectedMetricName,
        },
        {
          key: 'Min',
          value: min,
        },
        {
          key: 'Max',
          value: max,
        },
      ],
    };
  }

  @action
  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    const content = this.getContent();
    if (content) {
      content.entries.forEach(({ key, value }) => {
        const item = this.entryItems.get(key);
        if (item) {
          item.setText(String(value));
        }
      });
      this.redrawMenu();
    } else {
      this.closeMenu();
    }
  }

  makeTriggerButtonBinding() {
    return new VRControllerButtonBinding('Detach', {
      onButtonDown: () => {
        this.detachMenu();
      },
    });
  }
}
