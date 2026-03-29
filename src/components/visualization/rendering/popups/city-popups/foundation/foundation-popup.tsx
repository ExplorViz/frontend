import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
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
        <table className="w-100">
          <tbody>
            <tr>
              <td>Contained Districts:</td>
              <td className="text-right text-break pl-1">
                {city.allContainedDistrictIds.length}
              </td>
            </tr>
            <tr>
              <td>Contained Buildings:</td>
              <td className="text-right text-break pl-1">
                {city.allContainedBuildingIds.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
