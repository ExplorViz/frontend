import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import EntityStructureStatsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/entity-structure-stats-table';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

interface FoundationPopupProps {
  popupData: PopupData;
}

export default function FoundationPopup({ popupData }: FoundationPopupProps) {
  const city = popupData.entity as City;

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">{city.name}</div>
          <CopyButton text={city.name} />
        </div>
      </h3>
      <div className="popover-body">
        <EntityStructureStatsTable
          directDistrictCount={city.districtIds.length}
          containedDistrictCount={city.allContainedDistrictIds.length}
          directBuildingCount={city.buildingIds.length}
          containedBuildingCount={city.allContainedBuildingIds.length}
        />
      </div>
    </>
  );
}
