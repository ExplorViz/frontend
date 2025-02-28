import React from 'react';

import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import PopupTabs from 'react-lib/src/components/visualization/rendering/popups/popup-tabs.tsx';
import { Package } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ComponentPopupRuntime from 'react-lib/src/components/visualization/rendering/popups/application-popups/component/component-popup-runtime';
import ComponentPopupCode from 'react-lib/src/components/visualization/rendering/popups/application-popups/component/component-popup-code';
import ComponentPopupRestructure from 'react-lib/src/components/visualization/rendering/popups/application-popups/component/component-popup-restructure';

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
        <div className="text-center text-break font-weight-bold pl-1">
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
