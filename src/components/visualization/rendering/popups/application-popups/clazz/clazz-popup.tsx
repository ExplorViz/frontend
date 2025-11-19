import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
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
  const classModel = popupData.entity as Class;
  const applicationId = popupData.applicationId;

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">
            {classModel.name}
          </div>
          <CopyButton text={classModel.name} />
        </div>
      </h3>
      <PopupTabs
        restructureMode={restructureMode}
        originOfData={classModel.originOfData}
        methodsTab={<ClazzMethodsList methods={classModel.methods} />}
        runtimeTab={
          <ClazzPopupRuntime clazz={classModel} applicationId={applicationId} />
        }
        codeTab={<ClazzPopupCode popupData={popupData} />}
        restructureTab={
          <ClazzPopupRestructure
            clazz={classModel}
            applicationId={applicationId}
          />
        }
      />
    </>
  );
}
