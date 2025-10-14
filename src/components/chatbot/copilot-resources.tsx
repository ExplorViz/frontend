import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { getCircularReplacer } from 'explorviz-frontend/src/utils/circularReplacer';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { type Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface CopilotResourcesProps {
  landscapeData: LandscapeData | null;
}

export function CopilotResources({ landscapeData }: CopilotResourcesProps) {
  const applications = landscapeData?.structureLandscapeData.nodes.reduce(
    (acc, node) => {
      return acc.concat(node.applications);
    },
    [] as Application[]
  );
  useCopilotReadable({
    description:
      'Get the list of all applications of the 3D landscape data, the highest level of the underlying data structure.',
    value: JSON.stringify(applications, getCircularReplacer(true)),
    available: applications ? 'enabled' : 'disabled',
  });
  console.log(applications);
  return null;
}
