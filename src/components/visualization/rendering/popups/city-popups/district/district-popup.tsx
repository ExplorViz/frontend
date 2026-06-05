import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import AggregatedBuildingMetricsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import EntityStructureStatsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/entity-structure-stats-table';
import { useLiveDistrict } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { collectDistrictSubtreeIds } from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
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

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">
            {district.name}
          </div>
          <CopyButton text={district.name} />
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
        </Tabs>
      </div>
    </>
  );
}
