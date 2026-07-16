import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
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

const getAutoEvolutionRenderingConfiguration = (
  selectedCommits: Map<string, { commitId: string; branchName: string }[]>,
  selectedTimestamps: Map<string, Timestamp[]>
) => {
  const totalSelectedCommitCount = Array.from(selectedCommits.values()).reduce(
    (acc, commits) => acc + commits.length,
    0
  );
  const hasSelectedCommit = totalSelectedCommitCount > 0;

  const hasSelectedTimestamp = Array.from(selectedTimestamps.values()).some(
    (timestamps) => timestamps.length > 0
  );

  const hasTwoCommitsInAnyRepository = Array.from(
    selectedCommits.values()
  ).some((commits) => commits.length >= 2);

  const hasAtMostOneCommitPerRepository = Array.from(
    selectedCommits.values()
  ).every((commits) => commits.length <= 1);

  if (hasSelectedTimestamp && !hasSelectedCommit) {
    return {
      renderDynamic: true,
      renderStatic: false,
      renderOnlyDifferences: false,
    };
  }

  if (!hasSelectedTimestamp && hasTwoCommitsInAnyRepository) {
    return {
      renderDynamic: false,
      renderStatic: true,
      renderOnlyDifferences: true,
    };
  }

  if (hasSelectedTimestamp && hasSelectedCommit) {
    return {
      renderDynamic: true,
      renderStatic: true,
      renderOnlyDifferences: false,
    };
  }

  if (
    !hasSelectedTimestamp &&
    hasSelectedCommit &&
    hasAtMostOneCommitPerRepository
  ) {
    return {
      renderDynamic: false,
      renderStatic: true,
      renderOnlyDifferences: false,
    };
  }

  return {
    renderDynamic: true,
    renderStatic: false,
    renderOnlyDifferences: false,
  };
};

export default class TimelineDataObjectHandler {
  // #region Properties

  // @tracked
  timelineDataObject: TimelineDataObject = new Map();

  // #endregion

  // #region Timeline Click Handler

  // @action

  timelineClicked = async (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => {
    for (const [
      commitId,
      selectedTimestamps,
    ] of commitToSelectedTimestampMap.entries()) {
      const timelineData = this.timelineDataObject.get(commitId);

      if (!timelineData) {
        continue;
      }

      const isSameSelection =
        selectedTimestamps.length === timelineData.selectedTimestamps.length &&
        selectedTimestamps.every(
          (ts, i) =>
            ts.epochNano === timelineData.selectedTimestamps[i].epochNano
        );

      if (isSameSelection) {
        // No update for this timeline
        continue;
      } else {
        // TODO: Only fetch for data based on changed timestamps for performance improvement
      }
    }

    useRenderingServiceStore.getState().pauseVisualizationUpdating(true);

    if (
      useRenderingServiceStore.getState()._analysisMode === 'evolution' ||
      useRenderingServiceStore.getState()._analysisMode ===
        'evolution comparison'
    ) {
      useRenderingServiceStore.getState()._userInitiatedStaticDynamicCombination = true;
    }

    const selectedCommits = useCommitTreeStateStore
      .getState()
      .getSelectedCommits();
    const previousConfig = useVisibilityServiceStore
      .getState()
      .getCloneOfEvolutionModeRenderingConfiguration();
    const autoConfig = getAutoEvolutionRenderingConfiguration(
      selectedCommits,
      commitToSelectedTimestampMap
    );
    const mergedConfig = {
      ...autoConfig,
      buildingComparisonVisibility: previousConfig.buildingComparisonVisibility,
    };
    useVisibilityServiceStore
      .getState()
      .applyEvolutionModeRenderingConfiguration(mergedConfig);
    useRenderingServiceStore
      .getState()
      .setAnalysisModeFromEvolutionRenderingConfig(mergedConfig);

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

  resetState() {
    this.timelineDataObject = new Map();
  }
}
