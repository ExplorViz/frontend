import { useCopilotReadable } from '@copilotkit/react-core';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getCircularReplacer } from 'explorviz-frontend/src/utils/circularReplacer';
import { type Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { EditingContext } from '../editing/editing-context';
import { use } from 'react';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { ChatbotContext } from './chatbot-context';

interface CopilotResourcesProps {
  applications?: Application[];
}

export function CopilotResources({ applications }: CopilotResourcesProps) {
  const {
    closedComponentIds,
    highlightedEntityIds,
    hoveredEntityId,
    removedComponentIds,
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
  const {
    showToolsSidebar,
    showSettingsSidebar,
    openedToolComponent,
    openedSettingComponent,
  } = use(ChatbotContext);

  useCopilotReadable({
    description:
      'Get the list of all applications of the 3D landscape data, the highest level of the underlying data structure.',
    value: JSON.stringify(applications ?? [], getCircularReplacer(true)),
  });

  useCopilotReadable({
    description:
      'Get the list of all currently closed components in the 3D visualization by their IDs. Closed components have their children hidden in the visualization.',
    value: JSON.stringify([...closedComponentIds]),
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
    value: JSON.stringify([...removedComponentIds]),
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
