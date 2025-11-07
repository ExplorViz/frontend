import ClazzMethodsList from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/clazz/clazz-methods-list';
import ClazzPopupCode from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup-code';
import ClazzPopupRestructure from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup-restructure';
import ClazzPopupRuntime from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup-runtime';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import PopupTabs from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-tabs.tsx';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface ClazzPopupProps {
  popupData: PopupData;
  restructureMode: boolean;
}

export default function ClazzPopup({
  popupData,
  restructureMode,
}: ClazzPopupProps) {
  const clazz = popupData.entity as Class;
  const applicationId = popupData.applicationId;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">{clazz.name}</div>
      </h3>
      <PopupTabs
        restructureMode={restructureMode}
        originOfData={clazz.originOfData}
        methodsTab={<ClazzMethodsList methods={clazz.methods} />}
        runtimeTab={
          <ClazzPopupRuntime clazz={clazz} applicationId={applicationId} />
        }
        codeTab={<ClazzPopupCode popupData={popupData} />}
        restructureTab={
          <ClazzPopupRestructure clazz={clazz} applicationId={applicationId} />
        }
      />
    </>
  );
}
