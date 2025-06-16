import {
  Application,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  getAllClassesInApplicationForGivenOrigin,
  getAllPackagesInApplicationForGivenOrigin,
} from 'explorviz-frontend/src/utils/application-helpers';

interface FoundationPopupCodeProps {
  application: Application;
}

export default function FoundationPopupCode({
  application,
}: FoundationPopupCodeProps) {
  const clazzCount = getAllClassesInApplicationForGivenOrigin(
    application,
    TypeOfAnalysis.Static
  ).length;

  const packageCount = getAllPackagesInApplicationForGivenOrigin(
    application,
    TypeOfAnalysis.Static
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
          <td>Classes/Files:</td>
          <td className="text-right text-break pl-1">{clazzCount}</td>
        </tr>
        <tr>
          <td>Packages/Folders:</td>
          <td className="text-right text-break pl-1">{packageCount}</td>
        </tr>
      </tbody>
    </table>
  );
}
