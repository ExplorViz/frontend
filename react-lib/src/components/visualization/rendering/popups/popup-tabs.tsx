import React, { ReactNode, useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';

import generateUuidv4 from 'react-lib/src/utils/helpers/uuid4-generator';
import { Class, TypeOfAnalysis } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ClazzPopupRestructure from './application-popups/clazz/clazz-popup-restructure';

function isValidPopupSection(
  typeOfPopup: string,
  originOfData: TypeOfAnalysis
) {
  if (!typeOfPopup || !originOfData) {
    return false;
  }

  return originOfData.includes(typeOfPopup);
}

interface PopupTabsProps {
  originOfData: TypeOfAnalysis;
  restructureMode: boolean;
  runtimeTab?: ReactNode;
  codeTab?: ReactNode;
  restructureTab?: ReactNode;
}

export default function PopupTabs({
  originOfData,
  restructureMode,
  runtimeTab,
  codeTab,
  restructureTab,
}: PopupTabsProps) {
  const htmlIdUnique = useMemo<string>(generateUuidv4, []);

  return (
    <div className="popover-body">
      <Tabs 
        defaultActiveKey={isValidPopupSection("dynamic", originOfData) ? "runtime" : "code"}
        id={`tab-${htmlIdUnique}`}
        className="nav-tabs justify-content-center"
      >
        {isValidPopupSection("dynamic", originOfData) && (
          <Tab eventKey="runtime" title="Runtime">
            {runtimeTab}
          </Tab>
        )}

        {isValidPopupSection("static", originOfData) && (
          <Tab eventKey="code" title="Code">
            {codeTab}
          </Tab>
        )}

        {restructureMode && (
          <Tab eventKey="restructure" title="Restructure">
            {restructureTab}
          </Tab>
        )}
      </Tabs>
    </div>
  );
}
