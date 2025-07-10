import React from 'react';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import PopupTabs from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-tabs.tsx';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ComponentPopupRuntime from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/component/component-popup-runtime';
import ComponentPopupCode from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/component/component-popup-code';
import ComponentPopupRestructure from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/component/component-popup-restructure';

interface ComponentPopupProps {
  popupData: PopupData;
  restructureMode: boolean;
}

export default function ComponentPopup({
  popupData,
  restructureMode,
}: ComponentPopupProps) {
  const component = popupData.entity as Package;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">
          {component.name}
        </div>
      </h3>
      <PopupTabs
        restructureMode={restructureMode}
        originOfData={component.originOfData}
        runtimeTab={<ComponentPopupRuntime component={component} />}
        codeTab={<ComponentPopupCode component={component} />}
        restructureTab={<ComponentPopupRestructure component={component} />}
      />
    </>
  );
}
