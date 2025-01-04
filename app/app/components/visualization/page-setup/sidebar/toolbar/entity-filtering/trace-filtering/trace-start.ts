import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { inject as service } from '@ember/service';
import TimestampService, {
  NEW_SELECTED_TIMESTAMP_EVENT,
} from 'explorviz-frontend/services/timestamp';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

interface Args {
  readonly traces: DynamicLandscapeData;
  updateStartTimestamp(newMinStartTimestamp: number): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceStartFiltering extends Component<Args> {
  helpTooltipComponent = HelpTooltip;

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

  get timestamps() {
    if (!this.selected) {
      const traces = this.args.traces;

      for (const trace of traces) {
        this.min = trace.startTime <= this.min ? trace.startTime : this.min;
        this.max = trace.startTime >= this.max ? trace.startTime : this.max;
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

  formatTimestampToDate(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString();
  }

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
    this.args.updateStartTimestamp(this.selected);
  }

  //#endregion template

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
