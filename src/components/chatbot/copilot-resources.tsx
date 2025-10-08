import { useCopilotReadable } from '@copilotkit/react-core';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';

interface CopilotResourcesProps {
  landscapeData: LandscapeData | null;
}

export function CopilotResources({ landscapeData }: CopilotResourcesProps) {
  useCopilotReadable({
    description:
      'The landscape data of the ExplorViz 3D visualization, provided as a list of applications, which in turn are a list of packages, which form a hierarchical structure.',
    value: JSON.stringify(landscapeData?.structureLandscapeData, [
      'nodes',
      'applications',
      'packages',
      'subPackages',
      'classes',
      'methods',
      'id',
      'name',
    ]),
    available:
      landscapeData?.structureLandscapeData !== undefined
        ? 'enabled'
        : 'disabled',
  });
  return null;
}
