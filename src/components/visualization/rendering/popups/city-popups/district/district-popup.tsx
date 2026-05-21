import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import EntityStructureStatsTable from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/entity-structure-stats-table';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { collectDistrictSubtreeIds } from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

interface DistrictPopupProps {
  popupData: PopupData;
}

export default function DistrictPopup({ popupData }: DistrictPopupProps) {
  const district = popupData.entity as District;
  const { districtIds, buildingIds } = collectDistrictSubtreeIds(district.id);

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
        <EntityStructureStatsTable
          directDistrictCount={district.districtIds.length}
          containedDistrictCount={Math.max(districtIds.length - 1, 0)}
          directBuildingCount={district.buildingIds.length}
          containedBuildingCount={buildingIds.length}
        />
      </div>
    </>
  );
}
