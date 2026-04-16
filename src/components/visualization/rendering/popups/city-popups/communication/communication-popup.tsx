import CommunicationPopupCode from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/communication/communication-popup-code';
import CommunicationPopupRestructure from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/communication/communication-popup-restructure';
import CommunicationPopupRuntime from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/communication/communication-popup-runtime';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import PopupTabs from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-tabs';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface CommunicationPopupProps {
  popupData: PopupData;
}

export default function CommunicationPopup({
  popupData,
}: CommunicationPopupProps) {
  const communication = popupData.entity as ClassCommunication;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">
          Communication Information
        </div>
      </h3>
      <PopupTabs
        restructureMode={false}
        originOfData={TypeOfAnalysis.Dynamic}
        runtimeTab={<CommunicationPopupRuntime communication={communication} />}
        codeTab={<CommunicationPopupCode />}
        restructureTab={
          <CommunicationPopupRestructure communication={communication} />
        }
      />
    </>
  );
}
