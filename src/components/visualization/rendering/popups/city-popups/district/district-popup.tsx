import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import AggregatedBuildingMetricsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import EntityStructureStatsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/entity-structure-stats-table';
import FilesTab from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/files-tab';
import { useLiveDistrict } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { collectDistrictSubtreeIds } from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { getSourceReferenceCommitHash } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { buildDirectoryTreeUrl } from 'explorviz-frontend/src/utils/repository-file-url';
import { useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';

interface DistrictPopupProps {
  popupData: PopupData;
}

export default function DistrictPopup({ popupData }: DistrictPopupProps) {
  const district =
    useLiveDistrict(popupData.entityId) ?? (popupData.entity as District);
  const { districtIds, buildingIds } = useMemo(
    () => collectDistrictSubtreeIds(district.id),
    [district]
  );
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
    district.originOfData === TypeOfAnalysis.Static ||
    district.originOfData === TypeOfAnalysis.StaticAndRuntime;
  const sourceDirectoryUrl = buildDirectoryTreeUrl(
    remoteUrl,
    sourceReferenceCommitHash,
    district.fqn,
    currentSelectedRepositoryName
  );
  const showSourceLink = isStatic && !!district.id;
  const sourceLinkTooltip = sourceDirectoryUrl
    ? 'Open source directory'
    : 'Source directory unavailable';

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">
            {district.name}
          </div>
          {showSourceLink && (
            <LinkButton
              url={sourceDirectoryUrl}
              disabled={!sourceDirectoryUrl}
              tooltip={sourceLinkTooltip}
            />
          )}
        </div>
      </h3>
      <div className="popover-body">
        <Tabs
          defaultActiveKey="general"
          id={`district-popup-tabs-${uuid}`}
          className="nav-tabs justify-content-center"
        >
          <Tab eventKey="general" title="General">
            <EntityStructureStatsTable
              directDistrictCount={district.districtIds.length}
              containedDistrictCount={Math.max(districtIds.length - 1, 0)}
              directBuildingCount={district.buildingIds.length}
              containedBuildingCount={buildingIds.length}
            />
          </Tab>
          <Tab eventKey="metrics" title="Metrics">
            <AggregatedBuildingMetricsTable buildingIds={buildingIds} />
          </Tab>
          <Tab eventKey="files" title="Files">
            <FilesTab buildingIds={buildingIds} />
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
