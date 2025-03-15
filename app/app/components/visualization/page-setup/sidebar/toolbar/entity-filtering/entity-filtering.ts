import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import { inject as service } from '@ember/service';
import { useTimestampStore, NEW_SELECTED_TIMESTAMP_EVENT } from 'react-lib/src/stores/timestamp';
import eventEmitter from 'react-lib/src/utils/event-emitter';

interface Args {
  readonly landscapeData: LandscapeData;
  triggerRenderingForGivenLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class EntityFiltering extends Component<Args> {
  private initialLandscapeData!: LandscapeData;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.resetState();

    eventEmitter.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this.resetState
    );
  }

  //#region template actions

  @action
  resetToInit() {
    this.args.triggerRenderingForGivenLandscapeData(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
    useTimestampStore.getState().updateSelectedTimestamp(
      useTimestampStore.getState().timestamp
    );
  }

  //#endregion template actions

  private resetState() {
    // reset state, since new timestamp has been loaded
    this.initialLandscapeData = this.args.landscapeData;
  }

  willDestroy(): void {
    this.args.triggerRenderingForGivenLandscapeData(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
    eventEmitter.off(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this.resetState
    );
  }
}
