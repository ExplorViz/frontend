import { useCopilotAction } from '@copilotkit/react-core';
import { ToolCallCard } from 'explorviz-frontend/src/components/chatbot/tool-call-card';
import { EditingContext } from 'explorviz-frontend/src/components/editing/editing-context';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeAllComponentsInApplication,
  closeComponent,
  openAllComponentsInApplication,
  openComponent,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import {
  Application,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import { use } from 'react';

interface CopilotToolsProps {
  applications?: Application[];
}

function getAllSubPackages(pkg: Package): Package[] {
  return [pkg, ...pkg.subPackages.flatMap(getAllSubPackages)];
}

export function CopilotTools({ applications }: CopilotToolsProps) {
  const { actions } = useVisualizationStore();
  const { moveCameraTo, resetCamera } = useCameraControlsStore();
  const { addApplication, addClasses, removeComponent } = use(EditingContext);
  const packages = () => {
    const list = [] as Package[];
    applications?.forEach(({ packages }) => {
      packages.forEach((pck) => {
        list.push(...getAllSubPackages(pck));
      });
    });
    return list;
  };

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
    // @ts-ignore
    _isRenderAndWait: true,
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
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      const component = packages.find((pkg) => pkg.id === id);
      if (component) {
        if (open) {
          openComponent(id);
        } else {
          closeComponent(id);
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
    // @ts-ignore
    _isRenderAndWait: true,
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
    // @ts-ignore
    _isRenderAndWait: true,
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
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      resetCamera();
    },
    render: ({ status }) => (
      <ToolCallCard status={status} action="resetCamera" />
    ),
  });

  useCopilotAction({
    name: 'add-application',
    description:
      'Adds a new application to the current landscape. Look at the existing data first and use frameworks and package structure already present in the project.',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the application to be added.',
        required: true,
      },
      {
        name: 'classes',
        type: 'string[]',
        description:
          'List of fully qualified names (FQNs) of classes that belong to the application.',
        required: true,
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ name, classes }) => {
      return addApplication(name, classes);
    },
    render: ({ status, args, result }) => (
      <ToolCallCard
        status={status}
        action="addApplication"
        component={{ id: result, name: args.name }}
      />
    ),
  });

  useCopilotAction({
    name: 'add-classes-to-application',
    description:
      'Adds new classes to an existing application in the current landscape. Look at the existing data first and use frameworks and package structure already present in the project.',
    parameters: [
      {
        name: 'applicationId',
        type: 'string',
        description: 'ID of the application to which classes will be added.',
        required: true,
      },
      {
        name: 'classes',
        type: 'string[]',
        description:
          'List of fully qualified names (FQNs) of classes to be added to the application.',
        required: true,
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ applicationId, classes }) => {
      addClasses(applicationId, classes);
    },
    render: ({ status, args }) => (
      <ToolCallCard
        status={status}
        action="addClasses"
        component={{ id: args.applicationId }}
      />
    ),
  });

  useCopilotAction({
    name: 'remove-component-from-landscape',
    description:
      'Removes a component (application, package, or class) from the current landscape by its id. If you cant find the removed component, it has been removed already.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'ID of the component to be removed.',
        required: true,
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id }) => {
      removeComponent(id);
    },
    render: ({ status, args }) => (
      <ToolCallCard
        status={status}
        action="removeComponent"
        component={{ id: args.id }}
        disablePing
      />
    ),
  });

  return null;
}
