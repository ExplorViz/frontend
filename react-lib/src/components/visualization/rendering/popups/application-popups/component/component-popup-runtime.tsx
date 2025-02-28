import React from 'react';

import { Package } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { TypeOfAnalysis } from 'react-lib/src/utils/landscape-schemes/structure-data';

interface ComponentPopupRuntimeProps {
  component: Package;
}

export default function ComponentPopupRuntime({
  component,
}: ComponentPopupRuntimeProps) {
  const name = component.name;
  const clazzCount = getClazzesCount(component);
  const packageCount = getPackagesCount(component);

  return (
    <table className="w-100">
      <tbody>
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

function getClazzesCount(component: Package): number {
  let result = component.classes.filter((clazz) =>
    clazz.originOfData.includes(TypeOfAnalysis.Dynamic)
  ).length;
  const children = component.subPackages;
  children.forEach((child) => {
    result += getClazzesCount(child);
  });
  return result;
}

function getPackagesCount(component: Package): number {
  let result = component.subPackages.filter((subPack) =>
    subPack.originOfData.includes(TypeOfAnalysis.Dynamic)
  ).length;
  const children = component.subPackages;
  children.forEach((child) => {
    result += getPackagesCount(child);
  });
  return result;
}
