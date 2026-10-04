import { ChevronUpIcon, SyncIcon } from '@primer/octicons-react';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import TimelineDataObjectHandler from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';
import { use, useState } from 'react';
import { Button } from 'react-bootstrap';
import BottomBarChartDropdown from './bottom-bar-chart-dropdown';
import { BottomBarContext } from './bottom-bar-context';
import CommitTreeRepositorySelection from './evolution/commit-tree-repository-selection';
import EvolutionRenderingButtons from './evolution/evolution-rendering-buttons';
import PlotlyCommitTree from './evolution/plotly-commit-tree';
import PlotlyTimeline from './runtime/plotly-timeline';
import SocialMetricsPanel from './social-metrics/social-metrics-panel';

interface BottomBarProps {
  timelineDataObjectHandler: TimelineDataObjectHandler;
}

export default function BottomBar({
  timelineDataObjectHandler,
}: BottomBarProps) {
  const resetSelectedCommits = useCommitTreeStateStore(
    (state) => state.resetSelectedCommits
  );
  const setRepoNameAndBranchNameToColorMap = useCommitTreeStateStore(
    (state) => state.setRepoNameAndBranchNameToColorMap
  );
  const fetchAndStoreRepositoryCommitTrees = useEvolutionDataRepositoryStore(
    (state) => state.fetchAndStoreRepositoryCommitTrees
  );
  const showInfoToastMessage = useToastHandlerStore(
    (state) => state.showInfoToastMessage
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [isCommitTreeRefreshing, setIsCommitTreeRefreshing] =
    useState<boolean>(false);

  const bottomBarContext = use(BottomBarContext);

  const isExpanded = bottomBarContext.isExpanded;
  const setIsExpanded = bottomBarContext.setIsExpanded;

  const selectedChart = bottomBarContext.selectedChart;
  const setSelectedChart = bottomBarContext.setSelectedChart;

  const refreshCommitTreeData = async () => {
    if (isCommitTreeRefreshing) {
      return;
    }

    setIsCommitTreeRefreshing(true);
    try {
      resetSelectedCommits();
      setRepoNameAndBranchNameToColorMap(new Map());
      const refreshed = await fetchAndStoreRepositoryCommitTrees();

      if (refreshed) {
        showInfoToastMessage('Commit chart data refreshed');
      } else {
        showErrorToastMessage('Could not refresh commit chart data');
      }
    } catch (error) {
      showErrorToastMessage('Could not refresh commit chart data');
    } finally {
      setIsCommitTreeRefreshing(false);
    }
  };

  return (
    <div id="bottom-bar-container">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="secondary"
        className="bottom-bar-toggle-btn"
        title={isExpanded ? 'Hide Bottom Bar' : 'Show Bottom Bar'}
      >
        {!isExpanded && <span className="pr-1">Bottom Bar</span>}
        <ChevronUpIcon
          size="small"
          className={
            isExpanded
              ? 'align-middle hide-bottom-bar-icon-down'
              : 'align-middle'
          }
        />
      </Button>

      {/* ! Runtime / Code Charts */}
      <div
        id="bottom-bar-chart-container"
        className={`bottom-bar-chart
                ${(selectedChart === 'commit-chart' || selectedChart === 'social-metrics') && isExpanded ? 'bottom-bar-chart-commitTree' : ''}
                ${!isExpanded ? 'bottom-bar-chart-hide' : ''}`}
      >
        <BottomBarChartDropdown
          selectedView={selectedChart}
          onSelectView={setSelectedChart}
        />

        {selectedChart === 'runtime-chart' && (
          <>
            <PlotlyTimeline
              timelineDataObject={timelineDataObjectHandler.timelineDataObject!}
              clicked={timelineDataObjectHandler.timelineClicked}
            />
          </>
        )}

        {(selectedChart === 'commit-chart' ||
          selectedChart === 'social-metrics') && (
          <>
            <Button
              className="commit-tree-refresh-button"
              variant="outline-secondary"
              onClick={refreshCommitTreeData}
              disabled={isCommitTreeRefreshing}
              title={
                isCommitTreeRefreshing ? 'Refreshing...' : 'Refresh commit data'
              }
            >
              <SyncIcon
                size="small"
                className={isCommitTreeRefreshing ? 'spinning' : ''}
              />
            </Button>
            <EvolutionRenderingButtons />
            {selectedChart !== 'social-metrics' && (
              <>
                <div className="row justify-content-center w-100 mx-0">
                  <div className="col-12">
                    <CommitTreeRepositorySelection />
                  </div>
                </div>
                <PlotlyCommitTree />
              </>
            )}

            {selectedChart === 'social-metrics' && <SocialMetricsPanel />}
          </>
        )}
      </div>
    </div>
  );
}
