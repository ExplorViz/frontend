import { useAgentContext } from '@copilotkit/react-core/v2';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { EditingContext } from 'explorviz-frontend/src/components/editing/editing-context-store';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useDistricts } from 'explorviz-frontend/src/utils/collaboration/districts';
import { useHighlights } from 'explorviz-frontend/src/utils/collaboration/highlights';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { use } from 'react';
import { toIsoTime } from './chart-query';
import { summarizeCities } from './landscape-query';

const ASSISTANT_INSTRUCTIONS = `You are the assistant embedded in ExplorViz, a tool that visualizes software systems from static and dynamic program analysis as a 3D landscape using the city metaphor.

Model:
- City: the top-level unit, e.g. an application, service, or repository.
- District: a grouping inside a city, e.g. a package or directory. Districts can be nested. A closed district hides its content.
- Building: a leaf, e.g. a source file or class, with metrics such as lines of code. What is inside a file (imports, functions, data structures) is available from query-file-data.
- Commit chart: the analyzed commits of the repositories. Selected commits determine which code is visualized; two of a repository are compared, the older one with the newer one.
- Runtime chart: Timestamps with the number of spans that start until the next one. The selected Timestamp determines which runtime data is visualized.
By default all districts are open and nothing is highlighted.

Answering:
- Be brief. Answer in a few sentences or a short list and lead with the answer. Give more detail only when the user asks for it or the question cannot be answered correctly without it.
- Answer in the language of the user.
- Do not announce, narrate, or summarize tool calls: the user sees every tool call in the chat. After an action, confirm it in one short sentence at most.
- Refer to entities by name, not by id, unless the user asks for ids.
- Do not repeat data the user did not ask for, and do not end with offers for further help.

Working:
- The context below reflects the current state. Check it before calling a tool, and do not query what it or the conversation already tells you.
- Look up ids with query-landscape-data before using them in another tool; never guess ids.
- Request the least data that answers the question (filters, limits, lowest sufficient detail level).
- Answer questions about commits and runtime data by reading the charts (query-commit-chart, query-runtime-chart). This never requires a selection.
- Select or unselect commits or Timestamps (select-commits, select-timestamp, or by clicking) only if the user explicitly asks for it in their latest message: it replaces what they are looking at. If a question can only be answered with another selection, say so and let the user decide.
- State facts about the landscape only if they come from the context or a tool result. If the data does not contain the answer, say so.`;

interface CopilotResourcesProps {
  cities?: City[];
}

export function CopilotResources({ cities }: CopilotResourcesProps) {
  const { hoveredEntityId, removedDistrictIds } = useVisualizationStore();
  const highlightedEntityIds = useHighlights((ids) => ids);
  const closedDistrictIds = useDistricts((districts) => districts.closedDistrictIds);

  const analysisMode = useRenderingServiceStore((state) => state._analysisMode);
  const visualizationPaused = useRenderingServiceStore((state) => state._visualizationPaused);
  const selectedCommits = useCommitTreeStateStore((state) => state._selectedCommits);
  const renderedTimestamps = useTimestampStore((state) => state.timestamp);
  // While commits are selected, the runtime chart has no timeline across commits, and vice versa.
  const selectedCommitIds = [...selectedCommits.values()].flat().map(({ commitId }) => commitId);
  const timelineIds = selectedCommitIds.length > 0 ? selectedCommitIds : [CROSS_COMMIT_IDENTIFIER];

  const { canGoBack, canGoForward } = use(EditingContext);
  const visualizationSettings = useUserSettingsStore((state) => state.visualizationSettings);

  /** Only what differs from the defaults: those are part of the settings tool description. */
  const changedSettings = (settings: VisualizationSettings) => {
    const result: Record<string, unknown> = {};
    Object.entries(settings).forEach(([id, setting]) => {
      const value = (setting as { value: unknown }).value;
      const defaultValue = (defaultVizSettings as Record<string, { value: unknown } | undefined>)[id]?.value;
      if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
        result[id] = value;
      }
    });
    return result;
  };

  const { showToolsSidebar, showSettingsSidebar, selectedToolbarTool, selectedSettingsSidebarTab } =
    use(ChatbotContext);

  const hoveredEntity = hoveredEntityId
    ? (useModelStore.getState().getBuilding(hoveredEntityId) ??
      useModelStore.getState().getDistrict(hoveredEntityId) ??
      useModelStore.getState().getCity(hoveredEntityId))
    : undefined;

  // Few entries with short descriptions: all of them are sent with every
  // request. The entries that rarely change come first.
  useAgentContext({
    description: 'Your instructions',
    value: ASSISTANT_INSTRUCTIONS,
  });

  useAgentContext({
    description: 'Cities of the landscape with their totals. For anything more detailed use query-landscape-data.',
    value: JSON.stringify(summarizeCities(cities ?? [], useModelStore.getState().getBuilding)),
  });

  useAgentContext({
    description:
      'Current state of the user interface: opened sidebars and their opened component (null if none), whether a landscape edit can be undone or redone, and the visualization settings that differ from their defaults (all others have their default).',
    value: JSON.stringify({
      toolsSidebar: { open: showToolsSidebar, component: selectedToolbarTool },
      settingsSidebar: { open: showSettingsSidebar, component: selectedSettingsSidebarTab },
      canUndoEdit: canGoBack,
      canRedoEdit: canGoForward,
      changedSettings: changedSettings(visualizationSettings),
    }),
  });

  useAgentContext({
    description:
      'Current state of the 3D visualization as entity ids: closed districts (content hidden), highlighted entities, removed entities (not visible), and the entity under the mouse pointer of the user (null if none). Resolve ids to names with the ids parameter of query-landscape-data.',
    value: JSON.stringify({
      closedDistrictIds: [...closedDistrictIds],
      highlightedEntityIds: [...highlightedEntityIds],
      removedEntityIds: [...removedDistrictIds],
      hoveredEntity: hoveredEntityId ? { id: hoveredEntityId, name: hoveredEntity?.fqn ?? hoveredEntity?.name } : null,
    }),
  });

  useAgentContext({
    description:
      'Current selection in the commit chart (commits by repository) and the runtime chart (times of Timestamps in UTC by commit; "cross-commit" for all runtime data). While the visualization follows the newest Timestamp, that one is selected automatically. For the data of the charts use query-commit-chart and query-runtime-chart.',
    value: JSON.stringify({
      analysisMode,
      selectedCommits: Object.fromEntries(
        [...selectedCommits].map(([repository, commits]) => [repository, commits.map(({ commitId }) => commitId)])
      ),
      selectedTimestamps: Object.fromEntries(
        [...renderedTimestamps]
          .filter(([commitId]) => timelineIds.includes(commitId))
          .map(([commitId, times]) => [commitId, times.map(toIsoTime)])
      ),
      followsNewestTimestamp: !visualizationPaused,
    }),
  });

  return null;
}
