import { useFrontendTool } from '@copilotkit/react-core/v2';
import { ToolCallCard } from 'explorviz-frontend/src/components/chatbot/tool-call-card';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { setHighlightingByIds } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import {
  closeAllDistrictsInCity,
  closeDistrict,
  openAllDistrictsInCity,
  openDistrict,
} from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  isRangeSetting,
  isSelectSetting,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { requestFileDetailedData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/ping-animation';
import * as htmlToImage from 'html-to-image';
import { use } from 'react';
import { z } from 'zod';
import { EditingContext } from '../editing/editing-context-store';
import { BottomBarChartView, BottomBarContext } from '../visualization/page-setup/bottom-bar/bottom-bar-context';
import { SettingsSidebarTab } from '../visualization/page-setup/sidebar/customizationbar/settings-sidebar-context';
import { ToolbarTool } from '../visualization/page-setup/sidebar/toolbar/toolbar-context';
import { DEFAULT_MAX_COMMITS, DEFAULT_MAX_TIMESTAMPS, queryCommitChart, queryRuntimeChart } from './chart-query';
import {
  assertRequestedByUser,
  getCommitChart,
  getRuntimeChart,
  isComparingCommits,
  selectCommits,
  selectTimestamp,
} from './chart-selection';
import { CHATBOT_WIDGET_CLASS, ChatbotContext } from './chatbot-context-store';
import {
  copilotSettingComponentIds,
  copilotToolComponentIds,
  resolveCopilotSettingsTab,
  resolveCopilotToolbarTool,
} from './copilot-sidebar-map';
import { DEFAULT_MAX_ENTRIES, FILE_SECTIONS, MAX_FILES, queryFiles } from './file-query';
import {
  DEFAULT_MAX_BUILDINGS,
  DEFAULT_MAX_DISTRICTS,
  COMMIT_COMPARISONS,
  LANDSCAPE_DETAIL_LEVELS,
  queryLandscape,
  referenceEarlierResult,
} from './landscape-query';
import { getErrorMessage, reportErrors } from './tool-errors';

const SCREENSHOT_MAX_WIDTH = 1280;
const SCREENSHOT_MAX_HEIGHT = 720;

/**
 * Renders the page (including the WebGL canvas) to a JPEG data URL that is at
 * most 1280x720. JPEG keeps the image small enough to be resent with every
 * later request of the conversation.
 */
async function takeScreenshot() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dataUrl = await htmlToImage.toJpeg(document.body, {
    width,
    height,
    pixelRatio: Math.min(1, SCREENSHOT_MAX_WIDTH / width, SCREENSHOT_MAX_HEIGHT / height),
    quality: 0.85,
    // JPEG has no transparency; without this, unpainted areas turn black
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    // The chat window would cover the UI the model is asked about
    filter: (node) => !(node instanceof Element && node.classList.contains(CHATBOT_WIDGET_CLASS)),
  });
  return dataUrl;
}

/**
 * One line per setting: id, default, value range or options, and what it does.
 * This is static, so the chatbot needs no separate list of default values.
 */
function buildSettingsPromptDescription() {
  return Object.entries(defaultVizSettings)
    .map(([id, setting]) => {
      const { displayName, description, value } = setting as {
        displayName?: string;
        description?: string;
        value: unknown;
      };
      const constraints = [`default ${JSON.stringify(value)}`];
      if (isRangeSetting(setting)) {
        constraints.push(`${setting.range.min} to ${setting.range.max}`);
      } else if (isSelectSetting(setting)) {
        constraints.push(`one of ${JSON.stringify(setting.options)}`);
      }
      // A description that only repeats the name tells the chatbot nothing new.
      const explanation = [displayName, description]
        .map((text) => text?.trim())
        .filter((text, index, texts) => text && text !== id && texts.indexOf(text) === index)
        .join(' - ');
      return `${id} (${constraints.join(', ')})${explanation ? `: ${explanation}` : ''}`;
    })
    .join('\n');
}

/** The value of every setting as JSON, for telling which ones a change affected. */
function settingValues(settings: VisualizationSettings) {
  return Object.fromEntries(
    Object.entries(settings).map(([id, setting]) => [id, JSON.stringify((setting as { value: unknown }).value)])
  );
}

