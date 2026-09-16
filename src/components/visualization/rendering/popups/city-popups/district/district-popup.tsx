import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import AggregatedBuildingMetricsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import FilesTab from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/files-tab';
import { useLiveDistrict } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import { useVisibleEntityCounts } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-visible-entity-counts';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { collectDistrictSubtreeIds } from 'explorviz-frontend/src/utils/city-rendering/district-tree';
import { getSourceReferenceCommitHash } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { buildDirectoryTreeUrl } from 'explorviz-frontend/src/utils/repository-file-url';
import { useMemo } from 'react';
import { Badge, Tab, Table, Tabs } from 'react-bootstrap';

interface DistrictPopupProps {
  popupData: PopupData;
}

export default function DistrictPopup({ popupData }: DistrictPopupProps) {
  const district =
    useLiveDistrict(popupData.entityId) ?? (popupData.entity as District);
  const { districtIds, buildingIds } = useMemo(
    () => collectDistrictSubtreeIds(district.id),
    [district.id]
  );
  const visibleEntityCounts = useVisibleEntityCounts({
    directDistrictIds: district.districtIds,
    containedDistrictIds: districtIds.slice(1),
    directBuildingIds: district.buildingIds,
    containedBuildingIds: buildingIds,
  });
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
      </h3>
      <div className="popover-body p-2">
        <Tabs
          defaultActiveKey="general"
          id={`district-popup-tabs-${uuid}`}
          className="nav-tabs justify-content-center"
        >
          <Tab eventKey="general" title="General">
            <Table hover className="table table-sm mt-2 mb-0">
              <tbody>
                <tr>
                  <td className="fw-bold">Type</td>
                  <td className="text-right text-break pl-1">
                    <Badge pill>
                      <samp>
                        {(district.type ?? 'unknown')
                          .toUpperCase()
                          .replaceAll('_', ' ')}
                      </samp>
                    </Badge>
                  </td>
                </tr>
                {district.fqn && (
                  <tr>
                    <td className="fw-bold">FQN</td>
                    <td className="text-right text-break pl-1">
                      {district.fqn}
                    </td>
                  </tr>
                )}
                {district.originOfData && (
                  <tr>
                    <td className="fw-bold">Origin</td>
                    <td className="text-right text-break pl-1">
                      {district.originOfData}
                    </td>
                  </tr>
                )}

                <tr>
                  <td className="fw-bold">Direct Districts</td>
                  <td className="text-right text-break pl-1">
                    {visibleEntityCounts.directDistrictCount}
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">Contained Districts</td>
                  <td className="text-right text-break pl-1">
                    {visibleEntityCounts.containedDistrictCount}
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">Direct Buildings</td>
                  <td className="text-right text-break pl-1">
                    {visibleEntityCounts.directBuildingCount}
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">Contained Buildings</td>
                  <td className="text-right text-break pl-1">
                    {visibleEntityCounts.containedBuildingCount}
                  </td>
                </tr>
              </tbody>
            </Table>
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
