import { useCopilotAction } from '@copilotkit/react-core';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeComponent,
  openComponent,
  closeAllComponentsInApplication,
  openAllComponentsInApplication,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import {
  Application,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { useMemo } from 'react';
import { ToolCallCard } from './tool-call-card';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';

interface CopilotToolsProps {
  applications?: Application[];
}

function getAllSubPackages(pkg: Package): Package[] {
  return [pkg, ...pkg.subPackages.flatMap(getAllSubPackages)];
}

export function CopilotTools({ applications }: CopilotToolsProps) {
  const { actions } = useVisualizationStore();
  const { moveCameraTo, resetCamera } = useCameraControlsStore();
  const packages = useMemo(() => {
    const list = [] as Package[];
    applications?.forEach(({ packages }) => {
      packages.forEach((pck) => {
        list.push(...getAllSubPackages(pck));
      });
    });
    return list;
  }, [applications]);

  useCopilotAction({
    name: 'highlight-component',
    description:
      'Permanently highlights or un-highlights a component in the 3D visualization by its id.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'ID of the component to highlight.',
        required: true,
      },
      {
        name: 'isHighlighted',
        type: 'boolean',
        description:
          'Set to true if you want to set the component to be highlighted. Set to false to remove the highlighting.',
      },
    ],
    handler: async ({ id, isHighlighted }) => {
      actions.setHighlightedEntityId(id, isHighlighted);
    },
    render: ({ args, status }) => {
      const action =
        args.isHighlighted === undefined
          ? undefined
          : args.isHighlighted
            ? 'highlight'
            : 'removeHighlight';

      return (
        <ToolCallCard
          component={{ id: args.id }}
          status={status}
          action={action}
        />
      );
    },
  });

  useCopilotAction({
    name: 'open-close-component',
    description:
      'Opens or closes a component, meaning its children are now visible or hidden in the 3d visualization.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'ID of the component to be opened or closed.',
        required: true,
      },
      {
        name: 'open',
        type: 'boolean',
        description:
          'Set to true if you want to open the component. Set to false if you want to close it.',
        required: true,
      },
    ],
    handler: async ({ id, open }) => {
      console.log(packages, id);
      const component = packages.find((pkg) => pkg.id === id);
      if (component) {
        if (open) {
          openComponent(component);
        } else {
          closeComponent(component);
        }
      } else {
        const application = applications?.find((app) => app.id === id);
        if (application) {
          if (open) {
            openAllComponentsInApplication(application);
          } else {
            closeAllComponentsInApplication(application);
          }
        }
      }
    },
    render: ({ args, status }) => {
      const action =
        args.open === undefined ? undefined : args.open ? 'open' : 'close';

      return (
        <ToolCallCard
          component={{ id: args.id }}
          status={status}
          action={action}
        />
      );
    },
  });

  useCopilotAction({
    name: 'ping-component',
    description:
      "Causes a visual ping effect on a component in the 3D visualization by its id to draw the user's attention to it. This does not change the state of the component, it only triggers a temporary visual effect.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'ID of the component to ping.',
        required: true,
      },
    ],
    handler: async ({ id }) => {
      pingByModelId(id);
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: args.id }}
        status={status}
        action={'ping'}
      />
    ),
  });

  useCopilotAction({
    name: 'move-camera-to-component',
    description:
      'Moves the camera to focus on a specific component in the 3D visualization by its id.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'ID of the component to move the camera to.',
        required: true,
      },
    ],
    handler: async ({ id }) => {
      const position = getWorldPositionOfModel(id);
      if (position) {
        moveCameraTo(
          [position.x + 5, position.y + 5, position.z + 5],
          [position.x, position.y, position.z]
        );
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: args.id }}
        status={status}
        action="moveCamera"
      />
    ),
  });

  useCopilotAction({
    name: 'reset-camera',
    description:
      'Resets the camera to its default position and orientation in the 3D visualization.',
    parameters: [],
    handler: async () => {
      resetCamera();
    },
    render: ({ status }) => (
      <ToolCallCard status={status} action="resetCamera" />
    ),
  });

  return null;
}