/** Longest pause the chatbot may take with one call of the wait tool. */
const MAX_WAIT_IN_SECONDS = 60;

/** The ids that are neither a city, a district, nor a building of the landscape. */
function findUnknownEntityIds(ids: string[]) {
  const { getCity, getDistrict, getBuilding } = useModelStore.getState();
  return ids.filter((id) => !getCity(id) && !getDistrict(id) && !getBuilding(id));
}

/**
 * Tells the chatbot about ids it made up or that are outdated. Without this it
 * would report success for an action that did nothing.
 */
function assertKnownEntityIds(ids: string[]) {
  const unknownIds = findUnknownEntityIds(ids);
  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown entity ids: ${unknownIds.join(', ')}. Look up the ids with query-landscape-data and try again.`
    );
  }
}

/** A tool whose outcome reaches the chatbot, see reportErrors. */
const useChatbotTool: typeof useFrontendTool = (tool, deps) =>
  useFrontendTool({ ...tool, handler: tool.handler && reportErrors(tool.handler) }, deps);

const ONLY_ON_REQUEST =
  'Changes what the user sees: call this only if the latest user message explicitly asks to select, show, switch to, compare in the visualization, or unselect this. Never call it to answer a question, to look something up, or on your own initiative.';

const userRequestParameter = z
  .string()
  .describe('The words of the latest user message that ask for this selection, quoted verbatim.');

const settingsPromptDescription = buildSettingsPromptDescription();

export function CopilotTools() {
  const { lookAtEntity, resetCamera } = useCameraControlsStore();
  const { addApplication, addClasses, removeComponent, goBack, goForward, canGoBack, canGoForward } =
    use(EditingContext);

  const {
    pingScreenAtPoint,
    showToolsSidebar,
    setShowToolsSidebar,
    showSettingsSidebar,
    setShowSettingsSidebar,
    selectedToolbarTool,
    setSelectedToolbarTool,
    selectedSettingsSidebarTab,
    setSelectedSettingsSidebarTab,
    entityFilteringControllerRef,
    entitySearchControllerRef,
  } = use(ChatbotContext);

  const { setIsExpanded, setSelectedChart } = use(BottomBarContext);

  const showChart = (chart: BottomBarChartView) => {
    setSelectedChart(chart);
    setIsExpanded(true);
  };

  useChatbotTool({
    name: 'query-landscape-data',
    description:
      'Looks up cities, districts, and buildings of the landscape. All name filters are case-insensitive substring matches on the name or fully qualified name. Lists are limited; "omitted" states how many matches were cut off. Each entry has "fqn" (or "name" if there is none) and "parentId" (the id of its parent district; absent directly below a city). If the answer is {"unchanged": true}, the data is identical to an earlier result in this conversation: use that result. Request only what you need and do not repeat a query whose result you already have. While two commits are compared, entries have "commitComparison" unless UNCHANGED, and cities count their buildings by it; buildings hidden by the comparison filter of the commit chart are missing.',
    parameters: z.object({
      ids: z
        .array(z.string())
        .optional()
        .describe(
          'Look up exactly these entity ids (e.g. to get the names of highlighted entities). Ignores all filters.'
        ),
      cityIds: z.array(z.string()).optional().describe('Restrict to these cities.'),
      cityName: z.string().optional(),
      districtName: z
        .string()
        .optional()
        .describe('Also restricts buildings to those directly inside a matching district.'),
      buildingName: z.string().optional(),
      detailLevel: z
        .enum(LANDSCAPE_DETAIL_LEVELS)
        .optional()
        .describe(
          'summary: only counts per city. structure (default): ids, names, and parents. full: additionally metrics, language, type, origin, and editing state. Use full only when you need those.'
        ),
      sortByMetric: z
        .string()
        .optional()
        .describe(
          'Sort buildings by this metric, largest first, and return buildings only, e.g. lineCount, sloc, cloc, size, functionCount. Combine with maxBuildings for "top N" questions.'
        ),
      commitComparison: z
        .array(z.enum(COMMIT_COMPARISONS))
        .optional()
        .describe(
          'Only while two commits are compared: return only buildings that were changed like this from the older to the newer commit. Combine with detailLevel full to get metrics as current (newer) and previous (older) value.'
        ),
      maxDistricts: z.number().optional().describe(`Default ${DEFAULT_MAX_DISTRICTS}.`),
      maxBuildings: z.number().optional().describe(`Default ${DEFAULT_MAX_BUILDINGS}.`),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async (query, { agent, toolCall }) => {
      const result = JSON.stringify(queryLandscape(query, useModelStore.getState(), isComparingCommits()));
      return referenceEarlierResult(result, agent?.messages ?? [], toolCall.id);
    },
    render: ({ status, args }) => {
      const labelParts: string[] = [];
      if (args.detailLevel) {
        labelParts.push(args.detailLevel);
      }
      if (args.cityName) {
        labelParts.push(`city~${args.cityName}`);
      } else if (args.districtName) {
        labelParts.push(`district~${args.districtName}`);
      } else if (args.buildingName) {
        labelParts.push(`building~${args.buildingName}`);
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

  useChatbotTool({
    name: 'query-file-data',
    description: `Inspects files (buildings from static analysis): their imports, functions, and data structures (classes, interfaces, enums, etc.) with superclasses, fields, and functions. Only reads, opens nothing. Functions are given as "name: return type", fields as "name: type". Data structures inside others are named "Outer.Inner". "counts" are the totals of the file, "omitted" states how many matches were cut off. Not available: source code, function parameters, enum values, and other versions of a file than the one in the landscape (while two commits are compared, the newer one; for removed files the older one). Inspect only files that the question is about, do not scan the landscape file by file.`,
    parameters: z.object({
      ids: z.array(z.string()).describe(`Building ids from query-landscape-data, at most ${MAX_FILES}.`),
      sections: z
        .array(z.enum(FILE_SECTIONS))
        .optional()
        .describe(
          'Default: all. functions: top-level functions and functions of data structures. dataStructures: their type, superclasses, and fields.'
        ),
      search: z
        .string()
        .optional()
        .describe(
          'Only imports, functions, fields, and data structures whose name or type contains this. A data structure whose name contains it is returned completely.'
        ),
      includeMetrics: z
        .boolean()
        .optional()
        .describe('Also metrics of the file, its functions, and its data structures. Default false.'),
      maxEntries: z.number().optional().describe(`Per file. Default ${DEFAULT_MAX_ENTRIES}.`),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async (query, { agent, toolCall }) => {
      const { getBuilding } = useModelStore.getState();
      const result = JSON.stringify(await queryFiles(query, getBuilding, (id) => requestFileDetailedData(id)));
      return referenceEarlierResult(result, agent?.messages ?? [], toolCall.id);
    },
    render: ({ status, args, result }) => {
      const ids = args.ids ?? [];
      const building = ids.length === 1 && ids[0] ? useModelStore.getState().getBuilding(ids[0]) : undefined;
      return (
        <ToolCallCard
          status={status}
          action="queryFileData"
          errorMessage={getErrorMessage(result)}
          component={
            building
              ? { id: building.id, name: building.name }
              : { name: ids.length > 0 ? `${ids.length} ${ids.length === 1 ? 'file' : 'files'}` : undefined }
          }
        />
      );
    },
  });

  useChatbotTool({
    name: 'query-commit-chart',
    description:
      'Reads the data of the commit chart: the analyzed commits per repository and branch with their date, tags, and metrics. Only reads, never selects. Respects the filters set in the chart, which are stated as "activeChartFilters". Commits are listed newest first; "omitted" states how many were cut off. Hashes are shortened unless looked up with the hashes parameter. Metrics are totals of the commit: for what differs between two selected commits inside the code, also use query-landscape-data with commitComparison.',
    parameters: z.object({
      detailLevel: z
        .enum(['summary', 'commits'])
        .optional()
        .describe(
          'summary: only repositories and branches with commit counts, date ranges, and names of available metrics. commits (default): the commits.'
        ),
      repository: z.string().optional().describe('Default: all.'),
      branch: z.string().optional().describe('Default: all.'),
      search: z.string().optional().describe('Start of a commit hash or part of a tag.'),
      hashes: z
        .array(z.string())
        .optional()
        .describe(
          'Only these commits, shortened hashes are allowed. For two commits, the differences of their metrics are returned as well.'
        ),
      from: z.string().optional().describe('ISO 8601, UTC if without offset, inclusive.'),
      to: z.string().optional().describe('ISO 8601, UTC if without offset, exclusive.'),
      metrics: z
        .array(z.string())
        .optional()
        .describe(
          'Metrics to return per commit, e.g. lineCount, sloc, cloc, classCount, functionCount. Default: all if hashes are given, otherwise none.'
        ),
      sortByMetric: z.string().optional().describe('Largest value of this metric first.'),
      sortByMetricChange: z
        .string()
        .optional()
        .describe(
          'Largest increase or decrease of this metric compared to the previous analyzed commit of the branch first, returned as "change".'
        ),
      author: z.string().optional().describe('Only commits whose author name contains this.'),
      includeAuthors: z.boolean().optional().describe('Personal data: set only if the user asks about authors.'),
      maxCommits: z.number().optional().describe(`Default ${DEFAULT_MAX_COMMITS}.`),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async (query, { agent, toolCall }) => {
      const result = JSON.stringify(queryCommitChart(query, getCommitChart()));
      return referenceEarlierResult(result, agent?.messages ?? [], toolCall.id);
    },
    render: ({ status, result }) => (
      <ToolCallCard status={status} action="queryCommitChart" errorMessage={getErrorMessage(result)} />
    ),
  });

  useChatbotTool({
    name: 'query-runtime-chart',
    description:
      'Reads the data of the runtime chart: the Timestamps with the number of spans (labeled "Requests" in the chart) and traces that start in the Time Window until the next one. Only reads, never selects. There is one timeline for all runtime data ("cross-commit") or, while commits are selected, one per selected commit. Timestamps are listed newest first; "omitted" states how many were cut off, "matching..." are the totals including those.',
    parameters: z.object({
      detailLevel: z
        .enum(['summary', 'timestamps'])
        .optional()
        .describe(
          'summary: only totals, range, and selection per timeline. timestamps (default): also the Timestamps.'
        ),
      commit: z.string().optional().describe('Only the timeline of this commit. Default: all.'),
      from: z.string().optional().describe('ISO 8601, UTC if without offset, inclusive.'),
      to: z.string().optional().describe('ISO 8601, UTC if without offset, exclusive.'),
      minSpanCount: z.number().optional(),
      sortBySpanCount: z.boolean().optional().describe('Largest number of spans first, e.g. to find peaks.'),
      maxTimestamps: z.number().optional().describe(`Default ${DEFAULT_MAX_TIMESTAMPS}.`),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async (query, { agent, toolCall }) => {
      const result = JSON.stringify(queryRuntimeChart(query, getRuntimeChart()));
      return referenceEarlierResult(result, agent?.messages ?? [], toolCall.id);
    },
    render: ({ status, result }) => (
      <ToolCallCard status={status} action="queryRuntimeChart" errorMessage={getErrorMessage(result)} />
    ),
  });

  useChatbotTool({
    name: 'select-commits',
    description: `Selects commits in the commit chart and renders them: one commit of a repository shows its code, two compare them. Replaces the selection of the repositories the commits belong to. ${ONLY_ON_REQUEST}`,
    parameters: z.object({
      userRequest: userRequestParameter,
      commits: z
        .array(z.string())
        .describe('Commit hashes from query-commit-chart, at most two per repository. Empty: unselect all commits.'),
      repository: z
        .string()
        .optional()
        .describe('The repository of the commits, or the only one to unselect the commits of.'),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ userRequest, commits, repository }, { agent }) => {
      assertRequestedByUser(userRequest, agent?.messages ?? []);
      return JSON.stringify(await selectCommits(commits, repository));
    },
    render: ({ status, args, result }) => (
      <ToolCallCard
        status={status}
        action="selectCommits"
        messageArgs={args}
        errorMessage={getErrorMessage(result)}
        component={
          getErrorMessage(result) ? undefined : { name: args.commits?.map((hash) => hash?.slice(0, 10)).join(', ') }
        }
        onClick={() => showChart('commit-chart')}
      />
    ),
  });

  useChatbotTool({
    name: 'select-timestamp',
    description: `Selects a Timestamp in the runtime chart and renders its runtime data. The visualization then no longer follows the newest Timestamp. Replaces the Timestamp selected before in the same timeline. ${ONLY_ON_REQUEST}`,
    parameters: z.object({
      userRequest: userRequestParameter,
      time: z
        .string()
        .optional()
        .describe(
          'Time of the Timestamp, as returned by query-runtime-chart, or any time in its Time Window. ISO 8601, UTC if without offset (the chart shows UTC). Required unless clear is set.'
        ),
      clear: z.boolean().optional().describe('Unselect the Timestamp instead.'),
      commit: z.string().optional().describe('The commit of the timeline. Required if there are several timelines.'),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ userRequest, time, clear, commit }, { agent }) => {
      assertRequestedByUser(userRequest, agent?.messages ?? []);
      if (Boolean(time) === Boolean(clear)) {
        throw new Error('Pass either time or clear.');
      }
      return JSON.stringify(await selectTimestamp(clear ? undefined : time, commit));
    },
    render: ({ status, args, result }) => (
      <ToolCallCard
        status={status}
        action="selectTimestamp"
        messageArgs={args}
        errorMessage={getErrorMessage(result)}
        component={getErrorMessage(result) ? undefined : { name: args.time }}
        onClick={() => showChart('runtime-chart')}
      />
    ),
  });

  useChatbotTool({
    name: 'highlight-entities',
    description: 'Highlights cities, districts, or buildings, or removes their highlight.',
    parameters: z.object({
      ids: z.array(z.string()),
      areHighlighted: z.boolean().optional().describe('Default true. false removes the highlight.'),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    // The arguments arrive as the chatbot sent them, without defaults of the
    // schema: a left out areHighlighted is undefined and means "highlight".
    handler: async ({ ids, areHighlighted }) => {
      assertKnownEntityIds(ids);
      setHighlightingByIds(ids, areHighlighted !== false);
    },
    render: ({ args, status }) => {
      // While the arguments are still streaming, it is not yet known whether areHighlighted was left out.
      const action =
        args.areHighlighted === false
          ? 'removeHighlight'
          : status === 'inProgress' && args.areHighlighted === undefined
            ? undefined
            : 'highlight';

      return <ToolCallCard component={{ name: args.ids?.toString() }} status={status} action={action} />;
    },
  });

  useChatbotTool({
    name: 'open-close-tools-sidebar',
    description: 'Opens or closes the tools sidebar (top left of the screen).',
    parameters: z.object({
      open: z.boolean(),
    }),
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

  useChatbotTool({
    name: 'open-close-settings-sidebar',
    description: 'Opens or closes the settings sidebar (top right of the screen).',
    parameters: z.object({
      open: z.boolean(),
    }),
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

  useChatbotTool({
    name: 'open-close-tools-component',
    description: `Opens or closes a component inside the tools sidebar. Opening a component also opens the sidebar. Component ids: ${copilotToolComponentIds.join(', ')}.`,
    parameters: z.object({
      id: z.string(),
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      const tool = resolveCopilotToolbarTool(id);
      if (!tool) {
        throw new Error(`Unknown component id "${id}". Allowed ids: ${copilotToolComponentIds.join(', ')}.`);
      }
      if (open) {
        setSelectedToolbarTool(tool, { showSidebar: true });
      } else if (selectedToolbarTool === tool) {
        setSelectedToolbarTool(null);
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

  useChatbotTool({
    name: 'open-close-settings-component',
    description: `Opens or closes a component inside the settings sidebar. Opening a component also opens the sidebar. Component ids: ${copilotSettingComponentIds.join(', ')}.`,
    parameters: z.object({
      id: z.string(),
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      const tab = resolveCopilotSettingsTab(id);
      if (!tab) {
        throw new Error(`Unknown component id "${id}". Allowed ids: ${copilotSettingComponentIds.join(', ')}.`);
      }
      if (open) {
        setSelectedSettingsSidebarTab(tab, { showSidebar: true });
      } else if (selectedSettingsSidebarTab === tab) {
        setSelectedSettingsSidebarTab(null);
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

  useChatbotTool({
    name: 'filter-entities',
    description:
      'Hides buildings below the given thresholds using the Entity Filtering panel, which is opened for the user.',
    parameters: z.object({
      minClassMethodCount: z.number().optional().describe('Hide classes with fewer methods than this.'),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ minClassMethodCount }) => {
      setSelectedToolbarTool(ToolbarTool.Filter, { showSidebar: true });
      setTimeout(() => {
        entityFilteringControllerRef?.current?.applyFilters({
          minClassMethodCount,
        });
      }, 200);
    },
    render: ({ status }) => (
      <ToolCallCard component={{ id: 'entity-filtering', name: 'Filter' }} status={status} action={'filterEntities'} />
    ),
  });

  useChatbotTool({
    name: 'update-visualization-settings',
    description: `Sets visualization settings to new values and/or resets them to their defaults. Settings, one per line as "id (default, allowed values): meaning":\n${settingsPromptDescription}`,
    parameters: z.object({
      settings: z.record(z.string(), z.unknown()).optional().describe('Setting id -> new value.'),
      resetIds: z.array(z.string()).optional().describe('Setting ids to reset to their defaults.'),
      resetAll: z.boolean().optional().describe('Reset every setting to its default.'),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ settings, resetIds, resetAll }) => {
      const { visualizationSettings, updateSetting, applyDefaultSettings } = useUserSettingsStore.getState();
      const unknownIds: string[] = [];
      const valuesBefore = settingValues(visualizationSettings);
      if (resetAll) {
        applyDefaultSettings();
      } else if (Array.isArray(resetIds) && resetIds.length > 0) {
        resetIds.forEach((id) => {
          const defaultSetting = (defaultVizSettings as any)[id];
          if (defaultSetting) {
            updateSetting(id as keyof VisualizationSettings, defaultSetting.value);
          } else {
            unknownIds.push(id);
          }
        });
      }

      if (settings && typeof settings === 'object') {
        Object.entries(settings as Record<string, unknown>).forEach(([id, value]) => {
          if (Object.prototype.hasOwnProperty.call(visualizationSettings, id)) {
            updateSetting(id as keyof VisualizationSettings, value);
          } else {
            unknownIds.push(id);
          }
        });
      }

      // The chatbot must learn that its call took effect: the context it gets
      // next already holds the new values, which looks as if nothing changed.
      const valuesAfter = settingValues(useUserSettingsStore.getState().visualizationSettings);
      const changedIds = Object.keys(valuesAfter).filter((id) => valuesAfter[id] !== valuesBefore[id]);
      const outcome =
        changedIds.length > 0
          ? `Applied. Settings that changed: ${changedIds.join(', ')}. Do not call this tool again for this request.`
          : 'Nothing changed: all of these settings already had the requested values.';
      // The known settings are applied; the chatbot must still learn which ones were not.
      return unknownIds.length > 0 ? `${outcome} Unknown setting ids were ignored: ${unknownIds.join(', ')}.` : outcome;
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
          setSelectedSettingsSidebarTab(SettingsSidebarTab.Settings, {
            showSidebar: true,
          });
        }}
      />
    ),
  });

  useChatbotTool({
    name: 'entity-search',
    description:
      'Shows the user the cities, districts, and buildings whose fully qualified name matches the query in the search panel, optionally selecting all results. Returns no data: to look something up yourself, use query-landscape-data.',
    parameters: z.object({
      query: z.string(),
      selectAll: z.boolean().optional(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ query, selectAll }) => {
      setSelectedToolbarTool(ToolbarTool.EntitySearch, { showSidebar: true });
      setTimeout(() => {
        entitySearchControllerRef?.current?.search({
          query,
          selectAll,
        });
      }, 200);
    },
    render: ({ status, args }) => (
      <ToolCallCard component={{ name: args.query }} status={status} action={'searchComponents'} />
    ),
  });

  useChatbotTool({
    name: 'open-close-district',
    description:
      'Opens or closes a district: its children are shown (open) or hidden (closed). Closing a district also closes its nested districts. Pass a city id to open or close all districts of that city.',
    parameters: z.object({
      id: z.string(),
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      const district = useModelStore.getState().getDistrict(id);
      if (!district && !useModelStore.getState().getCity(id)) {
        throw new Error(`"${id}" is neither a district id nor a city id. Look up the id with query-landscape-data.`);
      }
      if (district) {
        if (open) {
          openDistrict(id);
        } else {
          closeDistrict(id);
        }
      } else {
        const city = useModelStore.getState().getCity(id);
        if (city) {
          if (open) {
            openAllDistrictsInCity(city);
          } else {
            closeAllDistrictsInCity(city);
          }
        }
      }
    },
    render: ({ args, status }) => {
      const action = args.open === undefined ? undefined : args.open ? 'open' : 'close';

      return <ToolCallCard component={{ id: args.id }} status={status} action={action} />;
    },
  });

  useChatbotTool({
    name: 'ping-entities',
    description:
      "Plays a temporary ping animation on cities, districts, or buildings to draw the user's attention to them. Changes no state.",
    parameters: z.object({
      ids: z.array(z.string()),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ ids }) => {
      assertKnownEntityIds(ids);
      ids.forEach((id) => {
        pingByModelId(id);
      });
    },
    render: ({ args, status }) => (
      <ToolCallCard component={{ name: args.ids?.toString() }} status={status} action={'ping'} />
    ),
  });

  useChatbotTool({
    name: 'move-camera-to-entity',
    description: 'Moves the camera to focus on a city, district, or building.',
    parameters: z.object({
      id: z.string(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id }) => {
      assertKnownEntityIds([id]);
      lookAtEntity(id);
    },
    render: ({ args, status }) => <ToolCallCard component={{ id: args.id }} status={status} action="moveCamera" />,
  });

  useChatbotTool({
    name: 'reset-camera',
    description: 'Resets the camera to its default position and orientation.',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      resetCamera();
    },
    render: ({ status }) => <ToolCallCard status={status} action="resetCamera" />,
  });

  useChatbotTool({
    name: 'wait',
    description:
      'Pauses before your next step, e.g. to give the user time to look at a stop of a tour. Use only if the user asks for a pause.',
    parameters: z.object({
      seconds: z.number().positive().max(MAX_WAIT_IN_SECONDS),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ seconds }) => {
      // The arguments are not validated against the schema before they arrive here.
      const waitInSeconds = Math.min(Math.max(Number(seconds) || 0, 0), MAX_WAIT_IN_SECONDS);
      await new Promise((resolve) => setTimeout(resolve, waitInSeconds * 1000));
      return `Waited ${waitInSeconds} seconds.`;
    },
    render: ({ args, status }) => (
      <ToolCallCard status={status} action="wait" messageArgs={{ seconds: args.seconds }} />
    ),
  });

  useChatbotTool({
    name: 'add-application',
    description:
      'Adds a new city (application) with the given classes to the landscape and returns its id. Each class needs its fully qualified name; methods are optional.',
    parameters: z.object({
      name: z.string(),
      classes: z.array(
        z.object({
          fqn: z.string(),
          methods: z
            .array(
              z.object({
                name: z.string(),
                private: z.boolean(),
                parameters: z.array(
                  z.object({
                    name: z.string(),
                    type: z.string(),
                  })
                ),
                returnType: z.string(),
              })
            )
            .optional(),
        })
      ),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ name, classes }) => {
      return addApplication(name, classes);
    },
    render: ({ status, args, result }) => (
      <ToolCallCard status={status} action="addApplication" component={{ id: result, name: args.name }} />
    ),
  });

  useChatbotTool({
    name: 'add-classes-to-application',
    description:
      'Adds classes to an existing city (application). Each class needs its fully qualified name; methods are optional.',
    parameters: z.object({
      applicationId: z.string(),
      classes: z.array(
        z.object({
          fqn: z.string(),
          methods: z
            .array(
              z.object({
                name: z.string(),
                private: z.boolean(),
                parameters: z.array(
                  z.object({
                    name: z.string(),
                    type: z.string(),
                  })
                ),
                returnType: z.string(),
              })
            )
            .optional(),
        })
      ),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ applicationId, classes }) => {
      if (!useModelStore.getState().getCity(applicationId)) {
        throw new Error(`"${applicationId}" is not a city id. Look up the id with query-landscape-data.`);
      }
      addClasses(applicationId, classes);
    },
    render: ({ status, args }) => (
      <ToolCallCard status={status} action="addClasses" messageArgs={args} component={{ id: args.applicationId }} />
    ),
  });

  useChatbotTool({
    name: 'remove-component-from-landscape',
    description: 'Removes a city, district, or building from the landscape. This can be undone with undo-edit.',
    parameters: z.object({
      id: z.string(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id }) => {
      assertKnownEntityIds([id]);
      removeComponent(id);
    },
    render: ({ status, args }) => (
      <ToolCallCard status={status} action="removeComponent" component={{ id: args.id }} showPopup />
    ),
  });

  useChatbotTool({
    name: 'undo-edit',
    description: 'Undoes the last edit of the landscape (added or removed entities).',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      if (!canGoBack) {
        throw new Error('There is no edit to undo.');
      }
      goBack();
    },
    render: ({ status }) => <ToolCallCard status={status} action="undoEdit" />,
  });

  useChatbotTool({
    name: 'redo-edit',
    description: 'Redoes the edit of the landscape that was undone last.',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      if (!canGoForward) {
        throw new Error('There is no undone edit to redo.');
      }
      goForward();
    },
    render: ({ status }) => <ToolCallCard status={status} action="redoEdit" />,
  });

  useChatbotTool({
    name: 'take-screenshot',
    description:
      'Returns a screenshot of the browser window (at most 1280x720) without the chat window. Images are expensive: take one only to see what the context and query-landscape-data cannot tell you, such as UI outside the 3D landscape, and reuse a screenshot that still shows the current state. If it fails, tell the user why.',
    parameters: z.object({}),
    handler: async () => {
      const dataUrl = await takeScreenshot();
      const [, mimeType, bytes] = dataUrl.match(/^data:([^;,]+);base64,(.+)$/) ?? [];
      if (!mimeType || !bytes) {
        throw new Error('The browser returned an empty screenshot');
      }
      // An array of AG-UI content parts reaches the model as an image; any
      // other return value would be sent as JSON text.
      return [
        { type: 'text', text: `Screenshot of the browser window (${window.innerWidth}x${window.innerHeight} CSS px).` },
        { type: 'image', source: { type: 'data', value: bytes, mimeType } },
      ];
    },
    render: ({ status, result }) => (
      <ToolCallCard status={status} action="screenshot" errorMessage={getErrorMessage(result)} />
    ),
  });

  useChatbotTool({
    name: 'click-on-screen',
    description:
      'Clicks a position of the browser window, for UI that no other tool can operate (prefer the other tools). Never use it to select data points of the charts. Steps: 1. Use a screenshot of the current state (take-screenshot). 2. Locate the center of the target element in the image in pixels (x_px, y_px). 3. Pass x = x_px / image width and y = y_px / image height, each between 0 and 1 with 5 decimals. If the target is ambiguous or hidden, ask the user instead of clicking. Afterwards verify the effect; if nothing changed, retry once with a 3 to 5 px offset.',
    parameters: z.object({
      x: z.number().min(0).max(1).describe('Horizontal position, 0 = left edge, 1 = right edge.'),
      y: z.number().min(0).max(1).describe('Vertical position, 0 = top edge, 1 = bottom edge.'),
    }),
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
      // Screenshots leave the chat window out, so click what lies behind it.
      const target = document
        .elementsFromPoint(clientX, clientY)
        .find((element) => !element.closest(`.${CHATBOT_WIDGET_CLASS}`));
      if (!target) {
        throw new Error(`There is no element at (${clientX}, ${clientY})`);
      }
      target.dispatchEvent(clickEvent);
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
