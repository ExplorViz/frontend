import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

interface Args {
  readonly dynamicData: DynamicLandscapeData;
}

export default class ButtonSetting extends Component<Args> {
  @tracked
  currentValue: number = this.minAndMaxStartTimestamp.mid;

  @tracked
  maxValue: number = this.minAndMaxStartTimestamp.max;

  @tracked
  minValue: number = this.minAndMaxStartTimestamp.min;

  get minAndMaxStartTimestamp() {
    let min = Number.MAX_VALUE;
    let max = -1;

    for (const trace of this.args.dynamicData) {
      min = trace.startTime <= min ? trace.startTime : min;
      max = trace.startTime >= max ? trace.startTime : max;
    }

    return { min: min, max: max, mid: Math.round((min + max) / 2) };
  }

  @action
  onChange(event: any) {
    this.currentValue = event.target.value;

    // hide all traces that start the selected timestamp
    const tracesToFilter = this.args.dynamicData.filter(
      (t) => t.startTime > this.currentValue
    );

    console.log('length', tracesToFilter.length);
  }
}
