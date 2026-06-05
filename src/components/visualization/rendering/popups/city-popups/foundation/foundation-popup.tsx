import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import AggregatedBuildingMetricsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import EntityStructureStatsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/entity-structure-stats-table';
import { useLiveCity } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';

interface FoundationPopupProps {
  popupData: PopupData;
}

export default function FoundationPopup({ popupData }: FoundationPopupProps) {
  const city = useLiveCity(popupData.entityId) ?? (popupData.entity as City);
  const uuid = useMemo(() => generateUuidv4(), []);

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">{city.name}</div>
          <CopyButton text={city.name} />
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
              directDistrictCount={city.districtIds.length}
              containedDistrictCount={city.allContainedDistrictIds.length}
              directBuildingCount={city.buildingIds.length}
              containedBuildingCount={city.allContainedBuildingIds.length}
            />
          </Tab>
          <Tab eventKey="metrics" title="Metrics">
            <AggregatedBuildingMetricsTable
              buildingIds={city.allContainedBuildingIds}
            />
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
