import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';

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

const PAUSED_COLOR = 'red';
const UNPAUSED_COLOR = 'blue';

export default class TimelineDataObjectHandler {
  // #region Properties

  // @tracked
  timelineDataObject: TimelineDataObject = new Map();

  // #endregion

  // #region Timeline Click Handler

  // @action

  // timelineClicked is defined as an arrow function so that "this" remains bound to
  // the TimelineDataObjectHandler instance. This prevents losing the context when
  // the method is passed as a callback to the PlotlyTimeline component.
  timelineClicked = async (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => {
    for (const [
      commitId,
      selectedTimestamps,
    ] of commitToSelectedTimestampMap.entries()) {
      const timelineData = this.timelineDataObject.get(commitId);

      if (
        !timelineData ||
        timelineData.selectedTimestamps.length == 0 ||
        selectedTimestamps.length === timelineData.selectedTimestamps.length // Nothing
      ) {
        // No update for this timeline
        continue;
      } else {
        // TODO: Only fetch for data based on changed timestamps for performance improvement
      }
    }

    useRenderingServiceStore.getState().pauseVisualizationUpdating(true);

    if (useRenderingServiceStore.getState()._analysisMode === 'evolution') {
      useRenderingServiceStore.getState()._userInitiatedStaticDynamicCombination = true;
    }

    useRenderingServiceStore
      .getState()
      .triggerRenderingForGivenTimestamps(commitToSelectedTimestampMap);
  };

  // #endregion

  // #region Timeline Setter

  updateHighlightedMarkerColorForSelectedCommits(
    isVisualizationPaused: boolean
  ) {
    this.timelineDataObject.forEach((dataForCommit) => {
      dataForCommit.highlightedMarkerColor = isVisualizationPaused
        ? PAUSED_COLOR
        : UNPAUSED_COLOR;
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

  //triggerTimelineUpdate() {
  // Calling this in each update function will multiple renderings,
  // therefore we manually call it when the updated data object is ready
  // Additionally, we can manually trigger this update after the gsap
  // animation of the play/pause icon

  // this.debug('triggerTimelineUpdate');
  //}
}
