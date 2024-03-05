import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';

interface Args {
  readonly traces: DynamicLandscapeData;
  readonly visualizationPaused: boolean;
  updateDuration(newMinDuration: number): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceDuration extends Component<Args> {
  @tracked
  selected: number | null = null;

  private min: number = Number.MAX_VALUE;
  private max: number = -1;

  private initialTraces: DynamicLandscapeData | null = null;

  get traceCount() {
    return this.args.traces.length;
  }

  get timestamps() {
    if (!this.args.visualizationPaused) {
      this.initialTraces = null;
      this.selected = null;
      const traces = this.args.traces;

      for (const trace of traces) {
        this.min = trace.duration <= this.min ? trace.duration : this.min;
        this.max = trace.duration >= this.max ? trace.duration : this.max;
      }

      console.log('timestamps', this.min, this.max);
    }

    let selected = this.min;

    if (this.args.visualizationPaused && this.selected) {
      selected = this.selected;
    }

    return { min: this.min, max: this.max, selected: selected };
  }

  @action
  onInput(_: any, htmlInputElement: any) {
    console.log('onInput');
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.args.pauseVisualizationUpdating();
      this.selected = Number(newValue);
    }
  }

  @action
  onChange(event: any) {
    if (!this.initialTraces) {
      this.initialTraces = this.args.traces;
    }

    this.args.pauseVisualizationUpdating();

    this.selected = Number(event.target.value);

    this.args.updateDuration(this.selected);
  }
}
