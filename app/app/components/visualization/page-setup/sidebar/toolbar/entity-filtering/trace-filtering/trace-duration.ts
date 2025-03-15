import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'react-lib/src/stores/timestamp';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import eventEmitter from 'react-lib/src/utils/event-emitter';

interface Args {
  readonly traces: DynamicLandscapeData;
  updateDuration(newMinDuration: number): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceDuration extends Component<Args> {
  helpTooltipComponent = HelpTooltip;

  @tracked
  selected: number | null = null;

  private min: number = Number.MAX_VALUE;
  private max: number = -1;

  constructor(owner: any, args: Args) {
    super(owner, args);

    eventEmitter.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
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
    eventEmitter.off(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this.onTimestampUpdate
    );
  }
}
