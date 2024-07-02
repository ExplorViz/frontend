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
import { inject as service } from '@ember/service';
import TimestampService, {
  NEW_SELECTED_TIMESTAMP_EVENT,
} from 'explorviz-frontend/services/timestamp';

interface Args {
  readonly landscapeData: LandscapeData;
  triggerRenderingForGivenLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class TraceFiltering extends Component<Args> {
  @service('timestamp')
  timestampService!: TimestampService;

  @tracked
  numRemainingTracesAfterFilteredByDuration = 0;

  @tracked
  numRemainingTracesAfterFilteredByStarttime = 0;

  @tracked
  initialLandscapeData!: LandscapeData;

  private selectedMinDuration: number = 0;
  private selectedMinStartTimestamp: number = 0;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.resetState();

    this.timestampService.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.resetState
    );
  }

  //#region JS getters

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

  //#endregion JS getters

  //#region template actions

  @action
  updateDuration(newMinDuration: number) {
    this.selectedMinDuration = newMinDuration;
    this.triggerRenderingForGivenLandscapeData();
  }

  @action
  updateStartTimestamp(newMinStartTimestamp: number) {
    this.selectedMinStartTimestamp = newMinStartTimestamp;
    this.triggerRenderingForGivenLandscapeData();
  }

  //#endregion template actions

  private resetState() {
    // reset state, since new timestamp has been loaded

    this.initialLandscapeData = this.args.landscapeData;

    this.numRemainingTracesAfterFilteredByDuration =
      this.args.landscapeData.dynamicLandscapeData.length;

    this.numRemainingTracesAfterFilteredByStarttime =
      this.args.landscapeData.dynamicLandscapeData.length;

    this.selectedMinDuration = 0;
    this.selectedMinStartTimestamp = 0;
  }

  private triggerRenderingForGivenLandscapeData() {
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

    this.args.triggerRenderingForGivenLandscapeData(
      this.args.landscapeData.structureLandscapeData,
      newTraces
    );
  }

  willDestroy(): void {
    this.args.triggerRenderingForGivenLandscapeData(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
  }
}
