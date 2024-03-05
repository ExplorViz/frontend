import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly visualizationPaused: boolean;
  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceStartFiltering extends Component<Args> {
  @tracked
  selected: number | null = null;

  private min: number = Number.MAX_VALUE;
  private max: number = -1;

  private initialLandscapeData: LandscapeData | null = null;

  get traceCount() {
    return this.args.landscapeData.dynamicLandscapeData.length;
  }

  get timestamps() {
    if (!this.args.visualizationPaused) {
      this.initialLandscapeData = null;
      this.selected = null;
      const traces = this.args.landscapeData.dynamicLandscapeData;

      for (const trace of traces) {
        this.min = trace.startTime <= this.min ? trace.startTime : this.min;
        this.max = trace.startTime >= this.max ? trace.startTime : this.max;
      }

      console.log('timestamps', this.min, this.max);
    }

    let selected = this.min;

    if (this.args.visualizationPaused && this.selected) {
      selected = this.selected;
    }

    return { min: this.min, max: this.max, selected: selected };
  }

  formatTimestampToDate(timestamp: number) {
    return new Date(timestamp);
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
    console.log('onchange');
    if (!this.initialLandscapeData) {
      this.initialLandscapeData = this.args.landscapeData;
    }

    this.args.pauseVisualizationUpdating();

    this.selected = Number(event.target.value);

    // hide all traces that start the selected timestamp
    const newTraces = this.initialLandscapeData.dynamicLandscapeData.filter(
      (t) => t.startTime >= this.selected!
    );

    this.args.updateLandscape(
      this.args.landscapeData.structureLandscapeData,
      newTraces
    );
  }
}