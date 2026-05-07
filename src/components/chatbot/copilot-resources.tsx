import { useCopilotReadable } from '@copilotkit/react-core';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { use } from 'react';
import { EditingContext } from '../editing/editing-context';
import { ChatbotContext } from './chatbot-context';

interface CopilotResourcesProps {
  cities?: City[];
}

export function CopilotResources({ cities }: CopilotResourcesProps) {
  const {
    closedDistrictIds,
    highlightedEntityIds,
    hoveredEntityId,
    removedDistrictIds,
  } = useVisualizationStore();

  const { canGoBack, canGoForward } = use(EditingContext);
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );

  const flattenSettings = (settings: VisualizationSettings) => {
    const result: Record<string, unknown> = {};
    Object.entries(settings).forEach(([id, setting]) => {
      result[id] = (setting as any).value;
    });
    return result;
  };

  const summarizeCities = (cities: City[]) =>
    cities.map((city) => {
      let directoryCount = city.allContainedDistrictIds.length;
      let fileCount = city.allContainedBuildingIds.length;
      let languages: string[] = [];
      let functionCount = 0;
      let linesOfCode = 0;
      let sourceCodeLines = 0;
      let commentedLines = 0;
      let combinedFileSizeInBytes = 0;

      city.allContainedBuildingIds.forEach((buildingId) => {
        const building = useModelStore.getState().getBuilding(buildingId);
        const language = building?.language;
        functionCount += building?.metrics?.functionCount?.current ?? 0;
        linesOfCode += building?.metrics?.loc?.current ?? 0;
        sourceCodeLines += building?.metrics?.sloc?.current ?? 0;
        commentedLines += building?.metrics?.cloc?.current ?? 0;
        combinedFileSizeInBytes += building?.metrics?.size?.current ?? 0;
        if (language && !languages.includes(language)) {
          languages.push(language);
        }
      });

      return {
        cityId: city.id,
        cityName: city.name,
        languages,
        originOfData: city.originOfData,
        directoryCount,
        fileCount,
        functionCount,
        linesOfCode,
        sourceCodeLines,
        commentedLines,
        combinedFileSizeInBytes,
      };
    });

  const {
    showToolsSidebar,
    showSettingsSidebar,
    openedToolComponent,
    openedSettingComponent,
  } = use(ChatbotContext);

  useCopilotReadable({
    description:
      "Get a lightweight summary of the cities/applications in the 3D landscape (counts only). Use the 'query-landscape-data' tool when you need filtered or detailed data.",
    value: JSON.stringify(summarizeCities(cities ?? [])),
  });

  useCopilotReadable({
    description:
      'Get the list of all currently closed components in the 3D visualization by their IDs. Closed components have their children hidden in the visualization.',
    value: JSON.stringify([...closedDistrictIds]),
  });
  useCopilotReadable({
    description:
      'Get the list of all currently highlighted components in the 3D visualization by their IDs. Highlighted components are visually emphasized in the visualization.',
    value: JSON.stringify([...highlightedEntityIds]),
  });
  useCopilotReadable({
    description:
      'Get the ID of the component currently being hovered over by the user in the 3D visualization. If no component is being hovered over, this will be null.',
    value: hoveredEntityId ?? 'null',
  });
  useCopilotReadable({
    description:
      'Get the list of all currently removed components from the 3D visualization by their IDs. Removed components are not visible in the visualization.',
    value: JSON.stringify([...removedDistrictIds]),
  });
  useCopilotReadable({
    description:
      'Indicates whether the user can navigate back in their editing history of the 3D landscape data.',
    value: JSON.stringify(canGoBack),
  });
  useCopilotReadable({
    description:
      'Indicates whether the user can navigate forward in their editing history of the 3D landscape data.',
    value: JSON.stringify(canGoForward),
  });
  useCopilotReadable({
    description:
      'Get the current visualization settings as a map of setting IDs to their values.',
    value: JSON.stringify(flattenSettings(visualizationSettings)),
  });
  useCopilotReadable({
    description:
      'Get the default visualization settings as a map of setting IDs to their default values. Use this to reset settings or reason about valid values.',
    value: JSON.stringify(flattenSettings(defaultVizSettings)),
  });
  useCopilotReadable({
    description:
      'Indicates whether the tools sidebar in the visualization UI is currently visible.',
    value: JSON.stringify(showToolsSidebar),
  });
  useCopilotReadable({
    description:
      'Indicates whether the settings sidebar in the visualization UI is currently visible.',
    value: JSON.stringify(showSettingsSidebar),
  });
  useCopilotReadable({
    description:
      'Gets the identifier of the currently opened component in the tools sidebar, or null if none is open.',
    value: JSON.stringify(openedToolComponent),
  });
  useCopilotReadable({
    description:
      'Gets the identifier of the currently opened component in the settings sidebar, or null if none is open.',
    value: JSON.stringify(openedSettingComponent),
  });
  return null;
}
