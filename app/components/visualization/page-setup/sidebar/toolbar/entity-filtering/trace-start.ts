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

  private initialLandscapeData: LandscapeData | null = null;

  get traceCount() {
    console.log('tracecount');
    return this.args.landscapeData.dynamicLandscapeData.length;
  }

  get timestamps() {
    let min = Number.MAX_VALUE;
    let max = -1;

    let traces = [];

    if (this.args.visualizationPaused) {
      traces =
        this.initialLandscapeData?.dynamicLandscapeData ??
        this.args.landscapeData.dynamicLandscapeData;
    } else {
      this.initialLandscapeData = null;
      this.selected = null;
      traces = this.args.landscapeData.dynamicLandscapeData;
    }

    for (const trace of traces) {
      min = trace.startTime <= min ? trace.startTime : min;
      max = trace.startTime >= max ? trace.startTime : max;
    }

    let selected = min;

    if (this.args.visualizationPaused && this.selected) {
      selected = this.selected;
    }
    console.log('timestamps', min, max, selected);

    return { min: min, max: max, selected: selected };
  }

  formatTimestampToDate(timestamp: number) {
    console.log('format');
    return new Date(timestamp);
  }

  @action
  onChange(event: any) {
    console.log('onChange');
    if (!this.initialLandscapeData) {
      this.initialLandscapeData = this.args.landscapeData;
    }

    this.args.pauseVisualizationUpdating();

    this.selected = Number(event.target.value);

    // hide all traces that start the selected timestamp
    const tracesToFilter =
      this.initialLandscapeData.dynamicLandscapeData.filter(
        (t) => t.startTime > this.selected!
      );

    this.args.updateLandscape(
      this.args.landscapeData.structureLandscapeData,
      tracesToFilter
    );
  }
}
