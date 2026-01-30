import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

interface DistrictPopupProps {
  popupData: PopupData;
}

export default function DistrictPopup({ popupData }: DistrictPopupProps) {
  const district = popupData.entity as District;

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
        <table className="w-100">
          <tbody>
            <tr>
              <td>Contained Sub-Districts:</td>
              <td className="text-right text-break pl-1">
                {district.districtIds.length}
              </td>
            </tr>
            <tr>
              <td>Contained Buildings:</td>
              <td className="text-right text-break pl-1">
                {district.buildingIds.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
