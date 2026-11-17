import { useAgentContext } from '@copilotkit/react-core/v2';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { EditingContext } from 'explorviz-frontend/src/components/editing/editing-context-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useDistricts } from 'explorviz-frontend/src/utils/collaboration/districts';
import { useHighlights } from 'explorviz-frontend/src/utils/collaboration/highlights';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { use } from 'react';

const ASSISTANT_INSTRUCTIONS =
  'You are assisting the user as best as you can. You are embedded inside the frontend of a software visualization tool called ExplorViz. ExplorViz takes data from static and dynamic program analysis to visualize software systems as software landscapes using the 3D city metaphor. In the city metaphor applications are represented as cities, their directories are represented as districts of the cities and files are represented as buildings in the city. The user can interact with the 3D visualization by asking you to highlight, open, or close districts. You can also provide information about the applications, directories, files, classes, and functions in the landscape. Applications/Cities are the highest level of organization in the landscape, containing directories/districts. Directories/Districts can contain sub-directories/sub-districts and files/buildings. Files/Buildings have associated metric and can contain classes, functions, and variables. By default all districts are open (visible) and not highlighted.';

interface CopilotResourcesProps {
  cities?: City[];
}

export function CopilotResources({ cities }: CopilotResourcesProps) {
  const { hoveredEntityId, removedDistrictIds } = useVisualizationStore();
  const highlightedEntityIds = useHighlights((ids) => ids);
  const closedDistrictIds = useDistricts((districts) => districts.closedDistrictIds);

  const { canGoBack, canGoForward } = use(EditingContext);
  const visualizationSettings = useUserSettingsStore((state) => state.visualizationSettings);

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
        linesOfCode += building?.metrics?.lineCount?.current ?? 0;
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

  const { showToolsSidebar, showSettingsSidebar, selectedToolbarTool, selectedSettingsSidebarTab } =
    use(ChatbotContext);

  useAgentContext({
    description: 'Instructions for you, the ExplorViz assistant',
    value: ASSISTANT_INSTRUCTIONS,
  });

  useAgentContext({
    description:
      "Get a lightweight summary of the cities/applications in the 3D landscape (counts only). Use the 'query-landscape-data' tool when you need filtered or detailed data.",
    value: JSON.stringify(summarizeCities(cities ?? [])),
  });

  useAgentContext({
    description:
      'Get the list of all currently closed components in the 3D visualization by their IDs. Closed components have their children hidden in the visualization.',
    value: JSON.stringify([...closedDistrictIds]),
  });
  useAgentContext({
    description:
      'Get the list of all currently highlighted components in the 3D visualization by their IDs. Highlighted components are visually emphasized in the visualization.',
    value: JSON.stringify([...highlightedEntityIds]),
  });
  useAgentContext({
    description:
      'Get the ID of the component currently being hovered over by the user in the 3D visualization. If no component is being hovered over, this will be null.',
    value: hoveredEntityId ?? 'null',
  });
  useAgentContext({
    description:
      'Get the list of all currently removed components from the 3D visualization by their IDs. Removed components are not visible in the visualization.',
    value: JSON.stringify([...removedDistrictIds]),
  });
  useAgentContext({
    description: 'Indicates whether the user can navigate back in their editing history of the 3D landscape data.',
    value: JSON.stringify(canGoBack),
  });
  useAgentContext({
    description: 'Indicates whether the user can navigate forward in their editing history of the 3D landscape data.',
    value: JSON.stringify(canGoForward),
  });
  useAgentContext({
    description: 'Get the current visualization settings as a map of setting IDs to their values.',
    value: JSON.stringify(flattenSettings(visualizationSettings)),
  });
  useAgentContext({
    description:
      'Get the default visualization settings as a map of setting IDs to their default values. Use this to reset settings or reason about valid values.',
    value: JSON.stringify(flattenSettings(defaultVizSettings)),
  });
  useAgentContext({
    description: 'Indicates whether the tools sidebar in the visualization UI is currently visible.',
    value: JSON.stringify(showToolsSidebar),
  });
  useAgentContext({
    description: 'Indicates whether the settings sidebar in the visualization UI is currently visible.',
    value: JSON.stringify(showSettingsSidebar),
  });
  useAgentContext({
    description: 'Gets the identifier of the currently opened component in the tools sidebar, or null if none is open.',
    value: JSON.stringify(selectedToolbarTool),
  });
  useAgentContext({
    description:
      'Gets the identifier of the currently opened component in the settings sidebar, or null if none is open.',
    value: JSON.stringify(selectedSettingsSidebarTab),
  });
  return null;
}
