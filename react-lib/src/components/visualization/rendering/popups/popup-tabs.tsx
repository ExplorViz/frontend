import React, { ReactNode, useMemo } from 'react';

import generateUuidv4 from 'react-lib/src/utils/helpers/uuid4-generator';
import { TypeOfAnalysis } from 'react-lib/src/utils/landscape-schemes/structure-data';

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
      <ul className="nav nav-tabs justify-content-center" role="tablist">
        {isValidPopupSection('dynamic', originOfData) && (
          <li className="nav-item" role="presentation">
            <button
              className="nav-link active"
              id={`runtime-tab-${htmlIdUnique}`}
              data-toggle="tab"
              data-target={`#runtime-${htmlIdUnique}`}
              type="button"
              role="tab"
              aria-controls={`runtime-${htmlIdUnique}`}
              aria-selected="true"
            >
              Runtime
            </button>
          </li>
        )}

        {isValidPopupSection('static', originOfData) && (
          <li className="nav-item" role="presentation">
            <button
              className={
                isValidPopupSection('dynamic', originOfData)
                  ? 'nav-link'
                  : 'nav-link active'
              }
              id={`code-tab-${htmlIdUnique}`}
              data-toggle="tab"
              data-target={`#code-${htmlIdUnique}`}
              type="button"
              role="tab"
              aria-controls={`code-${htmlIdUnique}`}
              aria-selected="false"
            >
              Code
            </button>
          </li>
        )}
        {restructureMode && (
          <li className="nav-item" role="presentation">
            <button
              className="nav-link"
              id={`restructure-tab-${htmlIdUnique}`}
              data-toggle="tab"
              data-target={`#restructure-${htmlIdUnique}`}
              type="button"
              role="tab"
              aria-controls={`restructure-${htmlIdUnique}`}
              aria-selected="false"
            >
              Restructure
            </button>
          </li>
        )}
      </ul>
      <div className="tab-content">
        {isValidPopupSection('dynamic', originOfData) && (
          <div
            className="tab-pane fade show active"
            id={`runtime-${htmlIdUnique}`}
            role="tabpanel"
            aria-labelledby={`runtime-tab-${htmlIdUnique}`}
          >
            {runtimeTab}
          </div>
        )}
        {isValidPopupSection('static', originOfData) && (
          <div
            className={
              isValidPopupSection('dynamic', originOfData)
                ? 'tab-pane fade'
                : 'tab-pane fade show active'
            }
            id={`code-${htmlIdUnique}`}
            role="tabpanel"
            aria-labelledby={`code-tab-${htmlIdUnique}`}
          >
            {codeTab}
          </div>
        )}

        {restructureMode && (
          <div
            className="tab-pane fade"
            id={`restructure-${htmlIdUnique}`}
            role="tabpanel"
            aria-labelledby={`restructure-tab-${htmlIdUnique}`}
          >
            {restructureTab}
          </div>
        )}
      </div>
    </div>
  );
}
