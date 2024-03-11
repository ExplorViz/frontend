import Component from '@glimmer/component';
import {
  DynamicLandscapeData,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { tracked } from '@glimmer/tracking';
import { getHashCodeToClassMap } from 'explorviz-frontend/utils/landscape-structure-helpers';

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
  numRemainingTracesAfterFilteredByDuration =
    this.args.landscapeData.dynamicLandscapeData.length;

  @tracked
  numRemainingTracesAfterFilteredByStarttime =
    this.args.landscapeData.dynamicLandscapeData.length;

  private initialLandscapeData: LandscapeData;

  private selectedMinDuration: number = 0;
  private selectedMinStartTimestamp: number = 0;

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.initialLandscapeData = this.args.landscapeData;
  }

  get traceCount() {
    const tracesThatAreRendered: Trace[] = structuredClone(
      this.args.landscapeData.dynamicLandscapeData
    );

    const hashCodeClassMap = getHashCodeToClassMap(
      this.args.landscapeData.structureLandscapeData
    );

    for (let i = tracesThatAreRendered.length - 1; i >= 0; i--) {
      for (const span of tracesThatAreRendered[i].spanList) {
        if (!hashCodeClassMap.get(span.methodHash)) {
          // single span of trace is missing in structure data, then skip complete trace
          tracesThatAreRendered.splice(i, 1);
          break;
        }
      }
    }

    return tracesThatAreRendered.length;
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
          numFilter++;
          return true;
        }

        return false;
      }
    );
    this.numRemainingTracesAfterFilteredByStarttime = numFilter;
    numFilter = 0;

    // hide all traces that have a strict lower duration than selected
    newTraces = newTraces.filter((t) => {
      if (t.duration >= this.selectedMinDuration!) {
        numFilter++;
        return true;
      }

      return false;
    });
    this.numRemainingTracesAfterFilteredByDuration = numFilter;
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
