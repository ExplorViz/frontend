import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { inject as service } from '@ember/service';
import TimestampService, {
  NEW_SELECTED_TIMESTAMP_EVENT,
} from 'explorviz-frontend/services/timestamp';

interface Args {
  readonly traces: DynamicLandscapeData;
  updateDuration(newMinDuration: number): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceDuration extends Component<Args> {
  @service('timestamp')
  timestampService!: TimestampService;

  @tracked
  selected: number | null = null;

  private min: number = Number.MAX_VALUE;
  private max: number = -1;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.timestampService.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.onTimestampUpdate
    );
  }

  //#region JS getters

  get durations() {
    if (!this.selected) {
      const traces = this.args.traces;

      for (const trace of traces) {
        this.min = trace.duration <= this.min ? trace.duration : this.min;
        this.max = trace.duration >= this.max ? trace.duration : this.max;
      }
    }

    let selected = this.min;
    if (this.selected) {
      selected = this.selected;
    }

    return { min: this.min, max: this.max, selected: selected };
  }

  //#endregion JS getters

  //#region template actions

  @action
  onInput(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.args.pauseVisualizationUpdating();
      this.selected = Number(newValue);
    }
  }

  @action
  onChange(event: any) {
    this.selected = Number(event.target.value);
    this.args.updateDuration(this.selected);
  }

  //#endregion template actions

  private onTimestampUpdate() {
    // reset state, since new timestamp has been loaded
    this.selected = null;
    this.min = Number.MAX_VALUE;
    this.max = -1;
  }

  willDestroy(): void {
    this.timestampService.off(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.onTimestampUpdate
    );
  }
}
