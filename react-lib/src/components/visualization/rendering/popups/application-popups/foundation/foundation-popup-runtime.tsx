import React from 'react';

import {
  Application,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import {
  getAllClassesInApplicationForGivenOrigin,
  getAllPackagesInApplicationForGivenOrigin,
} from 'react-lib/src/utils/application-helpers';

interface FoundationPopupRuntimeProps {
  application: Application;
}

export default function FoundationPopupRuntime({
  application,
}: FoundationPopupRuntimeProps) {
  const clazzCount = getAllClassesInApplicationForGivenOrigin(
    this.args.application,
    TypeOfAnalysis.Dynamic
  ).length;

  const packageCount = getAllPackagesInApplicationForGivenOrigin(
    this.args.application,
    TypeOfAnalysis.Dynamic
  ).length;

  return (
    <table className="w-100">
      <tbody>
        <tr>
          <td>Instance ID:</td>
          <td className="text-right text-break pl-1">
            {application.instanceId}
          </td>
        </tr>
        <tr>
          <td>Language:</td>
          <td className="text-right text-break pl-1">{application.language}</td>
        </tr>
        <tr>
          <td>Contained Classes:</td>
          <td className="text-right text-break pl-1">{clazzCount}</td>
        </tr>
        <tr>
          <td>Contained Packages:</td>
          <td className="text-right text-break pl-1">{packageCount}</td>
        </tr>
      </tbody>
    </table>
  );
}
