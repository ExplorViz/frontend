import {
  useCopilotAction,
  useCopilotChatInternal,
} from '@copilotkit/react-core';
import { ToolCallCard } from 'explorviz-frontend/src/components/chatbot/tool-call-card';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeAllComponentsInApplication,
  closeComponent,
  openAllComponentsInApplication,
  openComponent,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import {
  Application,
  Class,
  Method,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import * as htmlToImage from 'html-to-image';
import { use, useMemo } from 'react';
import { EditingContext } from '../editing/editing-context';
import { ChatbotContext } from './chatbot-context';

interface CopilotToolsProps {
  applications?: Application[];
}

const SCREENSHOT_MAX_WIDTH = 1280;
const SCREENSHOT_MAX_HEIGHT = 720;

function getAllSubPackages(pkg: Package): Package[] {
  return [pkg, ...pkg.subPackages.flatMap(getAllSubPackages)];
}

type DetailLevel = 'summary' | 'packages' | 'classes' | 'methods';

const validDetailLevels: DetailLevel[] = [
  'summary',
  'packages',
  'classes',
  'methods',
];

function isValidDetailLevel(level?: string): level is DetailLevel {
  return !!level && validDetailLevels.includes(level as DetailLevel);
}

function normalizeText(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function matchesText(target: string | undefined, filter?: string) {
  const normalizedFilter = normalizeText(filter);
  if (!normalizedFilter) {
    return true;
  }
  return (target ?? '').toLowerCase().includes(normalizedFilter);
}

function limitList<T>(list: T[], limit?: number) {
  if (typeof limit === 'number' && limit > 0) {
    return list.slice(0, limit);
  }
  return list;
}

function flattenPackages(application: Application) {
  return application.packages.flatMap(getAllSubPackages);
}

function classMatchesFilters(
  clazz: Class,
  className?: string,
  methodName?: string
) {
  const hasClassFilter = !!normalizeText(className);
  const hasMethodFilter = !!normalizeText(methodName);
  if (!hasClassFilter && !hasMethodFilter) {
    return true;
  }
  const classNameMatch =
    hasClassFilter &&
    (matchesText(clazz.name, className) ||
      (clazz.fqn ? matchesText(clazz.fqn, className) : false));
  const methodMatch =
    hasMethodFilter &&
    clazz.methods.some((method) => matchesText(method.name, methodName));
  return classNameMatch || methodMatch;
}

function packageMatchesFilters(
  pkg: Package,
  packageName?: string,
  className?: string,
  methodName?: string
) {
  if (normalizeText(packageName)) {
    return (
      matchesText(pkg.name, packageName) || matchesText(pkg.fqn, packageName)
    );
  }
  if (normalizeText(className) || normalizeText(methodName)) {
    return pkg.classes.some((clazz) =>
      classMatchesFilters(clazz, className, methodName)
    );
  }
  return true;
}

function buildApplicationSummary(
  application: Application,
  packages: Package[],
  classes: Class[],
  methods: Method[],
  limitedPackages: Package[],
  limitedClasses: Class[],
  limitedMethods: Method[]
) {
  return {
    id: application.id,
    name: application.name,
    language: application.language,
    originOfData: application.originOfData,
    instanceId: application.instanceId,
    packageCount: packages.length,
    classCount: classes.length,
    methodCount: methods.length,
    returnedPackageCount: limitedPackages.length,
    returnedClassCount: limitedClasses.length,
    returnedMethodCount: limitedMethods.length,
  };
}

function toPackageResult(pkg: Package, applicationId: string) {
  return {
    id: pkg.id,
    name: pkg.name,
    fqn: pkg.fqn,
    level: pkg.level,
    parentPackageId: pkg.parent?.id ?? null,
    applicationId,
    originOfData: pkg.originOfData,
    classCount: pkg.classes.length,
    editingState: pkg.editingState,
  };
}

function toClassResult(clazz: Class, applicationId: string, packageId: string) {
  return {
    id: clazz.id,
    name: clazz.name,
    fqn: clazz.fqn,
    level: clazz.level,
    packageId,
    applicationId,
    originOfData: clazz.originOfData,
    methodCount: clazz.methods.length,
    editingState: clazz.editingState,
  };
}

function toMethodResult(
  method: Method,
  identifiers: { applicationId: string; packageId: string; classId: string }
) {
  return {
    id: method.id,
    name: method.name,
    type: method.type,
    private: method.private,
    parameters: method.parameters,
    originOfData: method.originOfData,
    methodHash: method.methodHash,
    applicationId: identifiers.applicationId,
    packageId: identifiers.packageId,
    classId: identifiers.classId,
  };
}

function buildSettingsPromptDescription() {
  return Object.entries(defaultVizSettings)
    .map(([id, setting]) => {
      const displayName =
        (setting as any).displayName && (setting as any).displayName !== id
          ? `${(setting as any).displayName} (${id})`
          : id;
      const description =
        (setting as any).description &&
        (setting as any).description.trim().length
          ? (setting as any).description
          : 'No description available.';
      return `${displayName}: ${description}`;
    })
    .join('; ');
}

const settingsPromptDescription = buildSettingsPromptDescription();

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
    name: 'query-landscape-data',
    description:
      'Returns 3D landscape data with filters and adjustable level of detail so you can request only the slices you need instead of the full landscape.',
    parameters: [
      {
        name: 'applicationIds',
        type: 'string[]',
        description:
          'Optional list of application IDs to include. If omitted, all applications are considered.',
      },
      {
        name: 'applicationName',
        type: 'string',
        description:
          'Case-insensitive substring to match against application names.',
      },
      {
        name: 'packageName',
        type: 'string',
        description:
          'Case-insensitive substring to match against package names. Only used for detail levels packages/classes/methods.',
      },
      {
        name: 'className',
        type: 'string',
        description:
          'Case-insensitive substring to match against class names. Only used for detail levels classes/methods.',
      },
      {
        name: 'methodName',
        type: 'string',
        description:
          'Case-insensitive substring to match against method names. Only used for detail level methods.',
      },
      {
        name: 'detailLevel',
        type: 'string',
        description:
          "Level of detail for the result. Use 'summary' (default) for per-application counts only, 'packages' for flattened packages, 'classes' for flattened classes, or 'methods' to also include matching methods.",
      },
      {
        name: 'maxApplications',
        type: 'number',
        description:
          'Optional max number of applications to return after filtering.',
      },
      {
        name: 'maxPackages',
        type: 'number',
        description:
          'Optional max number of packages to return (applied per request when detailLevel is packages or higher).',
      },
      {
        name: 'maxClasses',
        type: 'number',
        description:
          'Optional max number of classes to return (applied when detailLevel is classes or methods).',
      },
      {
        name: 'maxMethods',
        type: 'number',
        description:
          'Optional max number of methods to return (applied when detailLevel is methods).',
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({
      applicationIds,
      applicationName,
      packageName,
      className,
      methodName,
      detailLevel,
      maxApplications,
      maxPackages,
      maxClasses,
      maxMethods,
    }) => {
      const level: DetailLevel = isValidDetailLevel(detailLevel)
        ? detailLevel
        : 'summary';
      const availableApplications = applications ?? [];
      const filteredApplications = availableApplications.filter((app) => {
        const idMatches =
          !Array.isArray(applicationIds) ||
          applicationIds.length === 0 ||
          applicationIds.includes(app.id);
        const nameMatches = matchesText(app.name, applicationName);
        return idMatches && nameMatches;
      });

      const limitedApplications = limitList(
        filteredApplications,
        maxApplications
      );

      const response: {
        detailLevel: DetailLevel;
        filters: Record<string, unknown>;
        applications: ReturnType<typeof buildApplicationSummary>[];
        packages?: ReturnType<typeof toPackageResult>[];
        classes?: ReturnType<typeof toClassResult>[];
        methods?: ReturnType<typeof toMethodResult>[];
      } = {
        detailLevel: level,
        filters: {
          applicationIds:
            Array.isArray(applicationIds) && applicationIds.length > 0
              ? applicationIds
              : undefined,
          applicationName: applicationName || undefined,
          packageName: packageName || undefined,
          className: className || undefined,
          methodName: methodName || undefined,
          maxApplications,
          maxPackages,
          maxClasses,
          maxMethods,
        },
        applications: [],
      };

      limitedApplications.forEach((application) => {
        const allPackages = flattenPackages(application);
        const filteredPackages = allPackages.filter((pkg) =>
          packageMatchesFilters(pkg, packageName, className, methodName)
        );
        const filteredClasses = filteredPackages.flatMap((pkg) =>
          pkg.classes
            .filter((clazz) =>
              classMatchesFilters(clazz, className, methodName)
            )
            .map((clazz) => ({ clazz, packageId: pkg.id }))
        );

        const filteredMethods =
          level === 'methods'
            ? filteredClasses.flatMap(({ clazz, packageId }) =>
                clazz.methods
                  .filter((method) => matchesText(method.name, methodName))
                  .map((method) => ({ method, classId: clazz.id, packageId }))
              )
            : [];

        const limitedPackages =
          level === 'packages' || level === 'classes' || level === 'methods'
            ? limitList(filteredPackages, maxPackages)
            : [];
        const limitedClasses =
          level === 'classes' || level === 'methods'
            ? limitList(filteredClasses, maxClasses)
            : [];
        const limitedMethods =
          level === 'methods' ? limitList(filteredMethods, maxMethods) : [];

        response.applications.push(
          buildApplicationSummary(
            application,
            filteredPackages,
            filteredClasses.map(({ clazz }) => clazz),
            filteredMethods.map(({ method }) => method),
            limitedPackages,
            limitedClasses.map(({ clazz }) => clazz),
            limitedMethods.map(({ method }) => method)
          )
        );

        if (
          level === 'packages' ||
          level === 'classes' ||
          level === 'methods'
        ) {
          response.packages ??= [];
          response.packages.push(
            ...limitedPackages.map((pkg) =>
              toPackageResult(pkg, application.id)
            )
          );
        }

        if (level === 'classes' || level === 'methods') {
          response.classes ??= [];
          response.classes.push(
            ...limitedClasses.map(({ clazz, packageId }) =>
              toClassResult(clazz, application.id, packageId)
            )
          );
        }

        if (level === 'methods') {
          response.methods ??= [];
          response.methods.push(
            ...limitedMethods.map(({ method, classId, packageId }) =>
              toMethodResult(method, {
                applicationId: application.id,
                packageId,
                classId,
              })
            )
          );
        }
      });

      return response;
    },
    render: ({ status, args }) => {
      const labelParts: string[] = [];
      if (args.detailLevel) {
        labelParts.push(args.detailLevel);
      }
      if (args.applicationName) {
        labelParts.push(`app~${args.applicationName}`);
      } else if (args.packageName) {
        labelParts.push(`pkg~${args.packageName}`);
      } else if (args.className) {
        labelParts.push(`class~${args.className}`);
      }

      return (
        <ToolCallCard
          status={status}
          action="queryLandscapeData"
          component={{
            name: labelParts.length ? labelParts.join(' | ') : 'landscape data',
          }}
        />
      );
    },
  });

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
    name: 'update-visualization-settings',
    description: `Updates visualization settings by setting specific setting IDs to new values. You can also reset settings to their defaults. Available settings (id: description): ${settingsPromptDescription}`,
    parameters: [
      {
        name: 'settings',
        type: 'object',
        description:
          'Key-value pairs of setting IDs to update. Only IDs that exist in the current settings are applied.',
      },
      {
        name: 'resetIds',
        type: 'string[]',
        description:
          'Optional list of setting IDs to reset to their default values before applying updates.',
      },
      {
        name: 'resetAll',
        type: 'boolean',
        description:
          'If true, reset all settings to defaults before applying updates.',
      },
    ],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ settings, resetIds, resetAll }) => {
      const { visualizationSettings, updateSetting, applyDefaultSettings } =
        useUserSettingsStore.getState();
      if (resetAll) {
        applyDefaultSettings();
      } else if (Array.isArray(resetIds) && resetIds.length > 0) {
        resetIds.forEach((id) => {
          const defaultSetting = (defaultVizSettings as any)[id];
          if (defaultSetting) {
            updateSetting(
              id as keyof VisualizationSettings,
              defaultSetting.value
            );
          }
        });
      }

      if (settings && typeof settings === 'object') {
        Object.entries(settings as Record<string, unknown>).forEach(
          ([id, value]) => {
            if (
              Object.prototype.hasOwnProperty.call(visualizationSettings, id)
            ) {
              updateSetting(id as keyof VisualizationSettings, value);
            }
          }
        );
      }
    },
    render: ({ status, args }) => (
      <ToolCallCard
        component={{
          name:
            args.settings && Object.keys(args.settings).length
              ? `Update Settings: ${Object.keys(args.settings).join(', ')}`
              : args.resetIds && args.resetIds.length
                ? `Reset Settings: ${args.resetIds.join(', ')}`
                : args.resetAll
                  ? 'Reset All Settings'
                  : undefined,
        }}
        status={status}
        action={'updateSettings'}
        onClick={() => {
          setShowSettingsSidebar(true);
          setOpenedSettingComponent('Settings');
        }}
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
    render: ({ status, args }) => (
      <ToolCallCard
        component={{ name: args.query }}
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
          [position.x + 2, position.y + 2, position.z + 2],
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
      'Adds a new application to the current landscape. Classes should include their fully qualified name (FQN) and can optionally include methods.',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the application to be added.',
        required: true,
      },
      {
        name: 'classes',
        type: 'object[]',
        description: 'List of classes for the application.',
        required: true,
        attributes: [
          {
            name: 'fqn',
            type: 'string',
            description: 'Fully qualified name of the class.',
            required: true,
          },
          {
            name: 'methods',
            type: 'object[]',
            description:
              'Optional list of methods for the class. Each method should include name, private (boolean), parameters (array of { name, type }), and returnType (string).',
            attributes: [
              {
                name: 'name',
                type: 'string',
                description: 'Name of the method.',
                required: true,
              },
              {
                name: 'private',
                type: 'boolean',
                description: 'Indicates if the method is private.',
                required: true,
              },
              {
                name: 'parameters',
                type: 'object[]',
                description:
                  'List of parameters for the method. Each parameter should include name and type.',
                required: true,
                attributes: [
                  {
                    name: 'name',
                    type: 'string',
                    description: 'Name of the parameter.',
                    required: true,
                  },
                  {
                    name: 'type',
                    type: 'string',
                    description: 'Type of the parameter.',
                    required: true,
                  },
                ],
              },
              {
                name: 'returnType',
                type: 'string',
                description: 'Return type of the method.',
                required: true,
              },
            ],
          },
        ],
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
      'Adds new classes to an existing application in the current landscape. Classes should include their fully qualified name (FQN) and can optionally include methods.',
    parameters: [
      {
        name: 'applicationId',
        type: 'string',
        description: 'ID of the application to which classes will be added.',
        required: true,
      },
      {
        name: 'classes',
        type: 'object[]',
        description: 'List of classes to add to the application.',
        required: true,
        attributes: [
          {
            name: 'fqn',
            type: 'string',
            description: 'Fully qualified name of the class.',
            required: true,
          },
          {
            name: 'methods',
            type: 'object[]',
            description:
              'Optional list of methods for the class. Each method should include name, private (boolean), parameters (array of { name, type }), and returnType (string).',
            attributes: [
              {
                name: 'name',
                type: 'string',
                description: 'Name of the method.',
                required: true,
              },
              {
                name: 'private',
                type: 'boolean',
                description: 'Indicates if the method is private.',
                required: true,
              },
              {
                name: 'parameters',
                type: 'object[]',
                description:
                  'List of parameters for the method. Each parameter should include name and type.',
                required: true,
                attributes: [
                  {
                    name: 'name',
                    type: 'string',
                    description: 'Name of the parameter.',
                    required: true,
                  },
                  {
                    name: 'type',
                    type: 'string',
                    description: 'Type of the parameter.',
                    required: true,
                  },
                ],
              },
              {
                name: 'returnType',
                type: 'string',
                description: 'Return type of the method.',
                required: true,
              },
            ],
          },
        ],
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
        messageArgs={args}
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
      'Takes a screenshot of the current browser window, scales it down to a max of 1280x720 if larger, and appends it as an user message to the chat. Use this to explain UI parts outside the 3d landscape. When an error occurs when taking the screenshot, please explain the error message to the user.',
    parameters: [],
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      const url = await htmlToImage.toBlob(document.body).then((blob) => {
        return new Promise<string>((resolve, reject) => {
          if (!blob) {
            reject(new Error('Could not convert to blob'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const { width, height } = img;
              const scale = Math.min(
                1,
                SCREENSHOT_MAX_WIDTH / width,
                SCREENSHOT_MAX_HEIGHT / height
              );
              if (scale < 1) {
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject(new Error('Could not get canvas context'));
                  return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
              } else {
                resolve(img.src);
              }
            };
            img.onerror = () => reject(new Error('Could not load screenshot'));
            img.src = reader.result as string;
          };
          reader.onerror = () =>
            reject(new Error('Could not read screenshot data'));
          reader.readAsDataURL(blob);
        });
      });
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
