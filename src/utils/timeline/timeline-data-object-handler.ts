import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';

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
  // #region Properties

  // @tracked
  timelineDataObject: TimelineDataObject = new Map();
  private _updateVersion: number = 0;

  get updateVersion(): number {
    return this._updateVersion;
  }

  // #endregion

  // #region Timeline Click Handler

  // @action
  async timelineClicked(
    timelineDataObject: TimelineDataObject,
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) {
    for (const [
      commitId,
      selectedTimestamps,
    ] of commitToSelectedTimestampMap.entries()) {
      const timelineData = timelineDataObject.get(commitId);

      if (
        timelineData &&
        timelineData.selectedTimestamps.length > 0 &&
        selectedTimestamps === timelineData.selectedTimestamps
      ) {
        return;
      }
    }

    useRenderingServiceStore.getState().pauseVisualizationUpdating(true);

    if (useRenderingServiceStore.getState()._analysisMode === 'evolution') {
      useRenderingServiceStore.getState()._userInitiatedStaticDynamicCombination =
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
    this._updateVersion++;
  }

  updateSelectedTimestampsForCommit(timestamps: Timestamp[], commitId: string) {
    const timelineDataForCommit = this.timelineDataObject.get(commitId);
    if (timelineDataForCommit) {
      timelineDataForCommit.selectedTimestamps = timestamps;
      this._updateVersion++;
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
    this._updateVersion++;
  }

  // #endregion

  triggerTimelineUpdate() {
    // Calling this in each update function will multiple renderings,
    // therefore we manually call it when the updated data object is ready
    // Additionally, we can manually trigger this update after the gsap
    // animation of the play/pause icon

    // this.debug('triggerTimelineUpdate');

    // Increment version to trigger re-render of timeline
    this._updateVersion++;
  }
}
