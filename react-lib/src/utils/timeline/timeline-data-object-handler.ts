// import { tracked } from '@glimmer/tracking';
import { Timestamp } from 'react-lib/src/utils/landscape-schemes/timestamp';
// import { inject as service } from '@ember/service';
// import { setOwner } from '@ember/application';
// import RenderingService from 'explorviz-frontend/services/rendering-service';
import { useRenderingServiceStore } from 'react-lib/src/stores/rendering-service';
// import { action } from '@ember/object';
// import debugLogger from 'ember-debug-logger';

export type TimelineDataForCommit = {
  timestamps: Timestamp[];
  highlightedMarkerColor: 'blue' | 'red';
  selectedTimestamps: Timestamp[];
  applicationNameAndBranchNameToColorMap: Map<string, string>;
};

export type TimelineDataObject = Map<
  string, // commit
  TimelineDataForCommit
>;

const SELECTED_COLOR = 'red';
const UNSELECTED_COLOR = 'blue';

export default class TimelineDataObjectHandler {
  // private readonly debug = debugLogger('TimelineDataObjectHandler');

  // #region Services

  // @service('rendering-service')
  // renderingService!: RenderingService;

  // #endregion

  // #region Properties

  // @tracked
  timelineDataObject: TimelineDataObject = new Map();

  // #endregion

  // constructor(owner: any) {
  //   // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
  //   setOwner(this, owner);
  // }

  // #region Timeline Click Handler

  // @action
  async timelineClicked(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) {
    for (const [
      commitId,
      selectedTimestamps,
    ] of commitToSelectedTimestampMap.entries()) {
      const timelineData = this.getTimelineDataForCommit(commitId);

      if (
        timelineData &&
        timelineData.selectedTimestamps.length > 0 &&
        selectedTimestamps === timelineData.selectedTimestamps
      ) {
        return;
      }
    }

    useRenderingServiceStore.getState().pauseVisualizationUpdating(true);

    if (useRenderingServiceStore.getState().analysisMode === 'evolution') {
      useRenderingServiceStore.getState().userInitiatedStaticDynamicCombination =
        true;
    }

    useRenderingServiceStore
      .getState()
      .triggerRenderingForGivenTimestamps(commitToSelectedTimestampMap);
  }

  // #endregion

  // #region Timeline Setter

  updateHighlightedMarkerColorForSelectedCommits(areCommitsSelected: boolean) {
    this.timelineDataObject.forEach((dataForCommit) => {
      dataForCommit.highlightedMarkerColor = areCommitsSelected
        ? SELECTED_COLOR
        : UNSELECTED_COLOR;
    });
  }

  updateTimestampsForCommit(timestamps: Timestamp[], commitId: string) {
    const timelineDataForCommit =
      this.timelineDataObject.get(commitId) ??
      this.createEmptyTimelineDataForCommitObj();

    timelineDataForCommit.timestamps = timestamps;
    // reset, since it might be new
    this.setTimelineDataForCommit(timelineDataForCommit, commitId);
  }

  updateSelectedTimestampsForCommit(timestamps: Timestamp[], commitId: string) {
    const timelineDataForCommit = this.timelineDataObject.get(commitId);
    if (timelineDataForCommit) {
      timelineDataForCommit.selectedTimestamps = timestamps;
    }
  }

  updateHighlightedMarkerColorForCommit(
    highlightedMarkerColor: 'blue' | 'red',
    commitId: string
  ) {
    const timelineDataForCommit = this.timelineDataObject.get(commitId);
    if (timelineDataForCommit) {
      timelineDataForCommit.highlightedMarkerColor = highlightedMarkerColor;
    }
  }

  // #endregion

  // #region Timeline Getter

  getAllSelectedTimestampsOfAllCommits() {
    const currentlySelectedTimestamps: Timestamp[] = [];

    this.timelineDataObject.forEach((timelineData) => {
      currentlySelectedTimestamps.push(...timelineData.selectedTimestamps);
    });
    return currentlySelectedTimestamps;
  }

  // #region Helper functions

  private getTimelineDataForCommit(commitId: string) {
    return this.timelineDataObject.get(commitId);
  }

  private createEmptyTimelineDataForCommitObj(): TimelineDataForCommit {
    return {
      timestamps: [],
      highlightedMarkerColor: 'blue',
      selectedTimestamps: [],
      applicationNameAndBranchNameToColorMap: new Map(),
    };
  }

  private setTimelineDataForCommit(
    timelineDataForCommit: TimelineDataForCommit,
    commitId: string
  ) {
    this.timelineDataObject.set(commitId, timelineDataForCommit);
  }

  // #endregion

  // #region Reset functions

  resetState() {
    this.timelineDataObject = new Map();
  }

  // #endregion

  triggerTimelineUpdate() {
    // Calling this in each update function will multiple renderings,
    // therefore we manually call it when the updated data object is ready
    // Additionally, we can manually trigger this update after the gsap
    // animation of the play/pause icon

    // this.debug('triggerTimelineUpdate');

    // eslint-disable-next-line no-self-assign
    this.timelineDataObject = this.timelineDataObject;
  }
}
