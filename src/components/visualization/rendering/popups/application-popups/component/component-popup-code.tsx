import {
  Package,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface ComponentPopupCodeProps {
  component: Package;
}

export default function ComponentPopupCode({
  component,
}: ComponentPopupCodeProps) {
  const name = component.name;
  const clazzCount = getClazzesCount(component);
  const packageCount = getPackagesCount(component);

  return (
    <table className="w-100">
      <tbody>
        <tr>
          <td>Classes / Files:</td>
          <td className="text-right text-break pl-1">{clazzCount}</td>
        </tr>
        <tr>
          <td>Packages / Folders:</td>
          <td className="text-right text-break pl-1">{packageCount}</td>
        </tr>
      </tbody>
    </table>
  );
}

function getClazzesCount(component: Package): number {
  let result = component.classes.filter((clazz) =>
    clazz.originOfData.includes(TypeOfAnalysis.Static)
  ).length;
  const children = component.subPackages;
  children.forEach((child) => {
    result += getClazzesCount(child);
  });
  return result;
}

function getPackagesCount(component: Package): number {
  let result = component.subPackages.filter((subPack) =>
    subPack.originOfData.includes(TypeOfAnalysis.Static)
  ).length;
  const children = component.subPackages;
  children.forEach((child) => {
    result += getPackagesCount(child);
  });
  return result;
}
