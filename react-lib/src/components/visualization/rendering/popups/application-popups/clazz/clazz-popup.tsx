import React from 'react';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ClazzPopupRuntime from 'react-lib/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup-runtime';
import ClazzPopupCode from 'react-lib/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup-code';
import ClazzPopupRestructure from 'react-lib/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup-restructure';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import PopupTabs from 'react-lib/src/components/visualization/rendering/popups/popup-tabs.tsx';

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
        <div className="text-center text-break font-weight-bold pl-1">
          {clazz.name}
        </div>
      </h3>
      <PopupTabs
        restructureMode={restructureMode}
        originOfData={clazz.originOfData}
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
