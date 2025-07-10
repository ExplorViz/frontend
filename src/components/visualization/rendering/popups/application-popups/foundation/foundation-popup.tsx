import React from 'react';

import FoundationPopupRuntime from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/foundation/foundation-popup-runtime.tsx';
import FoundationPopupCode from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/foundation/foundation-popup-code.tsx';
import FoundationPopupRestructure from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/foundation/foundation-popup-restructure.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import PopupTabs from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-tabs.tsx';

interface FoundationPopupProps {
  popupData: PopupData;
  restructureMode: boolean;
}

export default function FoundationPopup({
  popupData,
  restructureMode,
}: FoundationPopupProps) {
  const application = popupData.entity as Application;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">
          {application.name}
        </div>
      </h3>
      <PopupTabs
        restructureMode={restructureMode}
        originOfData={application.originOfData}
        runtimeTab={<FoundationPopupRuntime application={application} />}
        codeTab={<FoundationPopupCode application={application} />}
        restructureTab={
          <FoundationPopupRestructure application={application} />
        }
      />
    </>
  );
}
