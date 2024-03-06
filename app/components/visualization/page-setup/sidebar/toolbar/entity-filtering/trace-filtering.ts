import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { tracked } from '@glimmer/tracking';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly visualizationPaused: boolean;
  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceFiltering extends Component<Args> {
  @tracked
  numFilteredTracesByDuration = 0;

  @tracked
  numFilteredTracesByStarttime = 0;

  private initialLandscapeData: LandscapeData;

  private selectedMinDuration: number = 0;
  private selectedMinStartTimestamp: number = 0;

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.initialLandscapeData = this.args.landscapeData;
  }

  get traceCount() {
    return this.args.landscapeData.dynamicLandscapeData.length;
  }

  @action
  updateDuration(newMinDuration: number) {
    this.selectedMinDuration = newMinDuration;
    this.updateLandscape();
  }

  @action
  updateStartTimestamp(newMinStartTimestamp: number) {
    this.selectedMinStartTimestamp = newMinStartTimestamp;
    this.updateLandscape();
  }

  private updateLandscape() {
    let numFilter = 0;

    // hide all traces that begin before selected timestamp
    let newTraces = this.initialLandscapeData.dynamicLandscapeData.filter(
      (t) => {
        if (t.startTime >= this.selectedMinStartTimestamp!) {
          return true;
        }
        numFilter++;
        return false;
      }
    );
    this.numFilteredTracesByStarttime = numFilter;
    numFilter = 0;

    // hide all traces that have a strict lower duration than selected
    newTraces = newTraces.filter((t) => {
      if (t.duration >= this.selectedMinDuration!) {
        return true;
      }
      numFilter++;
      return false;
    });
    this.numFilteredTracesByDuration = numFilter;
    numFilter = 0;

    this.args.updateLandscape(
      this.args.landscapeData.structureLandscapeData,
      newTraces
    );
  }

  willDestroy(): void {
    this.args.updateLandscape(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
  }
}
