import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import AggregatedBuildingMetricsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import EntityStructureStatsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/entity-structure-stats-table';
import FilesTab from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/files-tab';
import { useLiveCity } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import { useVisibleEntityCounts } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-visible-entity-counts';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getSourceReferenceCommitHash } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { buildRepositoryTreeUrl } from 'explorviz-frontend/src/utils/repository-file-url';
import { useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import SpansTab from '../spans-tab';

interface FoundationPopupProps {
  popupData: PopupData;
}

export default function FoundationPopup({ popupData }: FoundationPopupProps) {
  const city = useLiveCity(popupData.entityId) ?? (popupData.entity as City);
  const uuid = useMemo(() => generateUuidv4(), []);
  const selectedCommits = useCommitTreeStateStore(
    (state) => state._selectedCommits
  );
  const currentSelectedRepositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );
  const remoteUrl = useEvolutionDataRepositoryStore(
    (state) =>
      state._repoNameCommitTreeMap.get(currentSelectedRepositoryName)?.remoteUrl
  );
  const sourceReferenceCommitHash = useMemo(
    () =>
      getSourceReferenceCommitHash(
        selectedCommits,
        currentSelectedRepositoryName
      ),
    [selectedCommits, currentSelectedRepositoryName]
  );
  const isStatic =
    city.originOfData === TypeOfAnalysis.Static ||
    city.originOfData === TypeOfAnalysis.StaticAndRuntime;
  const repositoryTreeUrl = buildRepositoryTreeUrl(
    remoteUrl,
    sourceReferenceCommitHash
  );
  const showSourceLink = isStatic && !!city.id;
  const sourceLinkTooltip = repositoryTreeUrl
    ? 'Open repository'
    : 'Repository unavailable';
  const visibleEntityCounts = useVisibleEntityCounts({
    directDistrictIds: city.districtIds,
    containedDistrictIds: city.allContainedDistrictIds,
    directBuildingIds: city.buildingIds,
    containedBuildingIds: city.allContainedBuildingIds,
  });
  const buildingLayoutAlgorithm = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingLayoutAlgorithm.value
  );
  const showDistrictCounts = buildingLayoutAlgorithm === 'None';
  const directDistrictCount = showDistrictCounts
    ? visibleEntityCounts.directDistrictCount
    : 0;
  const containedDistrictCount = showDistrictCounts
    ? visibleEntityCounts.containedDistrictCount
    : 0;

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">{city.name}</div>
          {showSourceLink && (
            <LinkButton
              url={repositoryTreeUrl}
              disabled={!repositoryTreeUrl}
              tooltip={sourceLinkTooltip}
            />
          )}
        </div>
      </h3>
      <div className="popover-body">
        <Tabs
          defaultActiveKey="general"
          id={`foundation-popup-tabs-${uuid}`}
          className="nav-tabs justify-content-center"
        >
          <Tab eventKey="general" title="General">
            <EntityStructureStatsTable
              directDistrictCount={directDistrictCount}
              containedDistrictCount={containedDistrictCount}
              directBuildingCount={visibleEntityCounts.directBuildingCount}
              containedBuildingCount={
                visibleEntityCounts.containedBuildingCount
              }
            />
          </Tab>
          {city.telemetryKey && (
            <Tab eventKey="spans" title="Spans" mountOnEnter={true}>
              <SpansTab
                key={city.telemetryKey}
                telemetryKey={city.telemetryKey}
              />
            </Tab>
          )}
          <Tab eventKey="metrics" title="Metrics">
            <AggregatedBuildingMetricsTable
              buildingIds={city.allContainedBuildingIds}
            />
          </Tab>
          <Tab eventKey="files" title="Files">
            <FilesTab buildingIds={city.allContainedBuildingIds} />
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
