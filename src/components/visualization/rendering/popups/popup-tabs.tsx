import { ReactNode, useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';

import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

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
  methodsTab?: ReactNode;
  methodsTabTitle?: string;
  restructureTab?: ReactNode;
}

export default function PopupTabs({
  originOfData,
  restructureMode,
  runtimeTab,
  codeTab,
  methodsTab,
  methodsTabTitle,
  restructureTab,
}: PopupTabsProps) {
  const htmlIdUnique = useMemo<string>(generateUuidv4, []);

  const defaultActiveKey = (() => {
    if (methodsTab) {
      return 'methods';
    }
    if (runtimeTab && isValidPopupSection('dynamic', originOfData)) {
      return 'runtime';
    }
    if (codeTab && isValidPopupSection('static', originOfData)) {
      return 'code';
    }
    if (restructureMode && restructureTab) {
      return 'restructure';
    }
    return undefined;
  })();

  return (
    <div className="popover-body">
      <Tabs
        defaultActiveKey={defaultActiveKey}
        id={`tab-${htmlIdUnique}`}
        className="nav-tabs justify-content-center"
      >
        {methodsTab && (
          <Tab eventKey="methods" title={methodsTabTitle ?? 'Methods'}>
            {methodsTab}
          </Tab>
        )}

        {runtimeTab && isValidPopupSection('dynamic', originOfData) && (
          <Tab eventKey="runtime" title="Runtime">
            {runtimeTab}
          </Tab>
        )}

        {codeTab && isValidPopupSection('static', originOfData) && (
          <Tab eventKey="code" title="Code">
            {codeTab}
          </Tab>
        )}

        {restructureMode && restructureTab && (
          <Tab eventKey="restructure" title="Restructure">
            {restructureTab}
          </Tab>
        )}
      </Tabs>
    </div>
  );
}
