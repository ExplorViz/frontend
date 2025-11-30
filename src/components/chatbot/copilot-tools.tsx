import {
  useCopilotAction,
  useCopilotChatInternal,
} from '@copilotkit/react-core';
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
import { use, useMemo } from 'react';
import { ToolCallCard } from './tool-call-card';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { EditingContext } from '../editing/editing-context';
import * as htmlToImage from 'html-to-image';
import { ChatbotContext } from './chatbot-context';

interface CopilotToolsProps {
  applications?: Application[];
}

function getAllSubPackages(pkg: Package): Package[] {
  return [pkg, ...pkg.subPackages.flatMap(getAllSubPackages)];
}

export function CopilotTools({ applications }: CopilotToolsProps) {
  const { actions } = useVisualizationStore();
  const { moveCameraTo, resetCamera } = useCameraControlsStore();
  const {
    addApplication,
    addClasses,
    removeComponent,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  } = use(EditingContext);
  const packages = useMemo(() => {
    const list = [] as Package[];
    applications?.forEach(({ packages }) => {
      packages.forEach((pck) => {
        list.push(...getAllSubPackages(pck));
      });
    });
    return list;
  }, [applications]);

  const { sendMessage } = useCopilotChatInternal();
  const {
    pingScreenAtPoint,
    showToolsSidebar,
    setShowToolsSidebar,
    showSettingsSidebar,
    setShowSettingsSidebar,
    openedToolComponent,
    setOpenedToolComponent,
    openedSettingComponent,
    setOpenedSettingComponent,
    entityFilteringControllerRef,
    applicationSearchControllerRef,
  } = use(ChatbotContext);

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
    name: 'open-close-tools-sidebar',
    description:
      'Opens or closes the tools sidebar in the UI. The tools sidebar is located on the top left side of the screen.',
    parameters: [
      {
        name: 'open',
        type: 'boolean',
        description:
          'Set to true if you want to open the tools sidebar. Set to false if you want to close it.',
        required: true,
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ open }) => {
      if (showToolsSidebar !== open) {
        setShowToolsSidebar(open);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: 'tools-sidebar', name: 'Tools Sidebar' }}
        status={status}
        action={args.open ? 'openToolsSidebar' : 'closeToolsSidebar'}
      />
    ),
  });

  useCopilotAction({
    name: 'open-close-settings-sidebar',
    description:
      'Opens or closes the settings sidebar in the UI. The settings sidebar is located on the top right side of the screen.',
    parameters: [
      {
        name: 'open',
        type: 'boolean',
        description:
          'Set to true if you want to open the settings sidebar. Set to false if you want to close it.',
        required: true,
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ open }) => {
      if (showSettingsSidebar !== open) {
        setShowSettingsSidebar(open);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: 'settings-sidebar', name: 'Settings Sidebar' }}
        status={status}
        action={args.open ? 'openSettingsSidebar' : 'closeSettingsSidebar'}
      />
    ),
  });

  useCopilotAction({
    name: 'open-close-tools-component',
    description:
      'Opens or closes a component inside the tools sidebar. Opening the component will also open the sidebar. Allowed component ids: entity-filtering, application-search, Trace-Replayer.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description:
          'ID of the component in the tools sidebar to be opened or closed. Valid values: entity-filtering, application-search, Trace-Replayer.',
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
      if (open) {
        setShowToolsSidebar(true);
        setOpenedToolComponent(id);
      } else if (openedToolComponent === id) {
        setOpenedToolComponent(null);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ name: args.id }}
        status={status}
        action={args.open ? 'openToolsComponent' : 'closeToolsComponent'}
      />
    ),
  });

  useCopilotAction({
    name: 'open-close-settings-component',
    description:
      'Opens or closes a component inside the settings sidebar. Opening the component will also open the sidebar. Allowed component ids: Collaboration, Chatbot, VSCode-Extension-Settings, Restructure-Landscape, Persist-Landscape, Settings.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        description:
          'ID of the component in the settings sidebar to be opened or closed. Valid values: Collaboration, Chatbot, VSCode-Extension-Settings, Restructure-Landscape, Persist-Landscape, Settings.',
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
      if (open) {
        setShowSettingsSidebar(true);
        setOpenedSettingComponent(id);
      } else if (openedSettingComponent === id) {
        setOpenedSettingComponent(null);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ name: args.id }}
        status={status}
        action={args.open ? 'openSettingsComponent' : 'closeSettingsComponent'}
      />
    ),
  });

  useCopilotAction({
    name: 'filter-entities',
    description:
      'Filters entities in the visualization using the existing Entity Filtering panel. Provide one or more thresholds.',
    parameters: [
      {
        name: 'minTraceStartTimestamp',
        type: 'number',
        description:
          'Minimum allowed trace start timestamp. Traces starting earlier will be removed.',
      },
      {
        name: 'minTraceDuration',
        type: 'number',
        description:
          'Minimum allowed trace duration. Traces shorter than this will be removed.',
      },
      {
        name: 'minClassMethodCount',
        type: 'number',
        description:
          'Minimum number of methods required for a class to remain visible.',
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({
      minTraceStartTimestamp,
      minTraceDuration,
      minClassMethodCount,
    }) => {
      setShowToolsSidebar(true);
      setOpenedToolComponent('entity-filtering');
      setTimeout(() => {
        entityFilteringControllerRef?.current?.applyFilters({
          minTraceStartTimestamp,
          minTraceDuration,
          minClassMethodCount,
        });
      }, 200);
    },
    render: ({ status }) => (
      <ToolCallCard
        component={{ id: 'entity-filtering', name: 'Entity Filtering' }}
        status={status}
        action={'filterEntities'}
      />
    ),
  });

  useCopilotAction({
    name: 'search-application-components',
    description:
      'Searches for components by name in the Application Search panel. Optionally selects all results.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search term to look for in application components.',
        required: true,
      },
      {
        name: 'selectAll',
        type: 'boolean',
        description: 'Select all search results and ping them.',
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ query, selectAll }) => {
      setShowToolsSidebar(true);
      setOpenedToolComponent('application-search');
      setTimeout(() => {
        applicationSearchControllerRef?.current?.search({
          query,
          selectAll,
        });
      }, 200);
    },
    render: ({ status }) => (
      <ToolCallCard
        component={{ id: 'application-search', name: 'Application Search' }}
        status={status}
        action={'searchComponents'}
      />
    ),
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
      console.log(packages, id);
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
        showPopup
      />
    ),
  });

  useCopilotAction({
    name: 'undo-edit',
    description:
      'Undoes the last edit made to the landscape, reverting it to the previous state.',
    parameters: [],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      if (canGoBack) {
        goBack();
      }
    },
    render: ({ status }) => <ToolCallCard status={status} action="undoEdit" />,
  });

  useCopilotAction({
    name: 'redo-edit',
    description:
      'Redoes the last undone edit to the landscape, reapplying the change that was previously reverted.',
    parameters: [],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      if (canGoForward) {
        goForward();
      }
    },
    render: ({ status }) => <ToolCallCard status={status} action="redoEdit" />,
  });

  useCopilotAction({
    name: 'take-screenshot',
    description:
      'Takes a screenshot of the current browser window and appends it as an user message to the chat. You can use this for example to explain other elements of the ExplorViz frontend to the user, that are not part of the 3d landscape. When an error occurs when taking the screenshot, please explain the error message to the user. The screenshot does not include the 3d landscape due to technical limitations, but all other parts of the frontend UI are visible in the screenshot.',
    parameters: [],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      // let track: MediaStreamTrack | undefined;
      // try {
      //   const captureStream = await navigator.mediaDevices.getDisplayMedia({
      //     video: {
      //       displaySurface: 'browser',
      //     },
      //     preferCurrentTab: true,
      //     selfBrowserSurface: 'include',
      //     surfaceSwitching: 'include',
      //     monitorTypeSurfaces: 'exclude',
      //   } as any);
      //   track = captureStream.getVideoTracks().find(Boolean);
      //   if (track) {
      //     let imageCapture = new ImageCapture(track);
      //     const screenshot = await imageCapture.grabFrame();
      //     //track.stop();
      //     const url = await new Promise<string>((resolve, reject) => {
      //       const canvas = document.createElement('canvas');
      //       canvas.width = screenshot.width;
      //       canvas.height = screenshot.height;
      //       const context = canvas.getContext('2d');
      //       if (!context) {
      //         reject(new Error('Could not get canvas context'));
      //         return;
      //       }
      //       context.drawImage(screenshot, 0, 0);
      //       canvas.toBlob((blob) => {
      //         if (blob) {
      //           const reader = new FileReader();
      //           reader.onloadend = () => {
      //             resolve(reader.result as string);
      //           };
      //           reader.readAsDataURL(blob);
      //         } else {
      //           reject(new Error('Could not convert canvas to blob'));
      //         }
      //       }, 'image/png');
      //     });
      //     console.log('Screenshot taken: ', url);
      //     const [format, bytes] = url
      //       .split(/data:image\/|;|base64,/)
      //       .filter(Boolean);
      //     await sendMessage({
      //       id: 'screenshot-' + Date.now(),
      //       role: 'user',
      //       image: {
      //         format,
      //         bytes,
      //       },
      //       content: '',
      //     });
      //     return 'Screenshot taken and appended to the chat.';
      //   } else {
      //     throw new Error('No video track available for screenshot.');
      //   }
      // } catch (err) {
      //   track?.stop();
      //   console.error('Error taking screenshot: ', err);
      //   return `Error taking screenshot: ${err instanceof Error ? err.message : String(err)}`;
      // }
      const url = await htmlToImage.toBlob(document.body).then(function (blob) {
        return new Promise<string>((resolve, reject) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Could not convert to blob'));
          }
        });
      });

      console.log('Screenshot taken: ', url);
      const [format, bytes] = url
        .split(/data:image\/|;|base64,/)
        .filter(Boolean);
      await sendMessage({
        id: 'screenshot-' + Date.now(),
        role: 'user',
        image: {
          format,
          bytes,
        },
        content: '',
      });
      return 'Screenshot taken and appended to the chat.';
    },
    render: ({ status, result }) => (
      <ToolCallCard
        status={status}
        action="screenshot"
        errorMessage={
          (typeof result === 'string' &&
            result.includes('Error taking screenshot: ') &&
            result.split('Error taking screenshot: ')[1]) ||
          undefined
        }
      />
    ),
    followUp: false,
  });

  useCopilotAction({
    name: 'click-on-screen',
    description:
      'Simulates a click on a specific position on the screen given by the normalized screen position. This can be used to interact with UI elements outside of the 3D visualization, such as buttons or menus in the ExplorViz frontend. Do the following steps to achieve optimal results: 1. Check if there was a screenshot taken already, if not take a screenshot with the take-screenshot tool. 2. Read the screenshot resolution (width W, height H in pixels). 3. Visually locate the target element and determine the pixel coordinates of its center (x_px, y_px). Do not guess. Do not eyeball. Aim for the center of interactive elements like texts and buttons. 4. Convert to normalized coordinates with 5 decimals: x = round(x_px / W, 5) y = round(y_px / H, 5). 5. Take these normalized coordinates as parameters for this tool call. If the target is ambiguous or partially hidden, ask for clarification before clicking. After clicking, verify the expected UI change; if not achieved, adjust by small offsets (±3–5 px) and retry once.',
    parameters: [
      {
        name: 'x',
        type: 'number',
        description:
          'Normalized x coordinate on the screen, 0 (left) to 1 (right).',
        required: true,
      },
      {
        name: 'y',
        type: 'number',
        description:
          'Normalized y coordinate on the screen, 0 (top) to 1 (bottom).',
        required: true,
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ x, y }) => {
      const clientX = Math.round(x * window.innerWidth);
      const clientY = Math.round(y * window.innerHeight);
      const clickEvent = new MouseEvent('click', {
        clientX,
        clientY,
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.elementFromPoint(clientX, clientY)?.dispatchEvent(clickEvent);
      pingScreenAtPoint(clientX, clientY);
    },
    render: ({ args, status }) => {
      const clientX = args.x ? Math.round(args.x * window.innerWidth) : 0;
      const clientY = args.y ? Math.round(args.y * window.innerHeight) : 0;

      return (
        <ToolCallCard
          status={status}
          action="clickOnScreen"
          component={{ name: `(${clientX}, ${clientY})` }}
          onClick={() => pingScreenAtPoint(clientX, clientY)}
        />
      );
    },
  });

  return null;
}
