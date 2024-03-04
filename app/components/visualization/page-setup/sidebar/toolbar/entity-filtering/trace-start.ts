import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';

interface Args {
  readonly landscapeData: LandscapeData;
  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceStartFiltering extends Component<Args> {
  @tracked
  currentValue: number = this.minAndMaxAndMidStartTimestamp.mid;

  private initialLandscapeData: LandscapeData | null = null;

  get traceCount() {
    return this.args.landscapeData.dynamicLandscapeData.length;
  }

  get minAndMaxAndMidStartTimestamp() {
    console.log('min and max');
    let min = Number.MAX_VALUE;
    let max = -1;

    const traces =
      this.initialLandscapeData?.dynamicLandscapeData ??
      this.args.landscapeData.dynamicLandscapeData;

    for (const trace of traces) {
      min = trace.startTime <= min ? trace.startTime : min;
      max = trace.startTime >= max ? trace.startTime : max;
    }

    return { min: min, max: max, mid: Math.round((min + max) / 2) };
  }

  formatTimestampToDate(timestamp: number) {
    return new Date(timestamp);
  }

  @action
  onChange(event: any) {
    if (!this.initialLandscapeData) {
      this.initialLandscapeData = this.args.landscapeData;
    }

    this.args.pauseVisualizationUpdating();

    this.currentValue = Number(event.target.value);

    // hide all traces that start the selected timestamp
    const tracesToFilter =
      this.initialLandscapeData.dynamicLandscapeData.filter(
        (t) => t.startTime > this.currentValue
      );

    this.args.updateLandscape(
      this.args.landscapeData.structureLandscapeData,
      tracesToFilter
    );

    console.log('length', tracesToFilter.length);
  }
}
