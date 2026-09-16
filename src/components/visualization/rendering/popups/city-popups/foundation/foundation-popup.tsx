import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import AggregatedBuildingMetricsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
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
import { Badge, Tab, Table, Tabs } from 'react-bootstrap';

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
      <div className="popover-body p-2">
        <Tabs
          defaultActiveKey="general"
          id={`foundation-popup-tabs-${uuid}`}
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
                        {(city.type ?? 'unknown')
                          .toUpperCase()
                          .replaceAll('_', ' ')}
                      </samp>
                    </Badge>
                  </td>
                </tr>
                {city.originOfData && (
                  <tr>
                    <td className="fw-bold">Origin</td>
                    <td className="text-right text-break pl-1">
                      {city.originOfData}
                    </td>
                  </tr>
                )}

                <tr>
                  <td className="fw-bold">Direct Districts</td>
                  <td className="text-right text-break pl-1">
                    {directDistrictCount}
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">Contained Districts</td>
                  <td className="text-right text-break pl-1">
                    {containedDistrictCount}
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
