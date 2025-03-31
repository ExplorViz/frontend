import React from 'react';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import PopupTabs from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-tabs';
import CommunicationPopupRuntime from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/communication/communication-popup-runtime.tsx';
import CommunicationPopupCode from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/communication/communication-popup-code.tsx';
import CommunicationPopupRestructure from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/communication/communication-popup-restructure.tsx';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';

interface CommunicationPopupProps {
  popupData: PopupData;
  restructureMode: boolean;
  showApplication?(applicationId: string): void;
  toggleHighlightById(modelId: string): void;
  openParents(entity: Class | Package, applicationId: string): void;
}

export default function CommunicationPopup({
  popupData,
  restructureMode,
  showApplication,
  toggleHighlightById,
  openParents,
}: CommunicationPopupProps) {
  const communication = popupData.entity as ClazzCommuMeshDataModel;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break font-weight-bold pl-1">
          Communication Information
        </div>
      </h3>
      <PopupTabs
        restructureMode={restructureMode}
        originOfData={communication.originOfData}
        runtimeTab={
          <CommunicationPopupRuntime
            communication={communication}
            showApplication={showApplication}
            toggleHighlightById={toggleHighlightById}
            openParents={openParents}
          />
        }
        codeTab={<CommunicationPopupCode />}
        restructureTab={
          <CommunicationPopupRestructure
            communication={communication}
            showApplication={showApplication}
            toggleHighlightById={toggleHighlightById}
            openParents={openParents}
          />
        }
      />
    </>
  );
}
