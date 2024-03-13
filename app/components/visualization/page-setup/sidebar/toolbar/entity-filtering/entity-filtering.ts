import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { inject as service } from '@ember/service';
import TimestampService, {
  NEW_SELECTED_TIMESTAMP_EVENT,
} from 'explorviz-frontend/services/timestamp';

interface Args {
  readonly landscapeData: LandscapeData;
  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class EntityFiltering extends Component<Args> {
  @service('timestamp')
  timestampService!: TimestampService;

  private initialLandscapeData!: LandscapeData;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.resetState();

    this.timestampService.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.resetState
    );
  }

  //#region template actions

  @action
  resetToInit() {
    this.args.updateLandscape(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
    this.timestampService.updateSelectedTimestamp(
      this.timestampService.timestamp
    );
  }

  //#endregion template actions

  private resetState() {
    // reset state, since new timestamp has been loaded
    this.initialLandscapeData = this.args.landscapeData;
  }

  willDestroy(): void {
    this.args.updateLandscape(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
    this.timestampService.off(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.resetState
    );
  }
}
