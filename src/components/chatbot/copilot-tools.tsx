import { useCopilotAction } from '@copilotkit/react-core';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';

export function CopilotTools() {
  const { actions } = useVisualizationStore();

  useCopilotAction({
    name: 'highlight-component',
    description:
      'Visually highlights a component in the 3D visualization by its id.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'id of the component to highlight',
        required: true,
      },
    ],
    handler: async ({ id }) => {
      console.log('Highlighting component with id:', id);
      actions.setHighlightedEntityId(id, true);
    },
  });

  useCopilotAction({
    name: 'open-components',
    description:
      'Opens components, meaning their children are now visible in the 3d visualization.',
    parameters: [
      {
        name: 'ids',
        type: 'string[]',
        description: 'ids of the components to be opened',
        required: true,
      },
    ],
    handler: async ({ ids }) => {
      console.log('Opening components with ids:', ids);
      actions.openComponents(ids);
    },
  });

  useCopilotAction({
    name: 'close-components',
    description:
      'Closes components, meaning their children are no longer visible in the 3d visualization.',
    parameters: [
      {
        name: 'ids',
        type: 'string[]',
        description: 'ids of the components to be closed',
        required: true,
      },
    ],
    handler: async ({ ids }) => {
      console.log('Closing components with ids:', ids);
      actions.closeComponents(ids);
    },
  });

  return null;
}
