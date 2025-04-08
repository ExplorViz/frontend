import React from 'react';

import PopupTabs from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-tabs.tsx';
import {
  Method,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';

interface MethodPopupProps {
  restructureMode: boolean;
  popupData: PopupData;
}

export default function MethodPopup({
  restructureMode,
  popupData,
}: MethodPopupProps) {
  const method = popupData.entity as Method;
  const applicationId = popupData.applicationId;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break font-weight-bold pl-1">
          Method:
          {method.name}, type
          {method.type}
        </div>
      </h3>

      <PopupTabs
        restructureMode={restructureMode}
        originOfData={TypeOfAnalysis.Dynamic}
        codeTab={<>Not implemented yet.</>}
        runtimeTab={
          <>
            Parameters:
            <table>
              <thead>
                <th>Name</th>
                <th>Type</th>
              </thead>
              <tbody>
                {method.parameters.map((params) => (
                  <tr key={params.name}>
                    <td>{params.name}</td>
                    <td>{params.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        }
      />
    </>
  );
}
